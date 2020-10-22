import { MikroORM } from '@mikro-orm/core';
import config from './config';

const ORM = MikroORM.init(config).then(async (orm) => {
  await orm.getMigrator().up();
  return orm;
});
ORM.then(() => console.log('ORM Ready'));

export default ORM;
