import { getLogger } from '../helpers/logger'
import { DB } from '../helpers/db'

const logger = getLogger('router:model/ffs')

export interface IFfs {
  token: string
  id: string
  archived?: boolean
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
    if (Ffs.instance === null) {
      Ffs.instance = await Ffs.getDb().getFfs()
    }
    return Ffs.instance
  }

  static async archive(): Promise<unknown> {
    Ffs.get()
    if (Ffs.instance) {
      Ffs.instance.archived = true
      return Ffs.save(Ffs.instance)
    }
  }
}
