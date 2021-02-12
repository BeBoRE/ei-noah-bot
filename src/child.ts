import { MikroORM } from '@mikro-orm/core';
import { Client } from 'discord.js';
import dotenv from 'dotenv';
import { coronaRefresher } from './routes/CoronaRouter';

dotenv.config();

(async () => {
  const client = new Client();

  const orm = await MikroORM.init().catch((err) => { console.error(err); process.exit(-1); });
  await client.login(process.env.CLIENT_TOKEN);

  console.log('corona refresher online');

  coronaRefresher(client, orm);
})();
