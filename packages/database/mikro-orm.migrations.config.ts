import {
  Options,
} from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';

import baseOptions from './mikro-orm.config';

dotenv.config();

const options : Options<PostgreSqlDriver> = {
  ...baseOptions,
  entities: ['./entity'],
  entitiesTs: ['./entity'],
  discovery: { disableDynamicFileAccess: false },
};

export default options;
