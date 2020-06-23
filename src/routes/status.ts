import { Router, Request, Response, NextFunction } from 'express'
import { getLogger } from '../helpers/logger'
import { getClient, PowClient } from '../helpers/pow'

export async function getStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const logger = getLogger('router:status/getStatus')
  try {
    const pow = (await getClient()) as PowClient
    const health = await pow.health.check()
    logger(health)
    const { status } = health
    if (status === 0 || status === 3) {
      throw new Error('Node is in error or unspecified status')
    }
    // @TODO: add more verifications (e.g. balance check)
    res.send({ status })
  } catch (err) {
    logger(err)
    next(err)
  }
}

export const statusRouter = Router()
statusRouter.get('/', getStatus)
