import debug from 'debug'

export function getLogger(feature: string): ReturnType<typeof debug> {
  return debug(`op-middleware:${feature}`)
}
