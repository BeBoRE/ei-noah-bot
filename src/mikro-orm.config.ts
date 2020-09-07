import {
  Options,
} from 'mikro-orm';

const options : Options = {
  entitiesDirs: ['./src/entity'], // path to your TS entities (source), relative to `baseDir`
  dbName: 'ei-noah',
  type: 'postgresql', // one of `mongo` | `mysql` | `mariadb` | `postgresql` | `sqlite`
  host: process.env.HOST || 'localhost',
  user: 'ei-noah',
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './src/migrations',
    transactional: true,
  },
};

export default options;
