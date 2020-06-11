import { getLogger } from '../util/logger'

const logger = getLogger('router:model/upload')

type JobStatus =
  | 'NEW'
  | 'UNSPECIFIED'
  | 'QUEUED'
  | 'EXECUTING'
  | 'FAILED'
  | 'CANCELED'
  | 'SUCCESS'
const jobStatuses: JobStatus[] = [
  'UNSPECIFIED',
  'QUEUED',
  'EXECUTING',
  'FAILED',
  'CANCELED',
  'SUCCESS',
]

export interface IUpload {
  ffsToken: string
  cid: string
  jobId: string
  jobStatus?: JobStatus
}

export interface DB {
  saveUpload: (u: Upload) => Promise<unknown>
  getUploadByCid: (cid: string) => Promise<IUpload>
}

export class Upload implements IUpload {
  ffsToken: string
  cid: string
  jobId: string
  jobStatus: JobStatus

  static db: DB | null = null
  public static setDb(db: DB): void {
    Upload.db = db
  }
  public static getDb(): DB {
    if (Upload.db === null) {
      logger('No db set')
      throw new Error('No DB set in UploadModel')
    }
    return Upload.db as DB
  }

  constructor(u: IUpload) {
    this.ffsToken = u.ffsToken
    this.cid = u.cid
    this.jobId = u.jobId
    this.jobStatus = u.jobStatus || 'NEW'
  }

  public async save(): Promise<unknown> {
    Upload.getDb().saveUpload(this)
    return this
  }

  public setJobStatusByNumber(s: number): Upload {
    this.jobStatus = jobStatuses[s]
    return this
  }

  static async getByCid(cid: string): Promise<Upload | null> {
    const u = await Upload.getDb().getUploadByCid(cid)
    return u ? new Upload(u) : null
  }
}
