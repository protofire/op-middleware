import { DB } from '../../../src/helpers/db'
import { IUpload, Upload } from '../../../src/models/upload'
import { IFfs } from '../../../src/models/ffs'

export class MockedDB implements DB {
  public uploads: IUpload[]
  public ffs: IFfs | null

  constructor() {
    this.uploads = []
    this.ffs = null
  }

  async saveUpload(u: IUpload): Promise<IUpload> {
    let eu = await this.getUploadByCid(u.cid)
    if (eu === null) {
      this.uploads.push(new Upload(u))
      eu = u
    } else {
      eu.cid = u.cid
      eu.jobId = u.jobId
      eu.jobStatus = u.jobStatus
    }
    return Promise.resolve(eu)
  }

  getUploadByCid(cid: string): Promise<IUpload | null> {
    const r = this.uploads.find((r) => r.cid === cid)
    return Promise.resolve(r ? (r as Upload) : null)
  }

  saveFfs(f: IFfs): Promise<unknown> {
    this.ffs = Object.assign({}, f)
    return Promise.resolve(this.ffs)
  }

  async getFfs(): Promise<IFfs> {
    return Promise.resolve(this.ffs as IFfs)
  }
}
