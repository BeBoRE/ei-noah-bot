import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

import { clientConfig } from './drizzle.config';

export const client = new Client(clientConfig);

export default client;

export const getDrizzleClient = async () => {
  await client.connect();

  return drizzle(client);
};
