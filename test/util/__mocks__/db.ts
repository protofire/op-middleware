import { DB } from '../../../src/util/db'
import { Upload } from '../../../src/model/upload'
import { IFfs } from '../../../src/model/ffs'

export class MockedDB implements DB {
  public uploads: Upload[]
  public ffs: IFfs | null

  constructor() {
    this.uploads = []
    this.ffs = null
  }

  saveUpload(u: Upload): Promise<unknown> {
    this.uploads.push(new Upload(u))
    return Promise.resolve(u)
  }

  getUploadByCid(cid: string): Promise<Upload> {
    const r = this.uploads.find((r) => r.cid === cid)
    return Promise.resolve(r as Upload)
  }

  saveFfs(f: IFfs): Promise<unknown> {
    this.ffs = Object.assign({}, f)
    return Promise.resolve(this.ffs)
  }

  async getFfs(): Promise<IFfs> {
    return Promise.resolve(this.ffs as IFfs)
  }
}
