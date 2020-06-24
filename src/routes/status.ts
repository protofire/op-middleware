import { Router, Request, Response, NextFunction } from 'express'
import { getLogger } from '../helpers/logger'
import { getClient, PowClient, getStringHealthStatus } from '../helpers/pow'
import { uploadMaxSize, maxPrice, dealMinDuration } from '../config'

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
    res.send({
      status: getStringHealthStatus(status),
      uploadMaxSize,
      maxPrice,
      dealMinDuration,
    })
  } catch (err) {
    logger(err)
    next(err)
  }
}

export const statusRouter = Router()
statusRouter.get('/', getStatus)
