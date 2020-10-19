import { MikroORM } from '@mikro-orm/core';
import config from './config';

const ORM = MikroORM.init(config);
ORM.then(() => console.log('ORM Ready'));

export default ORM;
