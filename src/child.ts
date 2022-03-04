import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { coronaRefresher } from './routes/CoronaRouter';

dotenv.config();
process.title = 'Ei Noah Corona Refresher';

(async () => {
  const client = new Client({
    intents: [GatewayIntentBits.DirectMessages],
  });

  const orm = await MikroORM.init<PostgreSqlDriver>().catch((err) => { console.error(err); process.exit(-1); });
  await client.login(process.env.CLIENT_TOKEN);

  console.log('corona refresher online');

  coronaRefresher(client, orm);
})();
