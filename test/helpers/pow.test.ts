import { setClient, getClient } from '../../src/helpers/pow'
import { Ffs } from '../../src/models/ffs'
import { MockedDB } from './__mocks__/db'

jest.mock('@textile/powergate-client', () => {
  const pow = {
    ffs: {
      create: () => Promise.resolve({ id: 'aId', token: 'aToken' }),
    },
    setToken: (t: string) => t,
  }
  return {
    createPow: () => pow,
  }
})

describe('helpers/pow', () => {
  describe('getClient', () => {
    it('returns instance and creates Ffs if not set', async () => {
      Ffs.setDb(new MockedDB())
      expect(await Ffs.get()).toBeNull()
      const pow = await getClient()
      expect(pow).not.toBeNull()
      expect(await Ffs.get()).not.toBeNull()
    })
    it('returns same existing instance', async () => {
      setClient({})
      const p1 = await getClient()
      const p2 = await getClient()
      expect(p1).toStrictEqual(p2)
    })
    it('accept setting mock client when process.node.NODE_ENV === "test"', async () => {
      setClient({})
      const p1 = await getClient()
      setClient({ mock: 'client' })
      const p2 = await getClient()
      expect(p1).not.toStrictEqual(p2)
    })
  })
})
