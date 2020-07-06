import { Router, Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { getLogger } from '../helpers/logger'
import { Upload } from '../models/upload'
import { IpfsDirectory } from '../models/ipfsDirectory'
import { getClient, PowClient } from '../helpers/pow'
import {
  jobWatchTimeout,
  dealMinDuration,
  maxPrice,
  uploadMaxSize,
} from '../config'

type LsLink = {
  Name: string
  Hash: string
  Size: number
}
type LsObject = {
  Hash: string
  Links: LsLink[]
}
type LsResult = {
  Objects: LsObject[]
}
type FolderCid = {
  url: string
  folderCid: string
  fileCid?: string
  jobId?: string
  status?: string
}

export async function addFromIpfs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:ipfs/addFile')
  try {
    const { body } = req
    logger({ body })

    // @TODO:
    // - validation (just assume everything is alright)
    // - file could already have been stored in cold storage, prevent
    // double cold storage (add ipfsentry to DB, model, etc)
    const folderCids: FolderCid[] = body.map((u: string) => {
      return {
        url: u,
        folderCid: u.split('/')[2],
      }
    })

    // Problems with this req (assume url is ok)
    // - not found
    // - timeout
    // - other
    // Get folder's unique file CID
    const fLsPromises = folderCids.map(async (f: FolderCid) => {
      try {
        const r = await axios.post(
          `http://localhost:5001/api/v0/ls?arg=${f.folderCid}`,
          undefined,
          {
            timeout: 1500,
          },
        )
        return r.data
      } catch (err) {
        logger(`Error while doing IFPS ls for folder with CID: ${f.folderCid}`)
        return new Error('Error when retrieving IPFS folder content')
      }
    })
    const fLsResults = (await Promise.all(fLsPromises)) as (LsResult | Error)[]

    const coldStorageQueuePromises = fLsResults.map(
      async (fLsResult: LsResult | Error, index: number) => {
        if (fLsResult instanceof Error) {
          return { error: fLsResult.message }
        }

        const fileLink = fLsResult.Objects[0].Links[0]
        folderCids[index].fileCid = fileLink.Hash
        if (fileLink.Size > uploadMaxSize) {
          logger(
            `${fLsResult.Objects[0].Hash}/${fileLink.Hash} is ${fileLink.Size}, larger than ${uploadMaxSize}`,
          )
          return { error: `File on IPFS is larger than ${uploadMaxSize}` }
        }

        // - store in DB: directory CID, file CID
        // - push file CID config enablingh cold storage
        logger(
          `Queue ${fLsResult.Objects[0].Hash}/${fileLink.Hash} is ${fileLink.Size}, config push for cold storage`,
        )
        const jobId = await pushCidConfig(fileLink.Hash)
        const { url, folderCid, fileCid } = folderCids[index]
        const i = new IpfsDirectory({
          url,
          jobId,
          folderCid,
          fileCid: fileCid as string,
        })
        folderCids[index].jobId = jobId
        folderCids[index].status = i.jobStatus
        logger('Saving IpfsDirectory:')
        logger(i)
        await i.save()
        logger('IpfsDirectory saved successful')
        watchJob(i)
        return jobId
      },
    )
    const queueResults = await Promise.all(coldStorageQueuePromises)

    const result: { [key: string]: string }[] = folderCids.map((f) => {
      return {
        url: f.url as string,
        jobId: f.jobId as string,
        status: f.status as string,
      }
    })
    // - return array of coldStorage_queued / failed objects
    //  - UI will show ok/fails, for oks (poll job statuses)
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
        coldInfo: i.fileColdInfo,
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

    res.send({ status: i.jobStatus, coldInfo: i.fileColdInfo })
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
    switch (Upload.getJobStatus(status)) {
      case 'SUCCESS':
      case 'FAILED':
      case 'CANCELLED':
        logger(`Job ${jobId} finished, cancellig watch`)
        cancelWatch()
        isWatchActive = false
        clearTimeout(cancelWatchTimeout)
    }
    try {
      logger(`Retrieving info for cid: ${i.fileCid}`)
      const info = await pow.ffs.show(i.fileCid)
      i.fileColdInfo =
        info.cidInfo && info.cidInfo.cold && info.cidInfo.cold.filecoin
      logger(i.fileColdInfo)
    } catch (err) {
      logger('JobCidInfo not yet available')
    }
    logger(
      `Updating job ${jobId} status ${i.jobStatus} > ${Upload.getJobStatus(
        status,
      )}`,
    )
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
      await i.save()
      logger(`Updated job ${jobId}`)
    }
  }, jobWatchTimeout)
}
