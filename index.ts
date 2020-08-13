import dotenv from 'dotenv';
import { User } from 'discord.js';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';

dotenv.config();

const eiNoah = new EiNoah(process.env.CLIENT_TOKEN);

// LobbyRouter wordt gebruikt wanneer mensen "ei lobby" aanroepen
eiNoah.use('lobby', LobbyRouter);

// Hier is een 'Handler' als argument in principe is dit een eindpunt van de routing.
// Dit is waar berichten worden afgehandeld
eiNoah.use('mention', (routeInfo) => {
  if (routeInfo.params[0] instanceof User) {
    routeInfo.msg.channel.send(`I must mention you <@!${(routeInfo.params[0]).id}>`);
  }
});

// Als een mention als parameter is gebruikt wordt deze functie aangeroepen,
// je kan hiervoor geen Router gebruiken
eiNoah.use(User, (routeInfo) => {
  if (routeInfo.params[0] instanceof User) routeInfo.msg.channel.send(`What about ${routeInfo.params[0]}`);
});

eiNoah.use('noah', (info) => info.msg.channel.send('Dat ben ik :D'));

eiNoah.start();
