import dotenv from 'dotenv';
import { User, Role } from 'discord.js';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';
import Counter from './routes/Counter';

dotenv.config();

const eiNoah = new EiNoah(process.env.CLIENT_TOKEN);

// LobbyRouter wordt gebruikt wanneer mensen "ei lobby" aanroepen
eiNoah.use('lobby', LobbyRouter);

// Hier is een 'Handler' als argument in principe is dit een eindpunt van de routing.
// Dit is waar berichten worden afgehandeld
eiNoah.use('steek', (routeInfo) => {
  if (routeInfo.params[0] instanceof User) {
    routeInfo.msg.channel.send(`Met plezier, kom hier <@!${(routeInfo.params[0]).id}>!`);
  } else {
    routeInfo.msg.channel.send('Lekker');
  }
});

eiNoah.use(Role, ({ msg, params }) => {
  msg.channel.send(`${params[0]}s zijn gamers`);
});

// Als een mention als parameter is gebruikt wordt deze functie aangeroepen,
// je kan hiervoor geen Router gebruiken
eiNoah.use(User, (routeInfo) => {
  if (routeInfo.params[0] instanceof User) routeInfo.msg.channel.send(`What about ${routeInfo.params[0]}`);
});

// Voorbeeld hoe je met user data omgaat
eiNoah.use('counter', Counter);

eiNoah.use(null, (info) => {
  const watZegtNoah = ['Ja wat jonge', '**Kabaal** ik zit op de fiets', 'Ik steek je neer', 'Hmm wat zegt noah nog meer', 'Ik laat het aan god over'];

  const zeg = watZegtNoah[Math.floor(Math.random() * watZegtNoah.length)];

  info.msg.channel.send(zeg);
});

eiNoah.start();
