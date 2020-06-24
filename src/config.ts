const envVarNames = [
  'PORT',
  'POWERGATE_SERVER_URI',
  'DB_URI',
  'UPLOADS_PATH',
  'MAX_FILE_SIZE',
  'MAX_PRICE',
  'DEAL_MIN_DURATION',
  'JOB_WATCH_TIMEOUT',
]
envVarNames.forEach((n) => {
  if (process.env[n] === undefined) {
    throw Error(`${n} not specified in env config`)
  }
})
export const port = process.env.PORT as string
export const powergateServerUri = process.env.POWERGATE_SERVER_URI as string
export const dbUri = process.env.DB_URI as string
// Default upload path is relative to the app path
export const uploadPath = process.env.UPLOADS_PATH as string
// Size is expressed in bytes
export const uploadMaxSize = Number.parseInt(
  process.env.MAX_FILE_SIZE as string,
  10,
)
export const maxPrice = Number.parseInt(process.env.MAX_PRICE as string, 10)
export const dealMinDuration = Number.parseInt(
  process.env.DEAL_MIN_DURATION as string,
  10,
)
// Expressed in milliseconds
export const jobWatchTimeout = Number.parseInt(
  process.env.JOB_WATCH_TIMEOUT as string,
  10,
)
