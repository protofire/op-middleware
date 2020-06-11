import express, { Request, Response, NextFunction } from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import { getLogger } from './util/logger'
import { ErrorStatus } from './util/errorStatus'
import { Upload } from './model/upload'
import { MongooseDB } from './util/db'
import { statusRouter } from './routes/status'
import { storageRouter } from './routes/storage'

const port = process.env.PORT || 3000
const dbUri = process.env.DB_URI || 'mongodb://localhost:27017/op_middleware'
const isTestEnv = process.env.NODE_ENV === 'test'
const logger = getLogger('app')

// Setup DB
if (!isTestEnv) {
  const db = new MongooseDB(dbUri)
  Upload.setDb(db)
}

const app = express()
// Setup CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  )
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
  next()
})
// Setub basic endpoint logging + JSON body parser
if (!isTestEnv) {
  app.use(morgan('dev'))
}
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

// Start server
export const server = app.listen(port)
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
