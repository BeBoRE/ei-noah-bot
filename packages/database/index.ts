/* eslint-disable no-underscore-dangle */
import { MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';

import options from './mikro-orm.config';

export default options;

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let __MikroORM__: MikroORM;
}

const getOrm = async (): Promise<MikroORM> => {
  if (!global.__MikroORM__) {
    global.__MikroORM__ = await MikroORM.init<PostgreSqlDriver>(options).catch(
      (err) => {
        console.log(err);
        process.exit(-1);
      },
    );
  }

  return global.__MikroORM__;
};

export { getOrm };
