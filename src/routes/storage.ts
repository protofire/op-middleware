import { promises } from 'fs'
import { Router, Request, Response, NextFunction } from 'express'
import { getLogger } from '../helpers/logger'
import { multerUpload, uploadField } from '../middlewares/multerUpload'
import { getClient, PowClient, archiveExistingFfs } from '../helpers/pow'
import { Upload } from '../models/upload'
import { ErrorStatus } from '../helpers/errorStatus'
import { jobWatchTimeout, dealMinDuration, maxPrice } from '../config'

export async function addFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:storage/addFile')
  try {
    const { file } = req
    logger({ file })
    const { path, destination, originalname, size } = file

    // Get cid and rename file in disk accordingly
    const { cid, cidFilePath } = await addToHot(path, destination)
    // Queue job to store file in Filecoin/cold storage
    const jobId = await pushCidConfig(cid)
    logger({ cid, jobId })

    // Save upload info in DB
    logger(`Saving upload to DB:`)
    const upload = new Upload({ cid, jobId, originalName: originalname, size })
    await upload.save()
    logger(`Saved upload with cid ${cid}`)

    // Whatch cold storage job and queue file removal from disk
    watchJob(jobId, upload, cidFilePath)

    res.send({ jobId, cid, originalName: originalname, size })
  } catch (err) {
    logger(err)
    next(err)
  }
}

export async function getFileStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:storage/getFileStatus')
  try {
    const { cid } = req.params
    logger(`Retrieving upload with cid: ${cid}`)
    const u = await Upload.getByCid(cid)
    if (u !== null) {
      logger(`Upload found:`)
      logger(u)
      res.send({ status: u.jobStatus })
    } else {
      throw new ErrorStatus('Upload not found', 404)
    }
  } catch (err) {
    logger(err)
    next(err)
  }
}

export const storageRouter = Router()
storageRouter.post('/', multerUpload.single(uploadField), addFile)
storageRouter.get('/:cid', getFileStatus)

async function addToHot(
  path: string,
  uploadDestination: string,
): Promise<{ cid: string; cidFilePath: string } | never> {
  const logger = getLogger('router:storage/addToHot')
  try {
    const pow = (await getClient()) as PowClient
    const data = await promises.readFile(path)
    const { cid } = await pow.ffs.addToHot(data)
    logger(`cid: ${cid}`)
    // If cid already exists + SUCCESS state in DB don't do anything
    const u = await Upload.getByCid(cid)
    if (u !== null && u.jobStatus === 'SUCCESS') {
      // Clean temporal file created by multer
      await promises.unlink(`${path}`)
      throw new ErrorStatus(`File already processed with cid: ${cid}`, 409)
    }
    // Rename file so its name matches the cid
    const cidFilePath = `${uploadDestination}${cid}`
    await promises.rename(path, cidFilePath)
    return { cid, cidFilePath }
  } catch (err) {
    // FFS instances is no longer valid, re-create a new one
    if (err.message.indexOf('error code 2') > -1) {
      logger('Ffs instance invalid archiving ffs info in DB and retrying')
      await archiveExistingFfs()
      return addToHot(path, uploadDestination)
    }
    throw err
  }
}

async function pushCidConfig(cid: string): Promise<string> {
  const logger = getLogger('router:storage/pushCidConfig')
  const pow = (await getClient()) as PowClient
  // Set custom dealMinDuration and maxPrice
  const { defaultConfig } = await pow.ffs.defaultConfig()
  if (defaultConfig && defaultConfig.cold && defaultConfig.cold.filecoin) {
    const { filecoin } = defaultConfig.cold
    filecoin.dealMinDuration = dealMinDuration || filecoin.dealMinDuration
    filecoin.maxPrice = maxPrice || filecoin.maxPrice
    await pow.ffs.setDefaultConfig(defaultConfig as any)
  }
  logger(`Pushing ${cid} Powergate config:`)
  logger(JSON.stringify(defaultConfig, undefined, 2))
  const { jobId } = await pow.ffs.pushConfig(cid)
  return jobId
}

async function watchJob(jobId: string, upload: Upload, cidFilePath: string) {
  const logger = getLogger('router:storage/watchJob')
  const pow = (await getClient()) as PowClient
  let isWatchActive = true
  let cancelWatchTimeout: NodeJS.Timeout
  const cancelWatch = pow.ffs.watchJobs(async (job) => {
    const { status } = job
    logger(
      `Updating job ${jobId} status ${upload.jobStatus} > ${Upload.getJobStatus(
        status,
      )}`,
    )
    upload.setJobStatusByNumber(status)
    await upload.save()
    logger(`Updated job ${jobId}`)
    switch (upload.jobStatus) {
      case 'FAILED':
      case 'CANCELLED':
      case 'SUCCESS':
        logger(`Job ${jobId} finished, cancellig watch`)
        cancelWatch()
        isWatchActive = false
        await promises.unlink(cidFilePath)
        clearTimeout(cancelWatchTimeout)
    }
  }, jobId)
  // The jobStatus should change to failed/cancelled/success before
  // jobWatchTimeout, if not, we force the cancel of the watch assuming
  // something unexpected happened
  cancelWatchTimeout = setTimeout(async () => {
    if (isWatchActive) {
      logger(`Cancelling job ${jobId} watch due to inactivity`)
      cancelWatch()
      logger(`Updating job ${jobId} status ${upload.jobStatus} > UNSPECIFIED`)
      upload.jobStatus = 'UNSPECIFIED'
      await upload.save()
      logger(`Updated job ${jobId}`)
      await promises.unlink(cidFilePath)
    }
  }, jobWatchTimeout)
}
