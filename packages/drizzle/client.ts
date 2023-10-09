import {
  drizzle as drizzleClient,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres';
import { Client as PgClient } from 'pg';

import { clientConfig } from './drizzle.config';

const pg: PgClient = new PgClient(clientConfig);
let connectedPgClient: Promise<PgClient> | null = null;

export const getConnectedPgClient = async () => {
  if (connectedPgClient) return connectedPgClient;

  connectedPgClient = pg.connect().then(() => pg);

  return connectedPgClient;
};

let drizzle: Promise<NodePgDatabase<Record<string, never>>> | null = null;
export const getDrizzleClient = async () => {
  if (drizzle) return drizzle;

  drizzle = getConnectedPgClient().then((p) => drizzleClient(p));

  return drizzle;
};

export type DrizzleClient = Awaited<ReturnType<typeof getDrizzleClient>>;
