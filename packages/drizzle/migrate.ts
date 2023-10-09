import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { getDrizzleClient, getPgClient } from './client';

getDrizzleClient()
  .then(async (c) => {
    await migrate(c, { migrationsFolder: './tables' }).catch(console.error);
  })
  .finally(() => {
    getPgClient().end();
  });
