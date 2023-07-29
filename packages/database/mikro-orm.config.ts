import {
  Options,
} from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import dotenv from 'dotenv';
import { Category } from './entity/Category';
import { Channel } from './entity/Channel';
import CustomRole from './entity/CustomRole';
import { Guild } from './entity/Guild';
import { GuildUser } from './entity/GuildUser';
import LobbyNameChange from './entity/LobbyNameChange';
import Quote from './entity/Quote';
import TempChannel from './entity/TempChannel';
import { User } from './entity/User';

dotenv.config();

const options : Options<PostgreSqlDriver> = {
  baseDir: __dirname,
  // Due to webpack we cannnot make use of the dynamic file access
  entities: [Category, Channel, CustomRole, Guild, GuildUser, LobbyNameChange, Quote, TempChannel, User],
  discovery: { disableDynamicFileAccess: true },
  dbName: process.env.DBNAME || 'ei-noah',
  type: 'postgresql', // one of `mongo` | `mysql` | `mariadb` | `postgresql` | `sqlite`
  host: process.env.DBHOST || 'localhost',
  password: process.env.DBPASSWORD || undefined,
  port: process.env.DBPORT ? +process.env.DBPORT : 5432,
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
