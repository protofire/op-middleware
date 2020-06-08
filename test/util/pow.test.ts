import { getClient } from '../../src/util/pow'

describe('util/pow', () => {
  describe('getClient', () => {
    it('returns same instance', () => {
      const p1 = getClient()
      const p2 = getClient()
      expect(p1).toStrictEqual(p2)
    })
    it('accept setting mock client when process.node.NODE_ENV === "test"', () => {
      const p1 = getClient()
      const mock = {}
      const p2 = getClient(mock)
      expect(p2).not.toStrictEqual(p1)
      expect(p2).toStrictEqual(mock)
    })
  })
})
