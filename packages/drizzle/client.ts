import {
  drizzle as drizzleClient,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres';
import { Client, Pool } from 'pg';

import { clientConfig } from './drizzle.config';

export const luciaPgClient = new Pool(clientConfig);
export const pg: Client = new Client(clientConfig);

let connectedPgClient: Promise<Client> | null = null;
export const getConnectedPgClient = async () => {
  if (connectedPgClient) return connectedPgClient;

  connectedPgClient = pg
    .connect()
    .then(() => pg)
    .catch(() => pg);

  return connectedPgClient;
};

let drizzle: Promise<NodePgDatabase<Record<string, never>>> | null = null;
export const getDrizzleClient = async () => {
  if (drizzle) return drizzle;

  drizzle = getConnectedPgClient().then((p) => drizzleClient(p));

  return drizzle;
};

export type DrizzleClient = Awaited<ReturnType<typeof getDrizzleClient>>;
