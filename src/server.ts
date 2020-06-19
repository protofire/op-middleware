import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import { getLogger } from './util/logger'
import { ErrorStatus } from './util/errorStatus'
import { Upload } from './model/upload'
import { Ffs } from './model/ffs'
import { MongooseDB } from './util/db'
import { statusRouter } from './routes/status'
import { storageRouter } from './routes/storage'
import { port, dbUri } from './config'

const logger = getLogger('app')

export const app = express()

if (process.env.NODE_ENV !== 'test') {
  // Load env variable values from .env
  const dotenvConfig = dotenv.config()
  if (dotenvConfig.error) {
    throw dotenvConfig.error
  }

  // Setup DB in models when not in test env
  const db = new MongooseDB(dbUri)
  Upload.setDb(db)
  Ffs.setDb(db)
  // Setub basic endpoint logging
  app.use(morgan('dev'))
}
// Setub cors & JSON body parser
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// App routes
app.use('/status', statusRouter)
app.use('/storage', storageRouter)

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
