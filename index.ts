import dotenv from 'dotenv';
import { User } from 'discord.js';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eiNoah = new EiNoah(process.env.CLIENT_TOKEN);
eiNoah.use('lobby', LobbyRouter);
eiNoah.use('mention', (routeInfo) => {
  if (routeInfo.params[0] instanceof User) {
    routeInfo.msg.channel.send(`I must mention you <@!${(routeInfo.params[0]).id}>`);
  }
});
eiNoah.use(User, (routeInfo) => {
  if (routeInfo.params[0] instanceof User) routeInfo.msg.channel.send(`What about ${routeInfo.params[0]}`);
});
eiNoah.use('noah', (info) => info.msg.channel.send('Dat ben ik :D'));

eiNoah.start();
