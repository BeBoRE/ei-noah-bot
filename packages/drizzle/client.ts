import {
  drizzle as drizzleClient,
} from 'drizzle-orm/node-postgres';
import { Client as PgClient } from 'pg';

import { clientConfig } from './drizzle.config';


let pg : PgClient | null = null;
let connected = false;
export const getPgClient =  () => {
  if (!pg) {
    pg = new PgClient(clientConfig);

    if(!connected) pg.connect().then(() => {connected = true}).catch(() => { });
  }

  return pg;
}

export const getDrizzleClient = async () => {
  if(!connected) await getPgClient().connect().then(() => {connected = true}).catch(() => { });

  return drizzleClient(getPgClient())
};

export type DrizzleClient = Awaited<ReturnType<typeof getDrizzleClient>>;
