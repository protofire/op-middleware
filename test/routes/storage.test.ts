import request from 'supertest'
import mockfs from 'mock-fs'
import { readFileSync } from 'fs'
import { app } from '../../src/server'
import { getClient } from '../../src/util/pow'
import { Upload } from '../../src/model/upload'
import { MockedDB } from '../util/mockedDb'
import { uploadsPath, uploadField } from '../../src/middlewares/multerUpload'

beforeEach(() => {
  const db = new MockedDB()
  Upload.setDb(db)
})
afterEach(() => {
  mockfs.restore()
})
const server = app.listen()
afterAll((done) => server.close(done))

describe('POST /storage', () => {
  const ffsToken = 'aFfsToken'
  const cid = 'aCid'
  const jobId = 'aJobId'
  const mockedClient = {
    ffs: {
      create: () => Promise.resolve({ token: ffsToken }),
      addToHot: () => Promise.resolve({ cid }),
      pushConfig: () => Promise.resolve({ jobId }),
      watchJobs: (callback: (job: { status: number }) => void) => {
        callback({ status: 2 })
      },
    },
    setToken: () => null,
  }
  getClient(mockedClient)

  it('responds with success', async () => {
    const f = {
      filename: 'example.txt',
      content: 'Example content',
    }
    const r = await request(server)
      .post(`/storage`)
      .attach(uploadField, Buffer.from(f.content), {
        filename: f.filename,
      })
    expect(r.status).toBe(200)
    const rbJob = r.body.job
    expect(rbJob).toEqual({ jobId, cid })
    const rbFile = r.body.file
    expect(rbFile.size).toEqual(f.content.length)
    expect(readFileSync(`${uploadsPath}/${rbFile.name}`, 'utf8')).toEqual(
      f.content,
    )
    const r2 = await request(server).get(`/storage/${cid}`)
    expect(r2.status).toBe(200)
  })

  // it('responds with error', async () => {
  // @TODO: send a req with no file
  // @TODO: send a file bigger than maFileSize
  // })
})

describe('GET /storage/:cid', () => {
  it('responds with success', async () => {
    const cid = 'aCid'
    const u = new Upload({
      cid,
      ffsToken: 'aFfsToken',
      jobId: 'aJobId',
      jobStatus: 'NEW',
    })
    await u.save()
    const r = await request(server).get(`/storage/${cid}`)
    expect(r.status).toBe(200)
  })
  it('responds with 404 error', async () => {
    const r = await request(server).get(`/storage/inexistentCid`)
    expect(r.status).toBe(404)
  })
})
