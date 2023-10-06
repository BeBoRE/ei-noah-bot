import {
  drizzle as drizzleClient,
  NodePgDatabase,
} from 'drizzle-orm/node-postgres';
import { Client as PgClient } from 'pg';

import { clientConfig } from './drizzle.config';

export const client = new PgClient(clientConfig);

export default client;

let drizzle: NodePgDatabase<Record<string, never>> | null = null;

export const getDrizzleClient = async () => {
  if (!drizzle) {
    await client.connect();

    drizzle = drizzleClient(client, { logger: true });
  }

  return drizzle;
};

export type DrizzleClient = Awaited<ReturnType<typeof getDrizzleClient>>;
