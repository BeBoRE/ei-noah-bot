export default {
  entitiesDirs: ['./dist/entity'], // path to your JS entities (dist), relative to `baseDir`
  entitiesDirsTs: ['./src/entity'], // path to your TS entities (source), relative to `baseDir`
  dbName: 'ei.db',
  type: 'sqlite', // one of `mongo` | `mysql` | `mariadb` | `postgresql` | `sqlite`
};
