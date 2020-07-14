import request from 'supertest'
import { app } from '../../src/server'
import { setClient, getStringHealthStatus } from '../../src/helpers/pow'
import { uploadMaxSize, maxPrice, dealMinDuration } from '../../src/config'
import { Ffs } from '../../src/models/ffs'
import { MockedDB } from '../helpers/__mocks__/db'

describe('GET /status', () => {
  beforeEach(async () => {
    const db = new MockedDB()
    Ffs.setDb(db)
    await Ffs.save({
      token: 'aToken',
      id: 'anId',
      archived: false,
    })
  })
  const server = app.listen()
  afterAll((done) => server.close(done))

  it('responds with success', async () => {
    // Powergate status ok
    let s = 1
    const mockedClient = {
      health: {
        check: () => Promise.resolve({ status: s }),
      },
      ffs: {
        addrs: () => Promise.resolve({ addrsList: [{ addr: 'anAddress' }] }),
      },
    }
    setClient(mockedClient)
    let r = await request(server).get('/status')
    expect(r.status).toBe(200)
    expect(r.body.status).toBe(getStringHealthStatus(s))
    expect(r.body.uploadMaxSize).toBe(uploadMaxSize)
    // Powergate status degraded
    s = 2
    mockedClient.health.check = () => Promise.resolve({ status: s })
    r = await request(server).get('/status')
    expect(r.status).toBe(200)
    expect(r.body.status).toBe(getStringHealthStatus(s))
    expect(r.body.uploadMaxSize).toBe(uploadMaxSize)
    expect(r.body.maxPrice).toBe(maxPrice)
    expect(r.body.dealMinDuration).toBe(dealMinDuration)
    expect(r.body.ffsToken).toBe('aToken')
    expect(r.body.address).toBe('anAddress')
  })

  it('responds with error', async () => {
    // Powergate status unspecified
    const mockedClient = {
      health: {
        check: () => Promise.resolve({ status: 0 }),
      },
    }
    setClient(mockedClient)
    let r = await request(server).get('/status')
    expect(r.status).toBe(500)
    // Powergate status
    mockedClient.health.check = () => Promise.resolve({ status: 3 })
    r = await request(server).get('/status')
    expect(r.status).toBe(500)
  })
})
