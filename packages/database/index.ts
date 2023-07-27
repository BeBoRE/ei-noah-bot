import { PostgreSqlMikroORM } from '@mikro-orm/postgresql/PostgreSqlMikroORM';
import options from './mikro-orm.config';
import {PostgreSqlDriver, MikroORM} from '@mikro-orm/postgresql';

export default options;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      __MikroORM__: PostgreSqlMikroORM | undefined;
    }
  }
}

const getOrm = async () : Promise<PostgreSqlMikroORM> => {
  if(!global.__MikroORM__) {
    global.__MikroORM__ = await MikroORM.init<PostgreSqlDriver>(options).catch((err) => { console.error(err); process.exit(-1); })
  }

  return global.__MikroORM__;
}

export { getOrm };
