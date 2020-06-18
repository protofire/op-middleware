import { Schema, Document, model, connect } from 'mongoose'
import { IUpload, Upload } from '../model/upload'
import { IFfs } from '../model/ffs'
import { getLogger } from './logger'

const logger = getLogger('util:db')

const UploadSchema = new Schema({
  cid: {
    type: 'string',
    required: true,
  },
  jobId: {
    type: 'string',
    required: true,
  },
  jobStatus: {
    type: 'string',
    required: false,
  },
})

type UploadDocument = Upload & Document
const UploadModel = model<UploadDocument>('Upload', UploadSchema)

const FfsSchema = new Schema({
  id: {
    type: 'string',
    required: true,
  },
  token: {
    type: 'string',
    required: true,
  },
})

type FfsDocument = IFfs & Document
const FfsModel = model<FfsDocument>('Ffs', FfsSchema)

export interface DB {
  saveUpload: (u: Upload) => Promise<unknown>
  getUploadByCid: (cid: string) => Promise<IUpload>
  saveFfs: (f: IFfs) => Promise<unknown>
  getFfs: () => Promise<IFfs | null>
}

export class MongooseDB implements DB {
  constructor(uri: string) {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
    connect(uri, options, (err) => {
      if (err) {
        logger(err.message)
        logger(err)
      } else {
        logger('Connected to MongoDB via Mongoose')
      }
    })
  }

  // @FIXME: should accept IUpload
  async saveUpload(u: Upload): Promise<boolean> {
    try {
      const um = new UploadModel(u)
      await um.save()
      return true
    } catch (err) {
      logger(`Error saving upload ${JSON.stringify(u)}`)
      logger(err)
      return false
    }
  }

  // @FIXME: should return IUpload
  async getUploadByCid(cid: string): Promise<IUpload> {
    try {
      const r = await UploadModel.findOne({ cid })
      if (r === null) {
        throw new Error(`Could not find upload with cid ${cid}`)
      }
      return new Upload(r)
    } catch (err) {
      logger(`Error retrieving upload with cid ${cid}`)
      logger(err)
      throw err
    }
  }

  async saveFfs(f: IFfs): Promise<unknown> {
    try {
      const fm = new FfsModel(f)
      return await fm.save()
    } catch (err) {
      logger(`Error saving ffs ${JSON.stringify(f)}`)
      logger(err)
      return false
    }
  }

  async getFfs(): Promise<IFfs | null> {
    try {
      return await FfsModel.findOne()
    } catch (err) {
      logger(`Error retrieving ffs`)
      logger(err)
      throw err
    }
  }
}
