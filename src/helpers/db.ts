import { Schema, Document, model, connect } from 'mongoose'
import { IUpload, Upload, JobStatus } from '../models/upload'
import { IFfs } from '../models/ffs'
import { IpfsDirectory, IIpfsDirectory } from '../models/ipfsDirectory'
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
  archived: {
    type: 'boolean',
    required: false,
    default: false,
  },
})

type FfsDocument = IFfs & Document
const FfsModel = model<FfsDocument>('Ffs', FfsSchema)

const IpfsDirectorySchema = new Schema({
  url: {
    type: 'string',
    required: true,
  },
  folderCid: {
    type: 'string',
    required: true,
  },
  fileCid: {
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
  detail: {
    type: 'mixed',
    required: false,
  },
})

type IpfsDirectoryDocument = IpfsDirectory & Document
const IpfsDirectoryModel = model<IpfsDirectoryDocument>(
  'IpfsDirectory',
  IpfsDirectorySchema,
)

export interface DB {
  saveUpload: (u: Upload) => Promise<IUpload>
  getUploadByCid: (cid: string) => Promise<IUpload | null>
  saveFfs: (f: IFfs) => Promise<unknown>
  getFfs: () => Promise<IFfs | null>
  saveIpfsDirectory: (i: IpfsDirectory) => Promise<IIpfsDirectory>
  getIpfsDirectoryByJobId: (jobId: string) => Promise<IIpfsDirectory | null>
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

  async saveUpload(u: IUpload): Promise<IUpload> {
    try {
      const eu = await UploadModel.findOne({ cid: u.cid })
      if (eu !== null) {
        eu.cid = u.cid
        eu.jobId = u.jobId
        eu.jobStatus = u.jobStatus as JobStatus
        await eu.save()
        return eu
      } else {
        const nu = new UploadModel(u)
        await nu.save()
        return nu
      }
    } catch (err) {
      logger(`Error saving upload ${JSON.stringify(u)}`)
      logger(err)
      throw err
    }
  }

  async getUploadByCid(cid: string): Promise<IUpload | null> {
    try {
      const r = await UploadModel.findOne({ cid })
      if (r === null) {
        logger(`Could not find upload with cid ${cid}`)
      }
      return r
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

  async saveIpfsDirectory(i: IpfsDirectory): Promise<IIpfsDirectory> {
    try {
      const e = await IpfsDirectoryModel.findOne({ url: i.url })
      if (e !== null) {
        e.jobId = i.jobId
        e.jobStatus = i.jobStatus as JobStatus
        e.detail = i.detail
        await e.save()
        return e
      } else {
        const n = new IpfsDirectoryModel(i)
        await n.save()
        return n
      }
    } catch (err) {
      logger(`Error saving ipfsDirectory ${JSON.stringify(i)}`)
      logger(err)
      throw err
    }
  }

  async getIpfsDirectoryByJobId(jobId: string): Promise<IIpfsDirectory | null> {
    try {
      const r = await IpfsDirectoryModel.findOne({ jobId })
      if (r === null) {
        logger(`Could not find ipfsDirectory with jobId ${jobId}`)
      }
      return r
    } catch (err) {
      logger(`Error retrieving upload with jobId ${jobId}`)
      logger(err)
      throw err
    }
  }
}
