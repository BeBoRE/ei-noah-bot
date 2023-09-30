import { migrate } from "drizzle-orm/postgres-js/migrator";
import client, { getDrizzleClient } from "./client";

getDrizzleClient().then(async (client) => {
  await migrate(client, { migrationsFolder: './tables' }).catch(console.error);
})
  .finally(() => {
    client.end();
  })
