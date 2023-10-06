import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { client, getDrizzleClient } from './client';

getDrizzleClient()
  .then(async (c) => {
    await migrate(c, { migrationsFolder: './tables' }).catch(console.error);
  })
  .finally(() => {
    client.end();
  });
