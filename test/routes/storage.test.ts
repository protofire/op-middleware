import request from 'supertest'
import { readFileSync, existsSync } from 'fs'
import rimraf from 'rimraf'
import { app } from '../../src/server'
import { setClient } from '../../src/helpers/pow'
import { Upload } from '../../src/models/upload'
import { Ffs } from '../../src/models/ffs'
import { MockedDB } from '../helpers/__mocks__/db'
import { uploadField } from '../../src/middlewares/multerUpload'
import { uploadPath } from '../../src/config'

describe('POST /storage', () => {
  beforeEach(() => {
    const db = new MockedDB()
    Upload.setDb(db)
    Ffs.setDb(db)
  })
  const server = app.listen()
  afterAll((done) => rimraf(uploadPath, () => server.close(done)))

  const ffsId = 'anId'
  const ffsToken = 'aFfsToken'
  const cid = 'aCid'
  const jobId = 'aJobId'
  // @TODO: improve to match Partial<PowClient> from util/pow
  const mockedClient: any = {
    ffs: {
      create: () => Promise.resolve({ token: ffsToken, id: ffsId }),
      addToHot: () => Promise.resolve({ cid }),
      pushConfig: () => Promise.resolve({ jobId }),
      watchJobs: (callback: (job: { status: number }) => void) => {
        // allow to update the job via a function
        mockedClient.updateJob = () => callback({ status: 5 })
        return () => null
      },
      defaultConfig: () => Promise.resolve({}),
      setDefaultConfig: () => Promise.resolve(),
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
    // File should be renamed like cid
    expect(readFileSync(`${uploadPath}/${cid}`, 'utf8')).toEqual(f.content)

    // Performing GET /storage/:cid should be ok
    const r2 = await request(server).get(`/storage/${cid}`)
    expect(r2.status).toBe(200)
    // Check that new uploads' status is NEW
    expect(r2.body.status).toBe('NEW')

    // Simulate upload job status update
    mockedClient.updateJob()
    const r3 = await request(server).get(`/storage/${cid}`)
    expect(r3.status).toBe(200)
    expect(r3.body.status).toBe('SUCCESS')
    // Upload job status is success, check that file was removed
    expect(existsSync(`${uploadPath}/${rbFile.name}`)).toBeFalsy()
  })

  it('responds with 403', async () => {
    const f = {
      filename: 'example.txt',
      content: 'Example content 403',
    }
    const r = await request(server)
      .post(`/storage`)
      .attach(uploadField, Buffer.from(f.content), {
        filename: f.filename,
      })
    expect(r.status).toBe(200)
    // Simulate upload job status update
    mockedClient.updateJob()

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

  // @TODO: add test for jobWatchTimeout
  // @TODO: add test for updating job status to FAILED & CANCELLED
})

describe('GET /storage/:cid', () => {
  beforeEach(() => {
    const db = new MockedDB()
    Upload.setDb(db)
    Ffs.setDb(db)
  })
  const server = app.listen()
  afterAll((done) => rimraf(uploadPath, () => server.close(done)))

  it('responds with success', async () => {
    const cid = 'aCid'
    const u = new Upload({
      cid,
      jobId: 'aJobId',
      jobStatus: 'NEW',
      originalName: 'aName',
      size: 123,
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
