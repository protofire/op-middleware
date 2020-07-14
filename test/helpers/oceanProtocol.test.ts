import { LsResult, lsCid } from '../../src/helpers/oceanProtocol'

jest.mock('axios', () => {
  const mockedResult: LsResult = {
    Objects: [
      {
        Hash: 'folderCid',
        Links: [
          {
            Name: 'filename',
            Hash: 'fileHash',
            Size: 1,
          },
        ],
      },
    ],
  }
  return {
    post: (folderCid: string) => {
      if (folderCid.indexOf('folderCid') > -1)
        return Promise.resolve({ data: mockedResult })
      else return Promise.reject(new Error('something wrong'))
    },
  }
})

describe('helpers/oceanProtocol', () => {
  describe('lsCid', () => {
    it('retrieves ls info of a folder cid from IPFS node', async () => {
      const lsData = (await lsCid('folderCid')) as LsResult
      expect(lsData.Objects.length).toBe(1)
    })
    it('returns error when something goes wrong', async () => {
      const r = (await lsCid('somethingWrong')) as LsResult
      expect(r instanceof Error).toBeTruthy()
    })
  })
})
