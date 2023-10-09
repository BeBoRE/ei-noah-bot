import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { getConnectedPgClient, getDrizzleClient } from './client';

getDrizzleClient()
  .then(async (c) => {
    await migrate(c, { migrationsFolder: './tables' }).catch(console.error);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    (await getConnectedPgClient()).end();
  });
