import { LsResult } from '../../../src/helpers/oceanProtocol'
import { uploadMaxSize } from '../../../src/config'

export const ipfsUrls = [
  'ipfs://folderCid1/fileName1.example',
  'ipfs://folderCid2/fileName2.example',
]

export const lsResults: LsResult[] = [
  {
    Objects: [
      {
        Hash: 'folderCid1',
        Links: [
          {
            Name: 'fileCid1.filename',
            Hash: 'fileCid1',
            Size: 1,
          },
        ],
      },
    ],
  },
  {
    Objects: [
      {
        Hash: 'folderCid2',
        Links: [
          {
            Name: 'fileCid2.filename',
            Hash: 'fileCid2',
            Size: 2,
          },
        ],
      },
    ],
  },
  {
    Objects: [
      {
        Hash: 'folderCid3',
        Links: [
          {
            Name: 'fileCid3.filename',
            Hash: 'fileCid3',
            Size: uploadMaxSize + 1,
          },
        ],
      },
    ],
  },
]

