import { getLogger } from '../util/logger'
import { DB } from '../util/db'

const logger = getLogger('router:model/ffs')

export interface IFfs {
  token: string
  id: string
}

export class Ffs {
  static instance: IFfs | null = null

  static db: DB | null = null
  public static setDb(db: DB): void {
    Ffs.db = db
  }
  public static getDb(): DB {
    if (Ffs.db === null) {
      logger('No db set')
      throw new Error('No DB set in Ffs model')
    }
    return Ffs.db as DB
  }

  static async save(f: IFfs): Promise<IFfs> {
    const i = (await Ffs.getDb().saveFfs(f)) as IFfs
    Ffs.instance = i
    return Ffs.instance
  }

  static async get(): Promise<IFfs | null> {
    return Ffs.instance
  }
}
