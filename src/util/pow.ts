import { createPow } from '@textile/powergate-client'
import { getLogger } from '../util/logger'
import { powergateServerUri } from '../config'

export declare type PowClient = ReturnType<typeof createPow>

const logger = getLogger('util:pow')

let client: undefined | PowClient | unknown

export function getClient(mock?: unknown): PowClient | unknown {
  if (process.env.NODE_ENV === 'test' && mock !== undefined) {
    client = mock
  }
  if (client === undefined) {
    const options = { host: powergateServerUri }
    logger(`Set powergate client: ${JSON.stringify(options)}`)
    client = createPow(options)
  }
  return client
}
