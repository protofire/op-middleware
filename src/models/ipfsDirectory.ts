import { getLogger } from '../helpers/logger'
import { DB } from '../helpers/db'
import { JobStatus, jobStatuses } from './upload'

const logger = getLogger('router:model/ipfsDirectory')

export interface IIpfsDirectory {
  url: string
  folderCid: string
  fileCid: string
  jobId: string
  jobStatus?: JobStatus
  fileColdInfo?: any
}

export class IpfsDirectory implements IIpfsDirectory {
  url: string
  jobId: string
  folderCid: string
  fileCid: string
  jobStatus?: JobStatus
  fileColdInfo?: any

  static db: DB | null = null
  public static setDb(db: DB): void {
    IpfsDirectory.db = db
  }
  public static getDb(): DB {
    if (IpfsDirectory.db === null) {
      logger('No db set')
      throw new Error('No DB set in IpfsDirectory model')
    }
    return IpfsDirectory.db as DB
  }

  public static getJobStatus(s: number): JobStatus {
    return jobStatuses[s]
  }

  constructor(i: IIpfsDirectory) {
    this.url = i.url
    this.folderCid = i.folderCid
    this.fileCid = i.fileCid
    this.jobId = i.jobId
    this.jobStatus = i.jobStatus || 'NEW'
    this.fileColdInfo = i.fileColdInfo || undefined
  }

  public async save(): Promise<unknown> {
    IpfsDirectory.getDb().saveIpfsDirectory(this)
    return this
  }

  public setJobStatusByNumber(s: number): IpfsDirectory {
    this.jobStatus = IpfsDirectory.getJobStatus(s)
    return this
  }

  static async getByJobId(jobId: string): Promise<IpfsDirectory | null> {
    const i = await IpfsDirectory.getDb().getIpfsDirectoryByJobId(jobId)
    return i ? new IpfsDirectory(i) : null
  }
}
