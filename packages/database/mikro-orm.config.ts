import {
  Options,
} from '@mikro-orm/core';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import dotenv from 'dotenv';

dotenv.config();

const options : Options = {
  baseDir: __dirname,
  entities: ['./entity'], // path to your TS entities (source), relative to `baseDir`
  dbName: process.env.DBNAME || 'ei-noah',
  type: 'postgresql', // one of `mongo` | `mysql` | `mariadb` | `postgresql` | `sqlite`
  host: process.env.HOST || 'localhost',
  password: process.env.PASSWORD || undefined,
  port: process.env.PORT ? +process.env.PORT : 5432,
  user: process.env.DBUSER || 'ei-noah',
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './migrations',
    transactional: true,
  },
  debug: process.env.DEBUG === 'true',
  metadataProvider: TsMorphMetadataProvider
};

export default options;
