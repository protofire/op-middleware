import { Upload, DB } from '../../src/model/upload'

export class MockedDB implements DB {
  public registers: Upload[]

  constructor() {
    this.registers = []
  }

  public saveUpload(u: Upload): Promise<unknown> {
    this.registers.push(new Upload(u))
    return Promise.resolve(u)
  }

  public getUploadByCid(cid: string): Promise<Upload> {
    const r = this.registers.find((r) => r.cid === cid)
    return Promise.resolve(r as Upload)
  }
}
