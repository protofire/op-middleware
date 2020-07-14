import { Router, Request, Response, NextFunction } from 'express'
import { getLogger } from '../helpers/logger'
import { Upload, JobStatus } from '../models/upload'
import { IpfsDirectory } from '../models/ipfsDirectory'
import { getClient, PowClient } from '../helpers/pow'
import { lsCid, LsResult } from '../helpers/oceanProtocol'
import {
  jobWatchTimeout,
  dealMinDuration,
  maxPrice,
  uploadMaxSize,
} from '../config'

type FolderCid = {
  url: string
  folderCid: string
  fileCid?: string
  jobId?: string
  status?: JobStatus
  detail?: any
}

export async function addFromIpfs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:ipfs/addFile')
  try {
    const { body } = req
    // @TODO: validate that elements are ipfs:// urls
    logger({ body })

    // Create data structure to be returned in response
    const result: FolderCid[] = body.map((url: string) => ({
      url,
      folderCid: url.split('/')[2],
    }))

    // Commons IPFS url is a file wrapped with a directory node; get file CID
    const lsPromises = result.map((f: FolderCid) => lsCid(f.folderCid))
    const lsResults = (await Promise.all(lsPromises)) as (LsResult | Error)[]

    await Promise.all(
      lsResults.map(async (fLsResult: LsResult | Error, index: number) => {
        const r = result[index]
        if (fLsResult instanceof Error) {
          r.status = 'FAILED'
          r.detail = { error: `Failed IPFS ls on ${r.folderCid}` }
          logger(`Failed to perform ls on ${r.url} folder`)
          return
        }

        const ipfsFile = fLsResult.Objects[0].Links[0]
        if (ipfsFile.Size > uploadMaxSize) {
          r.status = 'FAILED'
          r.detail = { error: `File on IPFS is larger than ${uploadMaxSize}` }
          logger(`${r.url} size ${ipfsFile.Size} > ${uploadMaxSize}`)
          return
        }

        // @IMPROVEME: file exists in DB with SUCCESS?
        // - do not save and return
        // - else, queue push config

        // Push cold storage config for file and save IpfsDirectory in DB
        logger(`Push cold storage config for ${r.url}/${ipfsFile.Hash}`)
        const jobId = await pushCidConfig(ipfsFile.Hash)
        const i = new IpfsDirectory({
          url: r.url,
          jobId,
          folderCid: r.folderCid,
          fileCid: ipfsFile.Hash,
        })
        logger('Saving IpfsDirectory:')
        logger(i)
        await i.save()
        logger('IpfsDirectory saved successful')
        watchJob(i)

        // Update info to be returned
        r.jobId = jobId
        r.status = i.jobStatus
        return jobId
      }),
    )
    res.send(result)
  } catch (err) {
    logger(err)
    next(err)
  }
}

export async function getJobStatusArray(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:ipfs/getJobStatusArray')
  try {
    const { body } = req

    logger(`Retrieving ipfs cold storage job statuses for:`)
    logger(body)
    const getPromises = body.map((j: string) => IpfsDirectory.getByJobId(j))
    const ipfsDirectories = (await Promise.all(getPromises)) as IpfsDirectory[]
    logger('Found all ipfs directores:')

    const statuses = ipfsDirectories.map((i: IpfsDirectory) => {
      return {
        url: i.url,
        status: i.jobStatus as string,
        detail: i.detail,
      }
    })
    res.send(statuses)
  } catch (err) {
    logger(err)
    next(err)
  }
}

export async function getJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:ipfs/getJobStatus')
  try {
    const { jobId } = req.params
    logger(`Retrieving ipfs cold storage job stautus with id: ${jobId}`)

    const i = await IpfsDirectory.getByJobId(jobId)
    logger('Found ipfs directory:')
    logger(i)
    if (i === null) {
      throw new Error(`IpfsDirectory with jobId: ${jobId} not found`)
    }

    res.send({ url: i.url, status: i.jobStatus, detail: i.detail })
  } catch (err) {
    logger(err)
    next(err)
  }
}
export const ipfsRouter = Router()
ipfsRouter.post('/', addFromIpfs)
ipfsRouter.get('/:jobId', getJobStatus)
ipfsRouter.post('/jobsstatusarray', getJobStatusArray)

async function pushCidConfig(cid: string): Promise<string> {
  const logger = getLogger('router:ipfs/pushCidConfig')
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

async function watchJob(i: IpfsDirectory) {
  const logger = getLogger('router:storage/watchJob')
  const { jobId } = i

  const pow = (await getClient()) as PowClient
  let isWatchActive = true
  let cancelWatchTimeout: NodeJS.Timeout
  const cancelWatch = pow.ffs.watchJobs(async (job) => {
    const { status } = job
    const newJobStatus = Upload.getJobStatus(job.status)
    switch (newJobStatus) {
      case 'SUCCESS':
      case 'FAILED':
      case 'CANCELLED':
        logger(`Job ${jobId} finished, cancellig watch`)
        cancelWatch()
        isWatchActive = false
        clearTimeout(cancelWatchTimeout)
        if (newJobStatus === 'FAILED' || newJobStatus === 'CANCELLED') {
          i.detail = { error: `Job ${jobId} failed to store file in Filecoin` }
        }
    }
    try {
      logger(`Retrieving info for cid: ${i.fileCid}`)
      const info = await pow.ffs.show(i.fileCid)
      i.detail = info.cidInfo && info.cidInfo.cold && info.cidInfo.cold.filecoin
      logger(i.detail)
    } catch (err) {
      logger('JobCidInfo not yet available')
    }
    logger(`Updating job ${jobId} status ${i.jobStatus} > ${newJobStatus}`)
    i.setJobStatusByNumber(status)
    i.save()
  }, jobId)
  // The jobStatus should change to failed/cancelled/success before
  // jobWatchTimeout, if not, we force the cancel of the watch assuming
  // something unexpected happened
  cancelWatchTimeout = setTimeout(async () => {
    if (isWatchActive) {
      logger(`Cancelling job ${jobId} watch due to inactivity`)
      cancelWatch()
      logger(`Updating job ${jobId} status ${i.jobStatus} > UNSPECIFIED`)
      i.jobStatus = 'UNSPECIFIED'
      i.detail = { error: `Job watch timedout and was force-cancelled` }
      await i.save()
      logger(`Updated job ${jobId}`)
    }
  }, jobWatchTimeout)
}
