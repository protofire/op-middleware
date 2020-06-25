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
import { getMockedClient } from './__mocks__/powClient'

describe('POST /storage (handle FFS instance recreation)', () => {
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
  const mockedClient = getMockedClient({ ffsId, ffsToken, cid, jobId })
  setClient(mockedClient)

  it('on addToHot-ffs-invalidation recreate ffs instance and responds with success', async () => {
    const f = { filename: 'example.txt', content: 'Example content' }
    // Simulate ffs invalidation
    const originalAddToHot = mockedClient.ffs.addToHot
    mockedClient.ffs.addToHot = () => {
      mockedClient.ffs.addToHot = originalAddToHot
      throw new Error('error code 2')
    }
    const r = await request(server)
      .post(`/storage`)
      .attach(uploadField, Buffer.from(f.content), {
        filename: f.filename,
      })
    expect(r.status).toBe(200)
  })
})
