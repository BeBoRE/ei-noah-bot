import {
  Options,
} from '@mikro-orm/core';
import dotenv from 'dotenv';
import AccessToken from './entity/AccessToken';
import { Category } from './entity/Category';
import { Channel } from './entity/Channel';
import CoronaData from './entity/CoronaData';
import { Guild } from './entity/Guild';
import { GuildUser } from './entity/GuildUser';
import Quote from './entity/Quote';
import UserCoronaRegions from './entity/UserCoronaRegions';
import { User } from './entity/User';
import PublicKey from './entity/PublicKey';

dotenv.config();

const options : Options = {
  entities: [
    AccessToken,
    GuildUser,
    Category,
    Channel,
    CoronaData,
    Guild,
    Quote,
    User,
    UserCoronaRegions,
    PublicKey],
  dbName: process.env.DBNAME || 'ei-noah',
  type: 'postgresql', // one of `mongo` | `mysql` | `mariadb` | `postgresql` | `sqlite`
  host: process.env.HOST || 'localhost',
  password: process.env.PASSWORD || undefined,
  user: 'ei-noah',
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './data/migrations',
    transactional: true,
  },
  debug: process.env.DEBUG === 'true',
};

export default options;
