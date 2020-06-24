import request from 'supertest'
import { app } from '../../src/server'
import { setClient, getStringHealthStatus } from '../../src/helpers/pow'
import { uploadMaxSize, maxPrice, dealMinDuration } from '../../src/config'

describe('GET /status', () => {
  const server = app.listen()
  afterAll((done) => server.close(done))

  it('responds with success', async () => {
    // Powergate status ok
    let s = 1
    const mockedClient = {
      health: {
        check: () => Promise.resolve({ status: s }),
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
    expect(r.body.uploadMaxSize).toBeDefined()
    expect(r.body.uploadMaxSize).toBe(uploadMaxSize)
    expect(r.body.maxPrice).toBe(maxPrice)
    expect(r.body.maxPrice).toBeDefined()
    expect(r.body.dealMinDuration).toBe(dealMinDuration)
    expect(r.body.dealMinDuration).toBeDefined()
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
