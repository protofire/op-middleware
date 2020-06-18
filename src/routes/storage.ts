import { promises } from 'fs'
import { Router, Request, Response, NextFunction } from 'express'
import { getLogger } from '../util/logger'
import { multerUpload, uploadField } from '../middlewares/multerUpload'
import { getClient, PowClient } from '../util/pow'
import { Upload } from '../model/upload'
import { ErrorStatus } from '../util/errorStatus'
import { jobWatchTimeout } from '../config'

export async function addFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:storage/addFile')
  try {
    const { file } = req
    logger({ file })

    const pow = (await getClient()) as PowClient

    const data = await promises.readFile(file.path)
    const { cid } = await pow.ffs.addToHot(data)
    logger(`cid: ${cid}`)
    if ((await Upload.getByCid(cid)) !== null) {
      throw new ErrorStatus(`File already processed with cid: ${cid}`, 409)
    }
    const { jobId } = await pow.ffs.pushConfig(cid)

    const upload = new Upload({ cid, jobId })
    logger(`Saving upload to DB:`)
    logger({ cid, jobId })
    await upload.save()
    logger(`Saved upload with cid ${cid}`)

    let isWatchActive = true
    const cancelWatch = pow.ffs.watchJobs(async (job) => {
      const { status } = job
      logger(
        `Updating job ${jobId} status ${
          upload.jobStatus
        } > ${Upload.getJobStatus(status)}`,
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
      }
    }, jobId)
    // The jobStatus should change to failed/cancelled/success before
    // jobWatchTimeout, if not, we force the cancel of the watch assuming
    // something unexpected happened
    setTimeout(async () => {
      if (isWatchActive) {
        logger(`Cancelling job ${jobId} watch due to inactivity`)
        cancelWatch()
        logger(`Updating job ${jobId} status ${upload.jobStatus} > UNSPECIFIED`)
        upload.jobStatus = 'UNSPECIFIED'
        await upload.save()
        logger(`Updated job ${jobId}`)
      }
    }, jobWatchTimeout)

    res.send({
      job: { jobId, cid },
      file: { name: file.filename, size: file.size },
    })
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
