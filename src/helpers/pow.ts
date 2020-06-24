import { createPow } from '@textile/powergate-client'
import { getLogger } from './logger'
import { powergateServerUri } from '../config'
import { Ffs } from '../models/ffs'

export declare type PowClient = ReturnType<typeof createPow>

const logger = getLogger('util:pow')

let client: null | PowClient | unknown = null

export async function getClient(): Promise<PowClient | unknown> {
  if (client !== null) {
    return client
  }

  const options = { host: powergateServerUri }
  logger(`Set powergate client: ${JSON.stringify(options)}`)
  const c = createPow(options)

  let f = await Ffs.get()
  if (f === null) {
    logger(`No ffs found in DB, creating and saving a new one`)
    const { token, id } = await c.ffs.create()
    f = await Ffs.save({ token, id })
    logger('Ffs saved in DB')
  }
  logger(`Setting ffs token with id: ${f.id}`)
  c.setToken(f.token)
  client = c
  return client
}

// Use only when testing
export function setClient(mock: unknown): void {
  if (process.env.NODE_ENV === 'test' && mock !== undefined) {
    client = mock
  }
}

export const healthStatuses = ['UNSPECIFIED', 'OK', 'DEGRADED', 'ERROR']
export function getStringHealthStatus(s: number): string {
  return healthStatuses[s]
}
