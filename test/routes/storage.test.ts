import request from 'supertest'
import mockfs from 'mock-fs'
import { readFileSync } from 'fs'
import { app } from '../../src/server'
import { setClient } from '../../src/util/pow'
import { Upload } from '../../src/model/upload'
import { Ffs } from '../../src/model/ffs'
import { MockedDB } from '../util/__mocks__/db'
import { uploadField } from '../../src/middlewares/multerUpload'
import { uploadPath } from '../../src/config'

describe('POST /storage', () => {
  beforeEach(() => {
    const db = new MockedDB()
    Upload.setDb(db)
    Ffs.setDb(db)
  })
  afterEach(() => {
    mockfs.restore()
  })
  const server = app.listen()
  afterAll((done) => server.close(done))

  const ffsToken = 'aFfsToken'
  const cid = 'aCid'
  const jobId = 'aJobId'
  const mockedClient: any = {
    ffs: {
      create: () => Promise.resolve({ token: ffsToken }),
      addToHot: () => Promise.resolve({ cid }),
      pushConfig: () => Promise.resolve({ jobId }),
      watchJobs: (callback: (job: { status: number }) => void) => {
        // allow to update the job via a function
        mockedClient.updateJob = () => callback({ status: 2 })
      },
    },
    setToken: () => null,
    updateJob: null,
  }
  setClient(mockedClient)

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
    expect(readFileSync(`${uploadPath}/${rbFile.name}`, 'utf8')).toEqual(
      f.content,
    )
    const r2 = await request(server).get(`/storage/${cid}`)
    expect(r2.status).toBe(200)
    // Check that new uploads' status is NEW
    expect(r2.body.status).toBe('NEW')
    // Simulate upload job status update
    mockedClient.updateJob()
    const r3 = await request(server).get(`/storage/${cid}`)
    expect(r3.status).toBe(200)
    expect(r3.body.status).toBe('EXECUTING')
  })

  it('responds with 403', async () => {
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
    // Try to post the same content with different file name
    const f2 = { ...f, filename: 'example2.txt' }
    const r2 = await request(server)
      .post(`/storage`)
      .attach(uploadField, Buffer.from(f2.content), {
        filename: f.filename,
      })
    expect(r2.status).toBe(409)
  })

  it('responds with 500 when no file', async () => {
    const r = await request(server).post(`/storage`)
    expect(r.status).toBe(500)
  })

  it('responds with 500 when file is too big', async () => {
    const f = {
      filename: 'example.txt',
      content: '01234567890123456789extra',
    }
    const r = await request(server)
      .post(`/storage`)
      .attach(uploadField, Buffer.from(f.content), {
        filename: f.filename,
      })
    expect(r.status).toBe(500)
  })

  // @TODO: test scheduled job update
})

describe('GET /storage/:cid', () => {
  beforeEach(() => {
    const db = new MockedDB()
    Upload.setDb(db)
    Ffs.setDb(db)
  })
  afterEach(() => {
    mockfs.restore()
  })
  const server = app.listen()
  afterAll((done) => server.close(done))

  it('responds with success', async () => {
    const cid = 'aCid'
    const u = new Upload({
      cid,
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
