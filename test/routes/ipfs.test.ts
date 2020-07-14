import request from 'supertest'
import { app } from '../../src/server'
import { setClient } from '../../src/helpers/pow'
import { IpfsDirectory } from '../../src/models/ipfsDirectory'
import { Ffs } from '../../src/models/ffs'
import { MockedDB } from '../helpers/__mocks__/db'
import { getMockedClient } from './__mocks__/powClient'
import { ipfsUrls, lsResults } from '../helpers/__mocks__/oceanProtocol'
import * as oPHelpers from '../../src/helpers/oceanProtocol'

export const mockedOpHelpers = (jest.mock(
  '../../src/helpers/oceanProtocol',
) as unknown) as jest.Mocked<typeof oPHelpers>

describe('POST /ipfs', () => {
  beforeEach(() => {
    const db = new MockedDB()
    IpfsDirectory.setDb(db)
    Ffs.setDb(db)
  })
  const server = app.listen()
  afterAll((done) => server.close(done))

  const ffsId = 'anId'
  const ffsToken = 'aFfsToken'
  const cid = 'aCid'
  const jobId = 'aJobId'
  const mockedClient = getMockedClient({ ffsId, ffsToken, cid, jobId })
  setClient(mockedClient)

  it('responds with 200: all IPFS directories found', async () => {
    jest
      .spyOn(oPHelpers, 'lsCid')
      .mockImplementationOnce(() => Promise.resolve(lsResults[0]))
      .mockImplementationOnce(() => Promise.resolve(lsResults[1]))

    const r = await request(server)
      .post(`/ipfs`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send(ipfsUrls)
    expect(r.status).toBe(200)

    const arr = r.body as any[]
    expect(arr.length).toEqual(ipfsUrls.length)
    arr.forEach(
      (
        a: { url: string; jobId: string; status: string; fileCid: string },
        i: number,
      ) => {
        expect(a.url).toBe(ipfsUrls[i])
        expect(a.jobId).toBe('aJobId')
        expect(a.status).toBe('NEW')
        expect(a.fileCid).toBe(`fileCid${i + 1}`)
      },
    )
  })

  it('responds with 200: an IPFS directories ls erroed', async () => {
    jest
      .spyOn(oPHelpers, 'lsCid')
      .mockImplementationOnce(() => Promise.resolve(new Error('IFPS error')))
      .mockImplementationOnce(() => Promise.resolve(lsResults[1]))

    const r = await request(server)
      .post(`/ipfs`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send(ipfsUrls)
    expect(r.status).toBe(200)

    const arr = r.body as any[]
    expect(arr.length).toEqual(ipfsUrls.length)
    const rItem1 = arr[0]
    expect(rItem1.url).toBe(ipfsUrls[0])
    expect(rItem1.jobId).toBeFalsy()
    expect(rItem1.status).toBe('FAILED')
    const { detail } = rItem1
    expect(detail.error.indexOf('Failed IPFS ls on')).toBeGreaterThan(-1)
    const rItem2 = arr[1]
    expect(rItem2.url).toBe(ipfsUrls[1])
    expect(rItem2.jobId).toBe('aJobId')
    expect(rItem2.status).toBe('NEW')
  })

  it('responds with 200: an IPFS file is larger than uploadMaxSize', async () => {
    jest
      .spyOn(oPHelpers, 'lsCid')
      .mockImplementationOnce(() => Promise.resolve(lsResults[2]))
      .mockImplementationOnce(() => Promise.resolve(lsResults[1]))

    const r = await request(server)
      .post(`/ipfs`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send(ipfsUrls)
    expect(r.status).toBe(200)

    const arr = r.body as any[]
    expect(arr.length).toEqual(ipfsUrls.length)
    const rItem1 = arr[0]
    expect(rItem1.url).toBe(ipfsUrls[0])
    expect(rItem1.jobId).toBeFalsy()
    expect(rItem1.status).toBe('FAILED')
    const { detail } = rItem1
    expect(detail.error.indexOf('File on IPFS is larger than')).toBeGreaterThan(
      -1,
    )
    const rItem2 = arr[1]
    expect(rItem2.url).toBe(ipfsUrls[1])
    expect(rItem2.jobId).toBe('aJobId')
    expect(rItem2.status).toBe('NEW')
  })

  it('responds with 500: wrong body format', async () => {
    const r = await request(server)
      .post(`/ipfs`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send({ fail: 'with 500' })
    expect(r.status).toBe(500)
  })
})

describe('GET /ipfs/:jobId', () => {
  beforeEach(() => {
    const db = new MockedDB()
    IpfsDirectory.setDb(db)
    Ffs.setDb(db)
  })
  const server = app.listen()
  afterAll((done) => server.close(done))

  it('responds with success', async () => {
    const jobId = 'aJobId'
    const i = new IpfsDirectory({
      url: 'aUrl',
      folderCid: 'aFolderCid',
      fileCid: 'aFileCid',
      jobId,
      detail: { test: 'test' },
    })
    await i.save()
    const r = await request(server).get(`/ipfs/${jobId}`)
    expect(r.status).toBe(200)
  })

  it('responds with 404 error', async () => {
    const r = await request(server).get(`/ipfs/inexistentJobId`)
    expect(r.status).toBe(404)
  })
})

describe('POST /ipfs/jobsstatusarray', () => {
  beforeEach(() => {
    const db = new MockedDB()
    IpfsDirectory.setDb(db)
    Ffs.setDb(db)
  })
  const server = app.listen()
  afterAll((done) => server.close(done))

  it('responds with success', async () => {
    const i1 = new IpfsDirectory({
      url: 'url1',
      folderCid: 'rolderCid1',
      fileCid: 'fileCid1',
      jobId: 'jobId1',
      detail: { test: 'test' },
    })
    const i2 = new IpfsDirectory({
      url: 'url2',
      folderCid: 'rolderCid2',
      fileCid: 'fileCid2',
      jobId: 'jobId2',
      detail: { test: 'test' },
    })
    await Promise.all([i1.save(), i2.save()])
    const r = await request(server)
      .post(`/ipfs/jobsstatusarray`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send([i1.jobId, i2.jobId])
    expect(r.status).toBe(200)
  })

  it('responds with success to not found jobIds', async () => {
    const i1 = new IpfsDirectory({
      url: 'url1',
      folderCid: 'rolderCid1',
      fileCid: 'fileCid1',
      jobId: 'jobId1',
      detail: { test: 'test' },
    })
    await i1.save()
    const r = await request(server)
      .post(`/ipfs/jobsstatusarray`)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send([i1.jobId, 'nonExistentJobId'])
    expect(r.status).toBe(200)
    // The info entry of the not-found/non-existent jobId will be null
    expect(r.body[1]).toBeNull()
  })
})
