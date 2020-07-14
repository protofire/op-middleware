import axios from 'axios'
import { ipfsApiUri } from '../config'

export type LsLink = {
  Name: string
  Hash: string
  Size: number
}
export type LsObject = {
  Hash: string
  Links: LsLink[]
}
export type LsResult = {
  Objects: LsObject[]
}

export async function lsCid(folderCid: string): Promise<LsResult | Error> {
  try {
    const r = await axios.post(
      `${ipfsApiUri}/api/v0/ls?arg=${folderCid}`,
      undefined,
      {
        timeout: 1500,
      },
    )
    return r.data
  } catch (err) {
    return new Error('Error when retrieving IPFS folder content')
  }
}
