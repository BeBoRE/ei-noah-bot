import dotenv from 'dotenv';
import {
  User, Role, PresenceData,
} from 'discord.js';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';
import Counter from './routes/Counter';
import Birthday from './routes/Birthday';
import QuoteRouter from './routes/QuoteRouter';
import CoronaRouter from './routes/CoronaRouter';

dotenv.config();

if (!process.env.CLIENT_TOKEN) throw new Error('Add a client token');

const eiNoah = new EiNoah(process.env.CLIENT_TOKEN);

// LobbyRouter wordt gebruikt wanneer mensen "ei lobby" aanroepen
eiNoah.use('lobby', LobbyRouter);

// Voor verjaardag handeling
eiNoah.use('bday', Birthday);

// Hier is een 'Handler' als argument in principe is dit een eindpunt van de routing.
// Dit is waar berichten worden afgehandeld
eiNoah.use('steek', (routeInfo) => {
  if (routeInfo.params[0] instanceof User) {
    return `Met plezier, kom hier <@!${(routeInfo.params[0]).id}>!`;
  }
  return 'Lekker';
});

eiNoah.use(Role, ({ params }) => `${params[0]}s zijn gamers`);

// Als een mention als parameter is gebruikt wordt deze functie aangeroepen,
// je kan hiervoor geen Router gebruiken
eiNoah.use(User, (routeInfo) => {
  if (routeInfo.params[0] instanceof User) return `What about ${routeInfo.params[0]}`;
  return null;
});

// Voorbeeld hoe je met user data omgaat
if (process.env.NODE_ENV !== 'production') eiNoah.use('counter', Counter);

eiNoah.use(null, () => {
  const watZegtNoah = ['Ja wat jonge', '**Kabaal** ik zit op de fiets', 'Ik steek je neer', 'Hmm wat zegt noah nog meer', 'Ik laat het aan god over'];

  const zeg = watZegtNoah[Math.floor(Math.random() * watZegtNoah.length)];

  return zeg;
});

eiNoah.use('quote', QuoteRouter);

eiNoah.use('help', () => {
  let message = "**Alle Commando's**";
  message += '\n`ei bday` Laat Ei je verjaardag bijhouden, of vraag die van anderen op';
  message += '\n`ei corona` Krijg iedere morgen een rapportage over de locale corona situatie';
  message += '\n`ei lobby` Maak en beheer een lobby (tijdelijk kanaal)';

  return message;
});

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

eiNoah.start();
