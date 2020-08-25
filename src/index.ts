import dotenv from 'dotenv';
import 'reflect-metadata';
import { User } from 'discord.js';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';
import Counter from './routes/Counter';
import Birthday from './routes/Birthday';

dotenv.config();

const eiNoah = new EiNoah(process.env.CLIENT_TOKEN);

// LobbyRouter wordt gebruikt wanneer mensen "ei lobby" aanroepen
eiNoah.use('lobby', LobbyRouter);

//Voor verjaardag handeling
eiNoah.use('bday', Birthday);

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

// Voorbeeld hoe je met user data omgaat
eiNoah.use('counter', Counter);

eiNoah.use('noah', (info) => {
  info.msg.channel.send('Dat ben ik :D');
});

eiNoah.start();
