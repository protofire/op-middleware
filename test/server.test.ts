import request from 'supertest'
import { app } from '../src/server'
import { setClient } from '../src/util/pow'

describe('general server config', () => {
  const server = app.listen()
  afterAll((done) => server.close(done))

  it('responds with 404 to not found endpoints', async () => {
    const r = await request(server).get('/somerandonenpoint')
    expect(r.status).toBe(404)
  })
  it('responds with 500 when handling errors', async () => {
    const mockedClient = {}
    setClient(mockedClient)
    const r = await request(server).get('/status')
    expect(r.status).toBe(500)
  })
})
