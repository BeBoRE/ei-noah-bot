/* eslint-disable no-underscore-dangle */
import { PostgreSqlDriver, MikroORM } from '@mikro-orm/postgresql';
import options from './mikro-orm.config';

export default options;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      __MikroORM__: MikroORM | undefined;
    }
  }
}

const getOrm = async () : Promise<MikroORM> => {
  if (!global.__MikroORM__) {
    global.__MikroORM__ = await MikroORM.init<PostgreSqlDriver>(options).catch((err) => { console.log(err); process.exit(-1); });
  }

  return global.__MikroORM__;
};

export { getOrm };
