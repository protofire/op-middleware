import request from 'supertest'
import { server } from '../src/server'
import { getClient } from '../src/util/pow'

afterAll((done) => {
  server.close(done)
})

describe('general server config', () => {
  it('responds with 404 to not found endpoints', async () => {
    const r = await request(server).get('/somerandonenpoint')
    expect(r.status).toBe(404)
  })
  it('responds with 500 when handling errors', async () => {
    const mockedClient = {}
    getClient(mockedClient)
    const r = await request(server).get('/status')
    expect(r.status).toBe(500)
  })
})
