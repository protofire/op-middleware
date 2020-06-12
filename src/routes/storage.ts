import { readFile } from 'fs'
import { Router, Request, Response, NextFunction } from 'express'
import { getLogger } from '../util/logger'
import { multerUpload, uploadField } from '../middlewares/multerUpload'
import { getClient, PowClient } from '../util/pow'
import { Upload } from '../model/upload'
import { ErrorStatus } from '../util/errorStatus'

export async function addFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:storage/addFile')
  try {
    const { file } = req
    logger({ file })

    const pow = getClient() as PowClient
    const { token } = await pow.ffs.create()
    logger(`ffs token: ${token}`)
    pow.setToken(token)

    readFile(file.path, async (err, data) => {
      if (err) {
        logger(err)
        throw new Error(err.message)
      }
      const { cid } = await pow.ffs.addToHot(data)
      logger(`cid: ${cid}`)
      const { jobId } = await pow.ffs.pushConfig(cid)
      logger(`jobId: ${jobId}`)

      const upload = new Upload({ ffsToken: token, cid, jobId })
      logger(`Saving upload to DB:`)
      logger({ ffsToken: token, cid, jobId })
      await upload.save()
      logger(`Saved upload with cid ${cid}`)

      pow.ffs.watchJobs(async (job) => {
        const { status } = job
        logger(`Updating job ${jobId} status ${upload.jobStatus} > ${status}`)
        upload.setJobStatusByNumber(status)
        await upload.save()
        logger(`Updated job ${jobId}`)
      }, jobId)

      res.send({
        job: { jobId, cid },
        file: { name: file.filename, size: file.size },
      })
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
