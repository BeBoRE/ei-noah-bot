import {
  Options,
} from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function getEntities(): Promise<any[]> {
  if (process.env.WEBPACK) {
    const modules = require.context('./entity', true, /\.ts$/);

    return modules
      .keys()
      .map(r => modules(r))
      .flatMap(mod => Object.keys(mod).map(className => mod[className]));
  }

  const promises = fs.readdirSync('./entity').map(file => import(`./entity/${file}`));
  const modules = await Promise.all(promises);

  return modules.flatMap(mod => Object.keys(mod).map(className => mod[className]));
}

const options : Options<PostgreSqlDriver> = {
  baseDir: __dirname,
  entities: await getEntities(), // path to your TS entities (source), relative to `baseDir`
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
  metadataProvider: TsMorphMetadataProvider,
};

export default options;
