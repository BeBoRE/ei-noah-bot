/* eslint-disable no-underscore-dangle */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */
import {
  drizzle as drizzleClient,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

import { clientConfig } from './drizzle.config';

export * from 'drizzle-orm';

declare global {
  var __pg: Client;
  var __connectedPgClient: Promise<Client> | undefined;
  var __drizzle: Promise<NodePgDatabase<Record<string, never>>> | undefined;
}

export const pg: Client = global.__pg || new Client(clientConfig);

export const getConnectedPgClient = async () => {
  if (global.__connectedPgClient) return global.__connectedPgClient;

  global.__connectedPgClient = pg.connect().then(() => pg);

  return global.__connectedPgClient;
};

export const getDrizzleClient = async () => {
  if (global.__drizzle) return global.__drizzle;

  global.__drizzle = getConnectedPgClient().then((p) => {
    p.on('error', (err) => {
      console.error('pg error', err);

      process.exit(-2);
    });

    return drizzleClient(p, {
      logger: process.env.NODE_ENV !== 'production',
    });
  });

  return global.__drizzle;
};

export type DrizzleClient = Awaited<ReturnType<typeof getDrizzleClient>>;
