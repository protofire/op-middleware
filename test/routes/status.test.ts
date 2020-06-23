import request from 'supertest'
import { app } from '../../src/server'
import { setClient } from '../../src/helpers/pow'

describe('GET /status', () => {
  const server = app.listen()
  afterAll((done) => server.close(done))

  it('responds with success', async () => {
    // Powergate status ok
    const mockedClient = {
      health: {
        check: () => Promise.resolve({ status: 1 }),
      },
    }
    setClient(mockedClient)
    let r = await request(server).get('/status')
    expect(r.status).toBe(200)
    // Powergate status degraded
    mockedClient.health.check = () => Promise.resolve({ status: 2 })
    r = await request(server).get('/status')
    expect(r.status).toBe(200)
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
