import dotenv from 'dotenv';
import {
  User, Role, PresenceData,
} from 'discord.js';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';
import Counter from './routes/Counter';
import QuoteRouter from './routes/QuoteRouter';
import CoronaRouter from './routes/CoronaRouter';
import LoginRouter from './routes/LoginRouter';

dotenv.config();

if (!process.env.CLIENT_TOKEN) throw new Error('Add a client token');

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
if (process.env.NODE_ENV !== 'production') eiNoah.use('counter', Counter);

eiNoah.use(null, (info) => {
  const watZegtNoah = ['Ja wat jonge', '**Kabaal** ik zit op de fiets', 'Ik steek je neer', 'Hmm wat zegt noah nog meer', 'Ik laat het aan god over'];

  const zeg = watZegtNoah[Math.floor(Math.random() * watZegtNoah.length)];

  info.msg.channel.send(zeg);
});

eiNoah.use('quote', QuoteRouter);

eiNoah.onInit = async (client) => {
  const updatePrecense = () => {
    const watDoetNoah : PresenceData[] = [{
      activity: {
        name: 'Probeer Niet Te Steken',
        type: 'PLAYING',
      },
    }, {
      activity: {
        name: 'Steek Geluiden',
        type: 'LISTENING',
      },
    }];

    const precense = watDoetNoah[Math.floor(Math.random() * watDoetNoah.length)];

    client.user?.setPresence(precense);

    setTimeout(updatePrecense, 1000 * 60);
  };

  updatePrecense();
};

eiNoah.use('corona', CoronaRouter);

eiNoah.use('login', LoginRouter);

export default eiNoah;
