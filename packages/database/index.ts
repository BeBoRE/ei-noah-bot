/* eslint-disable no-underscore-dangle */
import { MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';

import { MikroOrmAdapter } from '@auth/mikro-orm-adapter';
import mikroOrmOptions from './mikro-orm.config';

export default mikroOrmOptions;

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let __MikroORM__: MikroORM;
}

export const adapter = MikroOrmAdapter(mikroOrmOptions)

const getOrm = async (): Promise<MikroORM> => {
  if (!global.__MikroORM__) {
    global.__MikroORM__ = await MikroORM.init<PostgreSqlDriver>(mikroOrmOptions).catch(
      (err) => {
        console.log(err);
        process.exit(-1);
      },
    );
  }

  return global.__MikroORM__;
};

export { getOrm };
