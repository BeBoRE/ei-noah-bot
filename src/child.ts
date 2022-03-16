import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import logger from './logger';
import { coronaRefresher } from './routes/CoronaRouter';

dotenv.config();
process.title = 'Ei Noah Corona Refresher';

(async () => {
  const client = new Client({
    intents: [GatewayIntentBits.DirectMessages],
  });

  const orm = await MikroORM.init<PostgreSqlDriver>().catch((error) => { logger.error(error, { error }); process.exit(-1); });
  await client.login(process.env.CLIENT_TOKEN);

  logger.info('corona refresher online');

  coronaRefresher(client, orm, logger);
})();
