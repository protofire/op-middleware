import { Router, Request, Response, NextFunction } from 'express'
import { getLogger } from '../helpers/logger'
import { getClient, PowClient, getStringHealthStatus } from '../helpers/pow'
import { uploadMaxSize, maxPrice, dealMinDuration } from '../config'
import { Ffs, IFfs } from '../models/ffs'

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

    // Get ffs address from pow client
    let address = ''
    try {
      const { addrsList } = await pow.ffs.addrs()
      address = addrsList[0].addr
    } catch (err) {
      logger('Something went wrong performing pow.ffs.addrs()')
      logger(err)
    }

    // Get ffs token from DB
    let ffsToken = ''
    try {
      const ffs = (await Ffs.get()) as IFfs
      ffsToken = ffs.token
    } catch (err) {
      logger('Something went wrong retrieving ffs token from DB')
      logger(err)
    }

    res.send({
      status: getStringHealthStatus(status),
      uploadMaxSize,
      maxPrice,
      dealMinDuration,
      address,
      ffsToken,
    })
  } catch (err) {
    logger(err)
    next(err)
  }
}

export const statusRouter = Router()
statusRouter.get('/', getStatus)
