import dotenv from 'dotenv';
import {
  User, Role, PresenceData, MessageAttachment, TextChannel, Permissions, DMChannel, NewsChannel, Channel, Message,
} from 'discord.js';
import { MikroORM } from '@mikro-orm/core';
import { fork } from 'child_process';
import {
  CanvasRenderingContext2D, createCanvas, loadImage,
} from 'canvas';
import { fillTextWithTwemoji, strokeTextWithTwemoji, measureText } from 'node-canvas-with-twemoji-and-discord-emoji';
import { BothHandler, HandlerType } from './router/Router';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';
import Counter from './routes/Counter';
import Birthday from './routes/Birthday';
import QuoteRouter from './routes/QuoteRouter';
import CoronaRouter from './routes/CoronaRouter';

dotenv.config();

const mentionsToText = (params : Array<string | User | Role | Channel | number | boolean>, startAt = 0) : string => {
  const messageArray : string[] = [];
  for (let i = startAt; i < params.length; i += 1) {
    const item = params[i];
    if (typeof item === 'string') {
      messageArray.push(item);
    } else if (item instanceof User) {
      messageArray.push(item.username);
    } else if (item instanceof TextChannel || item instanceof NewsChannel) {
      messageArray.push(item.name);
    } else if (item instanceof Role) {
      messageArray.push(item.name);
    }
  }

  return messageArray.join(' ');
};

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

  function getLines(ctx : CanvasRenderingContext2D, text : string, maxWidth : number) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i += 1) {
      const word = words[i];
      const { width } = measureText(ctx, `${currentLine} ${word}`);
      if (width < maxWidth) {
        currentLine += ` ${word}`;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  const eiImage = loadImage('./src/images/eiNoah.png');
  const knife = loadImage('./src/images/knife.png');
  const blood = loadImage('./src/images/blood.png');

  // Hier is een 'Handler' als argument in principe is dit een eindpunt van de routing.
  // Dit is waar berichten worden afgehandeld
  const stabHandler : BothHandler = async ({ params, msg, flags }) => {
    const persoon = flags.get('persoon');
    const [user] = persoon || params;

    if (user instanceof User) {
      const url = user.avatarURL({ size: 256, dynamic: false, format: 'png' });
      params.shift();
      const message : string = mentionsToText(flags.get('top') || params);

      if (url && (msg.channel instanceof DMChannel || (msg.client.user && msg.channel.permissionsFor(msg.client.user.id)?.has(Permissions.FLAGS.ATTACH_FILES)))) {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        const avatar = await loadImage(url);

        ctx.drawImage(await eiImage, 0, Math.abs((await eiImage).height - canvas.height) / 2);

        const x = 500;
        const y = Math.abs(avatar.height - canvas.height) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + avatar.width / 2, y + avatar.height / 2, avatar.height / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(avatar, x + 0, y + 0, avatar.width, avatar.height);
        ctx.closePath();
        ctx.restore();

        ctx.drawImage(await knife, 0, 0, 600, 760, 200, 70, 400, 500);
        ctx.drawImage(await blood, 450, 220, 300, 300);

        const fontSize = 70;

        ctx.font = `${fontSize}px Calibri`;
        ctx.fillStyle = '#FFFFFF';

        const lines = getLines(ctx, message, 800);

        await Promise.all(lines.map((line, index) => {
          const { width } = measureText(ctx, line);
          return Promise.all([
            fillTextWithTwemoji(ctx, line, Math.abs(canvas.width - width) / 2 + 0.5, 100.5 + (index * fontSize)),
            strokeTextWithTwemoji(ctx, line, Math.abs(canvas.width - width) / 2 + 0.5, 100.5 + (index * fontSize)),
          ]);
        }));

        const bottom = flags.get('b') || flags.get('bottom') || flags.get('bodem');
        if (bottom) {
          let bottomText = mentionsToText(bottom);
          if (bottomText === '') bottomText = 'BODEM TEKST';
          const bottomX = Math.abs(measureText(ctx, bottomText).width - canvas.width) / 2;
          const bottomY = 540;

          await fillTextWithTwemoji(ctx, bottomText, bottomX, bottomY);
          await strokeTextWithTwemoji(ctx, bottomText, bottomX, bottomY);
        }

        return new MessageAttachment(canvas.createPNGStream());
      }

      return `Met plezier, kom hier <@!${user.id}>!`;
    }
    return 'Lekker';
  };

  eiNoah.use('steek', stabHandler, HandlerType.BOTH, {
    description: 'Steek iemand die het verdiend heeft <3',
    options: [
      {
        name: 'persoon',
        description: 'Persoon die je wilt steken',
        type: 'USER',
        required: true,
      }, {
        name: 'top',
        description: 'De tekst die je erbij wil zetten',
        type: 'STRING',
      }, {
        name: 'bottom',
        description: 'De tekst die je erbij wil zetten',
        type: 'STRING',
      },
    ],
  });
  eiNoah.use('stab', stabHandler);

  const hugImg = loadImage('./src/images/hug.png');

  const hugHandler : BothHandler = async ({ params, msg, flags }) => {
    const persoon = flags.get('persoon');
    const [user] = persoon || params;

    if (user instanceof User) {
      const url = user.avatarURL({ size: 256, dynamic: false, format: 'png' });
      params.shift();
      const message : string = mentionsToText(flags.get('top') || params);

      if (url && (msg.channel instanceof DMChannel || (msg.client.user && msg.channel.permissionsFor(msg.client.user.id)?.has(Permissions.FLAGS.ATTACH_FILES)))) {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        const avatar = await loadImage(url);

        ctx.drawImage(await eiImage, Math.abs((await eiImage).width - canvas.width) / 2, Math.abs((await eiImage).height - canvas.height) / 2);

        const x = Math.abs(avatar.width - canvas.width) / 2;
        const y = Math.abs(avatar.height - canvas.height) / 2 + 120;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x + avatar.width / 2, y + avatar.height / 2, avatar.height / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(avatar, x, y, avatar.width, avatar.height);
        ctx.closePath();
        ctx.restore();

        const hug = await hugImg;

        ctx.drawImage(hug, 230, 240, 350, 350);

        const fontSize = 70;

        ctx.font = `${fontSize}px Calibri`;
        ctx.fillStyle = '#FFFFFF';

        const lines = getLines(ctx, message, 800);

        await Promise.all(lines.map((line, index) => {
          const { width } = measureText(ctx, line);
          return Promise.all([
            fillTextWithTwemoji(ctx, line, Math.abs(canvas.width - width) / 2 + 0.5, 100.5 + (index * fontSize)),
            strokeTextWithTwemoji(ctx, line, Math.abs(canvas.width - width) / 2 + 0.5, 100.5 + (index * fontSize)),
          ]);
        }));

        const bottom = flags.get('b') || flags.get('bottom') || flags.get('bodem');
        if (bottom) {
          let bottomText = mentionsToText(bottom);
          if (bottomText === '') bottomText = 'BODEM TEKST';
          const bottomX = Math.abs(measureText(ctx, bottomText).width - canvas.width) / 2;
          const bottomY = 540;

          await fillTextWithTwemoji(ctx, bottomText, bottomX, bottomY);
          await strokeTextWithTwemoji(ctx, bottomText, bottomX, bottomY);
        }

        return new MessageAttachment(canvas.createPNGStream());
      }

      return `Met plezier, kom hier <@!${user.id}>!`;
    }
    return 'Knuffel wie?';
  };

  eiNoah.use('hug', hugHandler, HandlerType.BOTH, {
    description: 'Geef iemand een knuffel die het verdiend heeft <3',
    options: [
      {
        name: 'persoon',
        description: 'Persoon die je een knuffel wil geven',
        required: true,
        type: 'USER',
      }, {
        name: 'top',
        description: 'Zet een leuke tekstje erbij',
        type: 'STRING',
      }, {
        name: 'bottom',
        description: 'Zet een leuk tekstje erbij (maar dan aan de onderkant)',
        type: 'STRING',
      },
    ],
  });
  eiNoah.use('knuffel', hugHandler, HandlerType.BOTH);

  if (process.env.NODE_ENV !== 'production') {
    // Voorbeeld hoe je met user data omgaat
    eiNoah.use('counter', Counter);

    const hasUpdated = false;
    // Update alle slash commands voor development
    eiNoah.use('slash', () => {
      if (hasUpdated) return 'Je hebt de slash commands al geupdate';
      return eiNoah.updateSlashCommands()
        .then((promises) => Promise.all(promises))
        .then(() => 'Slash commands geupdate')
        .catch((err) => {
          console.error(err);
          return 'Er is iets fout gegaan';
        });
    }, HandlerType.BOTH, {
      description: 'Update alle slash commands',
    });
  }

  eiNoah.use('quote', QuoteRouter);

  eiNoah.use('help', () => [
    '**Alle Commando\'s**',
    '`ei bday`: Laat Ei je verjaardag bijhouden, of vraag die van anderen op',
    '`ei corona`: Krijg iedere morgen een rapportage over de locale corona situatie',
    '`ei lobby`: Maak en beheer een lobby (tijdelijk kanaal)',
    '`ei quote` Houd quotes van je makkermaten bij',
    '`ei knuffel <@User> [tekst] [-b bodemtekst]`: Geef iemand een knuffel die het verdiend heeft <3',
    '`ei stab <@User> [tekst] [-b bodemtekst]`: Steek iemand met een mes die het verdiend heeft <3',
  ].join('\n'), HandlerType.BOTH, {
    description: 'Het heerlijke Ei Noah menu, geniet ervan :P)',
  });

  eiNoah.onInit = async (client) => {
    const updatePrecense = () => {
      const watDoetNoah : PresenceData[] = [{
        activities: [{
          name: 'Probeer Niet Te Steken',
          type: 'PLAYING',
        }],
      }, {
        activities: [{
          name: 'Steek Geluiden',
          type: 'LISTENING',
        }],
      }, {
        activities: [{
          name: 'Slash Commands :-0',
          type: 'LISTENING',
        }],
      }];

      const presence = watDoetNoah[Math.floor(Math.random() * watDoetNoah.length)];

      client.user?.setPresence(presence);

      setTimeout(updatePrecense, 1000 * 60);
    };

    updatePrecense();
  };

  eiNoah.use('corona', CoronaRouter);

  eiNoah.use('reply', async ({ msg }) => {
    if (msg instanceof Message) {
      msg.reply('Gaming');
    } else {
      console.log(await msg.fetchReply());
    }

    return null;
  }, HandlerType.BOTH, {
    description: 'Ei replies',
  });

  await eiNoah.start();
})();
