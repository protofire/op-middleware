import { Schema, Document, model, connect } from 'mongoose'
import { Upload, DB } from '../model/upload'
import { getLogger } from './logger'

const logger = getLogger('util:db')

const UploadSchema = new Schema({
  ffsToken: {
    type: 'string',
    required: true,
  },
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

  async saveUpload(u: Upload): Promise<boolean> {
    try {
      const um = new UploadModel(u)
      await um.save()
      return true
    } catch (err) {
      logger(`Error saving ${JSON.stringify(u)}`)
      logger(err)
      return false
    }
  }

  async getUploadByCid(cid: string): Promise<Upload> {
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
}
