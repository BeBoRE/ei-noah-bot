import dotenv from 'dotenv';
import {
  User, Role, PresenceData,
} from 'discord.js';
import { MikroORM } from '@mikro-orm/core';
import { fork } from 'child_process';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';
import Counter from './routes/Counter';
import Birthday from './routes/Birthday';
import QuoteRouter from './routes/QuoteRouter';
import CoronaRouter from './routes/CoronaRouter';

dotenv.config();

(async () => {
  if (!process.env.CLIENT_TOKEN) throw new Error('Add a client token');

  // Creëerd de database connectie
  const orm = await MikroORM.init().catch((err) => { console.error(err); process.exit(-1); });
  await orm.getMigrator().up();

  const child = fork('./src/child.ts');
  child.on('message', (msg) => console.log(msg));

  const eiNoah = new EiNoah(process.env.CLIENT_TOKEN, orm);

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
  eiNoah.use('qoute', QuoteRouter);

  eiNoah.use('help', () => [
    '**Alle Commando\'s**',
    '`ei bday`: Laat Ei je verjaardag bijhouden, of vraag die van anderen op',
    '`ei corona`: Krijg iedere morgen een rapportage over de locale corona situatie',
    '`ei lobby`: Maak en beheer een lobby (tijdelijk kanaal)',
    '`ei quote` Houd quotes van je makkermaten bij',
  ].join('\n'));

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

  await eiNoah.start();
})();
