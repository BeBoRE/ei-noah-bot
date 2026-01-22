import { lstatSync, readdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { CanvasRenderingContext2D, createCanvas, loadImage } from 'canvas';
import { CronJob } from 'cron';
import {
  ActivityType,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  Channel,
  DMChannel,
  NewsChannel,
  PermissionsBitField,
  PresenceData,
  Role,
  TextChannel,
  ThreadChannel,
  User,
} from 'discord.js';
import dotenv from 'dotenv';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import {
  fillTextWithTwemoji,
  measureText,
  strokeTextWithTwemoji,
} from 'node-canvas-with-twemoji-and-discord-emoji';

import { getDrizzleClient, isNotNull } from '@ei/drizzle';
import { guilds } from '@ei/drizzle/tables/schema';

import { generateNewYearImage } from './canvas/newYear';
import EiNoah from './EiNoah';
import { loginHandler } from './handler/login';
import logger from './logger';
import { BothHandler, HandlerType } from './router/Router';
import Birthday from './routes/Birthday';
import LobbyRouter from './routes/LobbyRouter';
import LocaleRouter from './routes/Locale';
import QuoteRouter from './routes/QuoteRouter';
import rolesRouter from './routes/Roles/RoleRouter';

dotenv.config();

const mentionsToText = (
  params: Array<string | User | Role | Channel | number | boolean>,
  startAt = 0,
): string => {
  const messageArray: string[] = [];
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

process.title = 'Ei Noah Bot';

(async () => {
  if (!process.env.CLIENT_TOKEN)
    throw new Error("Add bot's token to CLIENT_TOKEN");

  // Creëerd de database connectie
  const drizzle = await getDrizzleClient();

  const preloadLanguages = readdirSync(join(__dirname, '../locales')).filter(
    (fileName) => {
      const joinedPath = join(join(__dirname, '../locales'), fileName);
      const isDirectory = lstatSync(joinedPath).isDirectory();
      return isDirectory;
    },
  );

  i18next.use(Backend).init(
    {
      initImmediate: false,
      fallbackLng: ['en', 'nl'],
      lng: 'en',
      preload: preloadLanguages,
      interpolation: {
        escapeValue: false,
        escape: (str) => str,
      },
      backend: {
        loadPath: join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
      },
    },
    (err) => err && logger.error({ err }),
  );

  const eiNoah = new EiNoah(process.env.CLIENT_TOKEN, drizzle, i18next, logger);

  eiNoah.use(
    'help',
    ({ i18n }) => i18n.t('index.help', { joinArrays: '\n' }),
    HandlerType.BOTH,
    {
      description: 'Het heerlijke Ei Noah menu, geniet ervan :P)',
    },
  );

  eiNoah.use('login', loginHandler, HandlerType.BOTH, {
    description: 'Login with a magic token',
  });

  // LobbyRouter wordt gebruikt wanneer mensen "ei lobby" aanroepen
  eiNoah.use('lobby', LobbyRouter);

  // Voor verjaardag handeling
  eiNoah.use('bday', Birthday);

  function getLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i += 1) {
      const word = words[i];
      const { width } = measureText(
        ctx as CanvasRenderingContext2D,
        `${currentLine} ${word}`,
      );
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

  const generateStab = async (url: string, top?: string, bottom?: string) => {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    const avatar = await loadImage(url);
    const avatarWidth = 256;
    const avatarHeight = avatarWidth;

    ctx.drawImage(
      await eiImage,
      0,
      Math.abs((await eiImage).height - canvas.height) / 2,
    );

    const x = 500;
    const y = Math.abs(avatarWidth - canvas.height) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      x + avatarWidth / 2,
      y + avatarHeight / 2,
      avatarHeight / 2,
      0,
      Math.PI * 2,
      true,
    );
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(avatar, x + 0, y + 0, avatarWidth, avatarHeight);
    ctx.closePath();
    ctx.restore();

    ctx.drawImage(await knife, 0, 0, 600, 760, 200, 70, 400, 500);
    ctx.drawImage(await blood, 450, 220, 300, 300);

    const fontSize = 70;

    ctx.font = `${fontSize}px Calibri`;
    ctx.fillStyle = '#FFFFFF';

    if (top) {
      const lines = getLines(ctx, top, 800);

      await Promise.all(
        lines.map((line, index) => {
          if (!line) return Promise.resolve();

          const { width } = measureText(ctx, line);
          return Promise.all([
            fillTextWithTwemoji(
              ctx,
              line,
              Math.abs(canvas.width - width) / 2 + 0.5,
              100.5 + index * fontSize,
            ),
            strokeTextWithTwemoji(
              ctx,
              line,
              Math.abs(canvas.width - width) / 2 + 0.5,
              100.5 + index * fontSize,
            ),
          ]);
        }),
      );
    }

    if (bottom) {
      const bottomX =
        Math.abs(measureText(ctx, bottom).width - canvas.width) / 2;
      const bottomY = 540;

      await fillTextWithTwemoji(ctx, bottom, bottomX, bottomY);
      await strokeTextWithTwemoji(ctx, bottom, bottomX, bottomY);
    }

    return new AttachmentBuilder(canvas.createPNGStream());
  };

  // Hier is een 'Handler' als argument in principe is dit een eindpunt van de routing.
  // Dit is waar berichten worden afgehandeld
  const stabHandler: BothHandler = async ({ params, msg, flags, i18n }) => {
    const persoon = flags.get('persoon');
    const [user] = persoon || params;

    if (user instanceof User) {
      const url = user.displayAvatarURL({ size: 256, extension: 'png' });
      params.shift();
      const message: string = mentionsToText(flags.get('top') || params);

      if (
        url &&
        (msg.channel instanceof DMChannel ||
          (msg.client.user &&
            msg.channel
              .permissionsFor(msg.client.user.id)
              ?.has(PermissionsBitField.Flags.AttachFiles)))
      ) {
        const bottom = flags.get('bottom') || flags.get('b');
        return {
          files: [
            await generateStab(
              url,
              message,
              bottom ? mentionsToText(bottom) : undefined,
            ),
          ],
        };
      }

      return i18n.t('index.withPleasure', { user: user.toString() });
    }
    return i18n.t('index.who');
  };

  eiNoah.use('stab', stabHandler, HandlerType.BOTH, {
    description: 'Stab someone that deserves it <3',
    options: [
      {
        name: 'persoon',
        description: 'Person you want to stab',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'top',
        description: 'Text you want to add to the top',
        type: ApplicationCommandOptionType.String,
      },
      {
        name: 'bottom',
        description: 'Text you want to add to the bottom',
        type: ApplicationCommandOptionType.String,
      },
    ],
  });
  eiNoah.use('steek', stabHandler);

  eiNoah.useContext(
    'Stab',
    ApplicationCommandType.User,
    async ({ interaction, i18n }) => {
      const userOption = interaction.options.get('user', true);

      if (!userOption.user) return i18n.t('index.who');

      const url = userOption.user.displayAvatarURL({
        size: 256,
        extension: 'png',
      });

      if (url) {
        if (
          interaction.channel instanceof DMChannel ||
          ((interaction.channel instanceof TextChannel ||
            interaction.channel instanceof ThreadChannel ||
            interaction.channel instanceof NewsChannel) &&
            interaction.client.user &&
            interaction.channel
              .permissionsFor(interaction.client.user)
              ?.has(PermissionsBitField.Flags.AttachFiles, true) &&
            interaction.channel
              .permissionsFor(interaction.client.user)
              ?.has(PermissionsBitField.Flags.SendMessages, true))
        ) {
          return { files: [await generateStab(url)], ephemeral: false };
        }
      }

      return i18n.t('index.withPleasure', { user: userOption });
    },
  );

  const hugImg = loadImage('./src/images/hug.png');
  const generateHug = async (
    url: string,
    topText?: string,
    bottomText?: string,
  ) => {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    const avatar = await loadImage(url);
    const avatarWidth = 256;
    const avatarHeight = avatarWidth;

    ctx.drawImage(
      await eiImage,
      Math.abs((await eiImage).width - canvas.width) / 2,
      Math.abs((await eiImage).height - canvas.height) / 2,
    );

    const x = Math.abs(avatarWidth - canvas.width) / 2;
    const y = Math.abs(avatarHeight - canvas.height) / 2 + 120;

    ctx.save();
    ctx.beginPath();
    ctx.arc(
      x + avatarWidth / 2,
      y + avatarHeight / 2,
      avatarHeight / 2,
      0,
      Math.PI * 2,
      true,
    );
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(avatar, x, y, avatarWidth, avatarHeight);
    ctx.closePath();
    ctx.restore();

    const hug = await hugImg;

    ctx.drawImage(hug, 230, 240, 350, 350);

    const fontSize = 70;

    ctx.font = `${fontSize}px Calibri`;
    ctx.fillStyle = '#FFFFFF';

    if (topText) {
      const lines = getLines(ctx, topText, 800);

      await Promise.all(
        lines.map((line, index) => {
          if (!line) return Promise.resolve();

          const { width } = measureText(ctx, line);
          return Promise.all([
            fillTextWithTwemoji(
              ctx,
              line,
              Math.abs(canvas.width - width) / 2 + 0.5,
              100.5 + index * fontSize,
            ),
            strokeTextWithTwemoji(
              ctx,
              line,
              Math.abs(canvas.width - width) / 2 + 0.5,
              100.5 + index * fontSize,
            ),
          ]);
        }),
      );
    }

    if (bottomText) {
      const bottomX =
        Math.abs(measureText(ctx, bottomText).width - canvas.width) / 2;
      const bottomY = 540;

      await fillTextWithTwemoji(ctx, bottomText, bottomX, bottomY);
      await strokeTextWithTwemoji(ctx, bottomText, bottomX, bottomY);
    }

    return new AttachmentBuilder(canvas.createPNGStream());
  };

  const hugHandler: BothHandler = async ({ params, msg, flags, i18n }) => {
    const persoon = flags.get('persoon');
    const [user] = persoon || params;

    if (user instanceof User) {
      const url = user.displayAvatarURL({ size: 256, extension: 'png' });
      params.shift();
      const message: string = mentionsToText(flags.get('top') || params);

      if (
        url &&
        (msg.channel instanceof DMChannel ||
          (msg.client.user &&
            msg.channel
              .permissionsFor(msg.client.user.id)
              ?.has(PermissionsBitField.Flags.AttachFiles)))
      ) {
        const bottom = flags.get('bottom') || flags.get('b');
        return {
          files: [
            await generateHug(
              url,
              message,
              bottom ? mentionsToText(bottom) : undefined,
            ),
          ],
        };
      }

      return i18n.t('index.withPleasure', { user });
    }
    return i18n.t('index.who');
  };

  eiNoah.useContext(
    'Hug',
    ApplicationCommandType.User,
    async ({ interaction, i18n }) => {
      const userOption = interaction.options.get('user', true);

      if (!userOption.user) return i18n.t('index.who');

      const url = userOption.user.displayAvatarURL({
        size: 256,
        extension: 'png',
      });

      if (url) {
        if (
          interaction.channel instanceof DMChannel ||
          ((interaction.channel instanceof TextChannel ||
            interaction.channel instanceof ThreadChannel ||
            interaction.channel instanceof NewsChannel) &&
            interaction.client.user &&
            interaction.channel
              .permissionsFor(interaction.client.user)
              ?.has(PermissionsBitField.Flags.AttachFiles, true) &&
            interaction.channel
              .permissionsFor(interaction.client.user)
              ?.has(PermissionsBitField.Flags.SendMessages, true))
        ) {
          return { files: [await generateHug(url)], ephemeral: false };
        }
      }

      return i18n.t('index.withPleasure', { user: userOption });
    },
  );

  eiNoah.use('hug', hugHandler, HandlerType.BOTH, {
    description: 'Give someone a hug that deserves it <3',
    options: [
      {
        name: 'persoon',
        description: 'Person you want to hug',
        required: true,
        type: ApplicationCommandOptionType.User,
      },
      {
        name: 'top',
        description: 'Text you want to add to the top',
        type: ApplicationCommandOptionType.String,
      },
      {
        name: 'bottom',
        description: 'Text you want to add to the bottom',
        type: ApplicationCommandOptionType.String,
      },
    ],
  });
  eiNoah.use('knuffel', hugHandler, HandlerType.BOTH);

  if (process.env.NODE_ENV !== 'production') {
    const hasUpdated = false;
    // Update alle slash commands voor development
    eiNoah.use(
      'slash',
      async () => {
        if (hasUpdated) return 'Je hebt de slash commands al geupdate';

        // Check if global commands are already set and if so deletes them
        const hasGlobalCommands = !!(
          await eiNoah.client.application?.commands.fetch()
        )?.size;
        if (hasGlobalCommands) eiNoah.client.application?.commands.set([]);

        return eiNoah
          .updateSlashCommands()
          .then((promises) => Promise.all(promises))
          .then(() => 'Slash commands geupdate')
          .catch((err) => {
            logger.error('Slash Command Error', { err });
            return 'Er is iets fout gegaan';
          });
      },
      HandlerType.BOTH,
      {
        description: 'Update alle slash commands',
      },
    );
  }

  eiNoah.use('quote', QuoteRouter);

  eiNoah.use('locale', LocaleRouter);

  eiNoah.use('roles', rolesRouter);

  eiNoah.onInit = async (client) => {
    const updatePrecense = () => {
      const watDoetNoah: PresenceData[] = [
        {
          activities: [
            {
              name: 'Trying not to stab',
              type: ActivityType.Playing,
            },
          ],
        },
        {
          activities: [
            {
              name: 'Stabbing sounds',
              type: ActivityType.Listening,
            },
          ],
        },
        {
          activities: [
            {
              name: 'Slash Commands',
              type: ActivityType.Listening,
            },
          ],
        },
        {
          activities: [
            {
              name: "Context Menu's",
              type: ActivityType.Listening,
            },
          ],
        },
        {
          activities: [
            {
              name: 'Button Presses',
              type: ActivityType.Listening,
            },
          ],
        },
      ];

      const presence =
        watDoetNoah[Math.floor(Math.random() * watDoetNoah.length)];

      if (presence) client.user?.setPresence(presence);

      setTimeout(updatePrecense, 1000 * 60);
    };

    updatePrecense();

    const sintpfpCron = new CronJob(
      '00 12 17 10 *',
      async () => {
        const avatar = await readFile('./avatars/sinter-ei.png').catch(
          (err) => {
            logger.error('Cannot change avatar', { err });
            return null;
          },
        );

        if (client.user && avatar) {
          client.user
            .edit({ avatar, username: 'ei Sint' })
            .then(async () => {
              const guildList = await drizzle
                .select()
                .from(guilds)
                .where(isNotNull(guilds.birthdayChannel));

              return Promise.all(
                guildList.map((guild) => {
                  if (!guild.birthdayChannel) return null;

                  return client.channels
                    .fetch(guild.birthdayChannel, { cache: true })
                    .then<unknown>((channel) => {
                      if (channel === null || !channel.isSendable()) {
                        return Promise.resolve(null);
                      }

                      return channel.send({
                        content:
                          'Ik heb mijzelf in een sinter-ei veranderd, grote onthulling!\n\nIk ben ei Sint!!',
                        files: [avatar],
                      });
                    });
                }),
              );
            })
            .catch((err) => logger.error({ err }));
        }
      },
      null,
      false,
      'Europe/Amsterdam',
    );

    const santaCron = new CronJob(
      '00 12 6 11 *',
      async () => {
        const avatar = await readFile('./avatars/santa-ei.png').catch((err) => {
          logger.error({ err });
          return null;
        });

        if (client.user && avatar) {
          client.user
            .edit({ avatar, username: 'ei Kerst' })
            .then(async () => {
              const guildList = await drizzle
                .select()
                .from(guilds)
                .where(isNotNull(guilds.birthdayChannel));

              return Promise.all(
                guildList.map((guild) => {
                  if (!guild.birthdayChannel) return null;

                  return client.channels
                    .fetch(guild.birthdayChannel, { cache: true })
                    .then<unknown>((channel) => {
                      if (channel === null || !channel.isSendable()) {
                        return Promise.resolve(null);
                      }

                      return channel.send({
                        content: 'Ringel mijn bellen! Ik ben ei Kerst!',
                        files: [avatar],
                      });
                    });
                }),
              );
            })
            .catch((err) => logger.error({ err }));
        }
      },
      null,
      false,
      'Europe/Amsterdam',
    );

    const newYearCron = new CronJob('0 0 1 0 *', async () => {
      const avatar = await readFile('./avatars/ei.png').catch((err) => {
        logger.error({ err });
        return null;
      });

      if (avatar) {
        client.user
          ?.edit({ avatar, username: 'Ei Noah' })
          .catch((err) => logger.error({ err }));
      }

      const year = new Date().getFullYear();

      const attachment = await generateNewYearImage(year);

      const guildList = await drizzle
        .select()
        .from(guilds)
        .where(isNotNull(guilds.birthdayChannel));

      return Promise.all(
        guildList.map((guild) => {
          if (!guild.birthdayChannel) return null;

          return client.channels
            .fetch(guild.birthdayChannel, { cache: true })
            .then<unknown>((channel) => {
              if (channel === null || !channel.isSendable()) {
                return Promise.resolve(null);
              }

              return channel.send({
                content: `Gelukkig nieuw jaar!`,
                files: [attachment],
              });
            });
        }),
      );
    });

    newYearCron.start();
    santaCron.start();
    sintpfpCron.start();
  };

  await eiNoah.start();
})();
