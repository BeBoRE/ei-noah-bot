import { drizzle } from 'drizzle-orm/node-postgres';
import { Client as PgClient } from 'pg';

import { clientConfig } from './drizzle.config';

export const client = new PgClient(clientConfig);

export default client;

export const getDrizzleClient = async () => {
  await client.connect();

  return drizzle(client, { logger: true });
};

export type DrizzleClient = Awaited<ReturnType<typeof getDrizzleClient>>;
