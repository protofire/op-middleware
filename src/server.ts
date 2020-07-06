import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import bodyParser from 'body-parser'
// import dotenv from 'dotenv'
import { getLogger } from './helpers/logger'
import { ErrorStatus } from './helpers/errorStatus'
import { Upload } from './models/upload'
import { Ffs } from './models/ffs'
import { IpfsDirectory } from './models/ipfsDirectory'
import { MongooseDB } from './helpers/db'
import { statusRouter } from './routes/status'
import { storageRouter } from './routes/storage'
import { ipfsRouter } from './routes/ipfs'
import * as config from './config'

const logger = getLogger('app')

export const app = express()

if (process.env.NODE_ENV !== 'test') {
  // Log env values (partially, the ones that are not secret) at strtup
  const {
    uploadPath,
    uploadMaxSize,
    maxPrice,
    dealMinDuration,
    jobWatchTimeout,
  } = config
  logger('Config values (partial/non-secret):')
  logger({
    uploadPath,
    uploadMaxSize,
    maxPrice,
    dealMinDuration,
    jobWatchTimeout,
  })
  // Setup DB in models when not in test env
  const db = new MongooseDB(config.dbUri)
  Upload.setDb(db)
  Ffs.setDb(db)
  IpfsDirectory.setDb(db)
  // Setub basic endpoint logging
  app.use(helmet())
  app.use(morgan('dev'))
}
// Setub cors & JSON body parser
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// App routes
app.use('/status', statusRouter)
app.use('/storage', storageRouter)
app.use('/ipfs', ipfsRouter)

// Catch 404 errors
app.use((req, res, next) => {
  const error = new ErrorStatus('Not found', 404)
  next(error)
})
// Catch rest of errors
app.use(
  (
    err: Error | ErrorStatus,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    res.status(err instanceof ErrorStatus && err.status ? err.status : 500)
    res.json({
      error: {
        message: err.message,
      },
    })
    next()
  },
)

// Start server (start listening only if outside tests)
if (!module.parent) {
  const { port } = config
  const server = app.listen(port)
  server.on('listening', function onListening(): void {
    logger(`Server listening on port ${port}`)
  })
  server.on('error', function onError(error: NodeJS.ErrnoException): void {
    if (error.syscall !== 'listen') {
      throw error
    }
    switch (error.code) {
      case 'EACCES':
        logger('Required elevated privileges')
        process.exit(1) // eslint-disable-next-line
      case 'EADDRINUSE':
        logger(`Port ${port} is already in use`)
        process.exit(1) // eslint-disable-next-line
      default:
        throw error
    }
  })
}
