import { CanvasRenderingContext2D, createCanvas, loadImage } from 'canvas';
import { CronJob } from 'cron';
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  BaseGuildTextChannel,
  BaseMessageOptions,
  Client,
  User as DiscordUser,
  EmbedBuilder,
  Guild,
  GuildMember,
  NewsChannel,
  PermissionsBitField,
  Role,
  TextChannel,
} from 'discord.js';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import i18next, { i18n as I18n } from 'i18next';
import moment from 'moment';
import { Logger } from 'winston';

import { DrizzleClient } from '@ei/drizzle';
import { Birthday, birthdays, guilds, guildUsers, users } from '@ei/drizzle/tables/schema';

import Router, {
  BothHandler,
  GuildHandler,
  HandlerType,
} from '../router/Router';

const router = new Router(
  'Laat Ei-Noah je verjaardag bijhouden of vraag die van iemand anders op',
);

const helpHandler: BothHandler = async ({ i18n }) =>
  i18n.t('birthday.help', { joinArrays: '\n' });

router.use('help', helpHandler, HandlerType.BOTH, {
  description: 'Get a help menu',
});

const setRouter: BothHandler = async ({
  user,
  params,
  flags,
  i18n,
  drizzle,
}) => {
  const input = (flags.get('date') || params)
    .filter((item): item is string => typeof item === 'string')
    .join(' ');

  const dbBirthdays = await drizzle
    .select()
    .from(birthdays)
    .where(eq(birthdays.userId, user.id))
    .orderBy(desc(birthdays.createdAt))

  const currentBirthday = dbBirthdays[0];

  if (!input.length) {
    if (!currentBirthday || !currentBirthday.date) return i18n.t('birthday.setHelperAdd');
    return i18n.t('birthday.setHelperChange');
  }

  if (input === 'remove') {
    if (!currentBirthday || !currentBirthday.date) return i18n.t('birthday.error.noBirthday');
    
    await drizzle.insert(birthdays).values({
      userId: user.id,
      date: null,
    })

    return i18n.t('birthday.birthdayRemoved');
  }

  const newBirthday = moment(input, ['DD MM YYYY', 'DD MMMM YYYY'], 'nl');

  if (!newBirthday.isValid()) {
    return i18n.t('birthday.error.niceTry');
  }

  if (newBirthday.isAfter(new Date())) {
    return i18n.t('birthday.error.notInFuture');
  }

  const recentBirthdayChanges = dbBirthdays
    .filter((bday) => bday.date != null && moment(bday.createdAt)
      .isAfter(moment().subtract(3, 'month')));

  if (recentBirthdayChanges.length >= 2) {
    return i18n.t('birthday.error.tooManyRecentChanges');
  }

  await drizzle.insert(birthdays).values({
    userId: user.id,
    date: newBirthday.toISOString(),
  })

  if (currentBirthday && currentBirthday.date != null) {
    return i18n.t('birthday.bdayChanged', {
      changedTo: newBirthday.locale(i18n.language).format('D MMMM YYYY'),
    });
  }
  return i18n.t('birthday.bdayAdded', {
    changedTo: newBirthday.locale(i18n.language).format('D MMMM YYYY'),
  });
};

router.use('set', setRouter, HandlerType.BOTH, {
  description: 'Change or set your birthday',
  options: [
    {
      name: 'date',
      description: 'Your birthday',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
});
router.use('add', setRouter);
router.use('change', setRouter);

const showAll: GuildHandler = async ({ msg, drizzle, i18n }) => {
  const members: GuildMember[] = await msg.guild.members
    .list({ limit: 1000 })
    .then((c) => [...c.values()])
    .catch(() => []);


  const birthdayList = await drizzle
    .selectDistinctOn([birthdays.userId])
    .from(birthdays)
    .where(and(
      isNotNull(birthdays.date),
      inArray(
        birthdays.userId,
        members.map((member) => member.id),
      ),
    ))
    .orderBy(birthdays.userId, desc(birthdays.createdAt));

  const description = birthdayList
    .sort((a, b) => {
      let dayA = moment(a.date).dayOfYear();
      let dayB = moment(b.date).dayOfYear();

      const todayDayOfYear = moment().dayOfYear();

      if (dayA < todayDayOfYear) dayA += 365;
      if (dayB < todayDayOfYear) dayB += 365;

      return dayA - dayB;
    })
    .map(
      (dbBirthday) =>
        `\n${i18n.t('birthday.userIsBornOn', {
          username: members.find((bd) => bd.id === dbBirthday.userId)?.toString(),
          date: moment(dbBirthday.date)
            .locale(i18n.language)
            .format('D MMMM YYYY'),
        })}`,
    );

  return `**${i18n.t('birthday.embedTitleAll')}**${description.join(
    '',
  )}\n> ${i18n.t('birthday.oncomingFirst')}`;
};

router.use('show-all', showAll, HandlerType.GUILD);
router.use('all', showAll, HandlerType.GUILD, {
  description: 'See all birthdays',
});

const showAgeHandler: GuildHandler = async ({ msg, drizzle, i18n }) => {
  const members: GuildMember[] = await msg.guild.members
    .list({ limit: 1000 })
    .then((c) => [...c.values()])
    .catch(() => []);

  const birthdayList = await drizzle
    .selectDistinctOn([birthdays.userId])
    .from(birthdays)
    .where(and(
      isNotNull(birthdays.date),
      inArray(
        birthdays.userId,
        members.map((member) => member.id),
      ),
    ))
    .orderBy(birthdays.userId, desc(birthdays.createdAt));

  if (birthdayList.length === 0) return i18next.t('birthday.noBirthdayRegistered');

  const description = birthdayList
    .sort(
      (a, b) =>
        new Date(a.date || 0).getDate() -
        new Date(b.date || 0).getDate(),
    )
    .map(
      (dbBirthday) =>
        `\n${members.find((m) => m.id === dbBirthday.userId)?.toString()} is ${-moment(
          dbBirthday.date,
        ).diff(moment(), 'years')}`,
    )
    .join('');

  return `**${i18n.t('birthday.embedTitleAge')}**${description}`;
};

router.use('show-age', showAgeHandler, HandlerType.GUILD);
router.use('ages', showAgeHandler, HandlerType.GUILD, {
  description: 'Show everyones birthday',
});

const getBdayEmbed = (
  user: DiscordUser,
  dbBirthday: Birthday | null,
  guild: Guild | null,
  i18n: I18n,
) => {
  const embed = new EmbedBuilder();

  let color = guild?.members.me?.displayColor;

  if (!color || color === 0) color = 0xffcc5f;

  embed.setColor(color);
  embed.setAuthor({
    name: user.username,
    iconURL: user.avatarURL() || undefined,
  });
  embed.setDescription(
    dbBirthday?.date
      ? i18n.t('birthday.userIsBornOnAge', {
          date: moment(dbBirthday.date).format('D MMMM YYYY'),
          yearsOld: moment().diff(moment(dbBirthday.date), 'year'),
        })
      : i18n.t('birthday.noBirthdaySad', { username: user.toString() }),
  );

  return embed;
};

router.use(
  'get',
  async ({ params, msg, flags, i18n, drizzle}) => {
    const [user] = flags.get('user') || params;

    if (!(user instanceof DiscordUser)) {
      return i18n.t('birthday.error.notUser');
    }

    const [dbBirthday] = await drizzle
      .select()
      .from(birthdays)
      .where(eq(birthdays.userId, user.id))
      .orderBy(desc(birthdays.createdAt))

    return { embeds: [getBdayEmbed(user, dbBirthday || null, msg.guild, i18n)] };
  },
  HandlerType.BOTH,
  {
    description: "Get someone's birthday",
    options: [
      {
        name: 'user',
        description: 'The person you want to know the birthday of',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
    ],
  },
);

router.useContext(
  'Get Birthday',
  ApplicationCommandType.User,
  async ({ interaction, i18n, drizzle }) => {
    const discUser = interaction.options.getUser('user', true);

    if (!(discUser instanceof DiscordUser)) {
      return i18n.t('birthday.error.notUser');
    }

    const [dbBirthday] = await drizzle
      .select()
      .from(birthdays)
      .where(eq(birthdays.userId, discUser.id))
      .orderBy(desc(birthdays.createdAt))

    return {
      embeds: [getBdayEmbed(discUser, dbBirthday || null, interaction.guild, i18n)],
      ephemeral: true,
    };
  },
);

router.use(
  'remove',
  async ({ user, i18n, drizzle }) => {
    await drizzle
      .insert(birthdays)
      .values({
        userId: user.id,
        date: null,
      })

    return i18n.t('birthday.birthdayRemoved');
  },
  HandlerType.BOTH,
  {
    description: 'Give Ei-Noah amnosia',
  },
);

const setChannelHandler: GuildHandler = async ({
  msg,
  i18n,
  drizzle,
  getGuild,
}) => {
  if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i18n.t('error.notAdmin');
  }

  const guild = await getGuild(msg.guild);
  const { channel } = msg;

  if (guild.birthdayChannel === channel.id) {
    await drizzle
      .update(guilds)
      .set({ birthdayChannel: null })
      .where(eq(guilds.id, guild.id));

    return i18n.t('birthday.notSelectedAsAnnouncement');
  }

  await drizzle
    .update(guilds)
    .set({ birthdayChannel: msg.channel.id })
    .where(eq(guilds.id, guild.id));
  return i18n.t('birthday.selectedAsAnnouncement');
};

router.use('set-channel', setChannelHandler, HandlerType.GUILD);
router.use('channel', setChannelHandler, HandlerType.GUILD, {
  description:
    'Select/deselect current channel as birthday announcement channel',
});

const setRoleHandler: GuildHandler = async ({
  msg,
  params,
  flags,
  drizzle,
  i18n,
}) => {
  if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i18n.t('error.notAdmin');
  }

  if (
    !msg.guild.members.me?.permissions.has(
      PermissionsBitField.Flags.ManageRoles,
    )
  ) {
    return i18n.t('birthday.error.noGiveRolePermission');
  }

  const [role] = flags.get('role') || params;

  if (role instanceof Role) {
    if (msg.guild.members.me.roles.highest.position > role.position) {
      await drizzle
        .update(guilds)
        .set({ birthdayRole: role.id })
        .where(eq(guilds.id, msg.guild.id));

      return i18n.t('birthday.birthdayRoleSet');
    }

    return i18n.t('birthday.error.givenRoleTooHigh');
  }

  return i18n.t('birthday.error.noRoleGiven');
};

router.use('set-role', setRoleHandler, HandlerType.GUILD);
router.use('role', setRoleHandler, HandlerType.GUILD, {
  description: "User who's birthday it is get this role",
  options: [
    {
      name: 'role',
      type: ApplicationCommandOptionType.Role,
      description: "Role for the one who's birthday it is",
      required: true,
    },
  ],
});

const bdayHatPromise = loadImage('./src/images/bday-hat.png');
const confettiFullPromise = loadImage('./src/images/confetti-full.png');
const confettiCannon = loadImage('./src/images/confetti-cannon.png');
const bdayCake = loadImage('./src/images/bday-cake.png');

const colors = [
  '#C00000',
  '#229954',
  '#1F9ADA',
  '#9B5CB4',
  '#EC1C61',
  '#F4C223',
  '#E97C26',
];

const colorFullText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  _x: number,
  y: number,
) => {
  let x = _x;

  ctx.save();
  text.split('').forEach((letter) => {
    const color = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillStyle = color || '#FFFFFF';
    ctx.fillText(letter, x, y);
    x += ctx.measureText(letter).width;
  });
  ctx.restore();
};

const generateImage = async (
  url: string,
  age: string,
): Promise<AttachmentBuilder> => {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  const fontSize = 180;

  ctx.font = `${fontSize}px 'Arial Black'`;
  ctx.fillStyle = '#FFFFFF';
  colorFullText(
    ctx,
    age,
    (canvas.width - ctx.measureText(age).width) / 2,
    fontSize,
  );

  {
    const avatar = await loadImage(url);

    const width = 256;
    const height = width;

    const x = Math.abs(width - canvas.width) / 2;
    const y = Math.abs(height - canvas.height) / 2 + 50;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, height / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(avatar, x, y, width, height);
    ctx.closePath();
    ctx.restore();
  }

  {
    const hat = await bdayHatPromise;

    const scale = 0.7;
    const width = hat.width * scale;
    const height = (hat.height / hat.width) * width;

    ctx.drawImage(hat, 380, 70, width, height);
  }

  {
    const cake = await bdayCake;

    const scale = 0.45;
    const width = cake.width * scale;
    const height = (cake.height / cake.width) * width;

    ctx.drawImage(
      cake,
      (canvas.width - width) / 2,
      canvas.height - height,
      width,
      height,
    );
  }

  {
    const cannon = await confettiCannon;

    const scale = 1.1;
    const width = cannon.width * scale;
    const height = (cannon.height / cannon.width) * width;

    const x = -210;
    const y = 200;

    ctx.drawImage(cannon, x, y, width, height);

    ctx.save();

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cannon, x, y, width, height);

    ctx.restore();
  }

  {
    const confettiFull = await confettiFullPromise;

    const { width } = canvas;
    const height = (confettiFull.height / confettiFull.width) * width;

    ctx.drawImage(confettiFull, 0, 0, width, height);
  }

  return new AttachmentBuilder(canvas.createPNGStream());
};

if (process.env.NODE_ENV !== 'production') {
  router.use('generate', async ({ params }) => {
    const [user] = params;

    if (!(user instanceof DiscordUser)) return 'Not gaming';
    const url = user.avatarURL({ size: 256, extension: 'png' });
    if (!url) return 'Not url';
    return { files: [await generateImage(url, '22')] };
  });
}

const getMsgOptions = async (
  member: GuildMember,
  channel: BaseGuildTextChannel,
  age: number,
  i18n: I18n,
): Promise<BaseMessageOptions | null> => {
  const url = member.user.avatarURL({ size: 256, extension: 'png' });
  const permissionMissingText = i18n.t('birthday.error.permissionMissing');

  const permissions = member.client.user
    ? channel.permissionsFor(member.client.user)
    : null;

  if (
    !member.client.user ||
    !permissions ||
    !permissions.has(PermissionsBitField.Flags.SendMessages, true)
  ) {
    return null;
  }

  if (url && permissions.has(PermissionsBitField.Flags.AttachFiles, true)) {
    return {
      content:
        member.client.user?.id !== member.user.id
          ? i18n.t('birthday.birthdayMsg', { user: member.user.toString() })
          : i18n.t('birthday.meBirthdayMsg'),
      files: [await generateImage(url, age.toString())],
    };
  }

  if (permissions.has(PermissionsBitField.Flags.EmbedLinks, true)) {
    const embed = new EmbedBuilder();

    let color;
    color = member.guild.members.me?.displayColor;

    if (!color || color === 0) color = 0xffcc5f;

    embed.setColor(color);

    // eslint-disable-next-line max-len
    embed.setAuthor({
      name: member.nickname || member.user.username,
      iconURL: member.user.avatarURL() || undefined,
    });
    embed.setDescription(i18n.t('birthday.birthdayMsgAge', { age }));
    embed.setThumbnail('http://clipart-library.com/images/kcKnBz4Ai.jpg');

    embed.setFooter({ text: permissionMissingText });

    return { embeds: [embed] };
  }

  return {
    content: i18n.t('birthday.birthdayMsgAgeUser', {
      age,
      user: member.user.toString(),
    }),
  };
};

// TODO: Deze functie aanpakken
// Bug: Announcement wordt alleen gegeven wanneer de user met ei-noah heeft interact (in die guild)
// Bug: Announcement wordt alleen gegeven wanneer de server een bday-rol had ingesteld (moet niet verplicht zijn)
// Refactor: If in if in if in if in if
// Refactor: Iets meer van async gebruikmaken
const checkBday = async (
  client: Client,
  drizzle: DrizzleClient,
  _i18n: I18n,
  logger: Logger,
) => {
  const today = moment().startOf('day').locale('nl').format('DD MMMM');
  const currentYear = new Date().getFullYear();

  const birthdayList = await drizzle
    .selectDistinctOn([guildUsers.id])
    .from(guildUsers)
    .innerJoin(guilds, eq(guilds.id, guildUsers.guildId))
    .innerJoin(users, eq(users.id, guildUsers.userId))
    .innerJoin(birthdays, eq(birthdays.userId, guildUsers.userId))
    .where(and(
      isNotNull(birthdays.date),
    ))
    .orderBy(guildUsers.id, desc(birthdays.createdAt));

  await Promise.all(
    birthdayList.map(async (bd) => {
        const discBday = moment(bd.birthday.date).locale('nl').format('DD MMMM');
        const birthYear =
          bd.birthday.date && new Date(bd.birthday.date).getFullYear();
        const isBirthday = today === discBday;
        const age = birthYear ? currentYear - birthYear : 0;

        const [guild, channel] = await Promise.all([
          client.guilds
            .fetch({ guild: bd.guild_user.guildId, cache: true })
            .catch(() => null),
          bd.guild.birthdayChannel
            ? client.channels
                .fetch(bd.guild.birthdayChannel, { cache: true })
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        if (!guild) {
          return;
        }

        const [member, role] = await Promise.all([
          guild.members
            .fetch({ user: bd.guild_user.userId, cache: true })
            .catch(() => null),
          bd.guild.birthdayRole
            ? guild.roles
                .fetch(bd.guild.birthdayRole, { cache: true })
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        // Give or remove birthday role
        if (member && role) {
          if (isBirthday && !member.roles.cache.has(role.id)) {
            member.roles
              .add(role)
              .catch((error) => logger.error(error.description, { error }));
          } else if (!isBirthday && member.roles.cache.has(role.id)) {
            member.roles
              .remove(role)
              .catch((error) => logger.error(error.description, { error }));
          }
        }

        if (
          channel &&
          (channel instanceof TextChannel || channel instanceof NewsChannel)
        ) {
          const birthdayMessage = bd.guild_user.birthdayMsg
            ? await channel.messages
                .fetch({ message: bd.guild_user.birthdayMsg, cache: true })
                .catch(() => null)
            : null;

          // Post the birthday message when it's a member's birthday,
          // when there is already a birthday message only post a new message if the last one can't be deleted
          if (member && isBirthday && !birthdayMessage) {
            const i18n = _i18n.cloneInstance({
              lng: bd.guild.language || bd.user.language || 'nl',
            });
            const options = await getMsgOptions(member, channel, age, i18n);

            if (options) {
              const message = await channel
                .send(options)
                .then((msg) => {
                  if (msg) {
                    const overwrites =
                      client.user && channel.permissionsFor(client.user);

                    if (
                      overwrites &&
                      (overwrites.has(
                        PermissionsBitField.Flags.SendMessagesInThreads,
                      ) ||
                        overwrites.has(
                          PermissionsBitField.Flags.SendMessagesInThreads,
                        ))
                    ) {
                      msg
                        .startThread({
                          name: i18n.t('birthday.congratulations'),
                          autoArchiveDuration: 1440,
                        })
                        .catch(() => {});
                    }
                    return msg.id;
                  }

                  return undefined;
                })
                .catch(() => undefined);

              if (message) {
                await drizzle
                  .update(guildUsers)
                  .set({ birthdayMsg: message })
                  .where(
                    and(
                      eq(guildUsers.guildId, guild.id),
                      eq(guildUsers.userId, bd.user.id),
                    ),
                  );
              }
            } else {
              const owner = await guild.fetchOwner({ cache: true });

              const url =
                member.user.avatarURL({ size: 256, extension: 'png' }) ||
                member.user.defaultAvatarURL;

              const [ownerUser] = await drizzle
                .select()
                .from(users)
                .where(eq(users.id, owner.id));

              await i18n.changeLanguage(ownerUser?.language || undefined);

              owner
                .send({
                  content: i18n.t(
                    'birthday.error.noSendPermission',
                    channel.toString(),
                  ),
                  files: [await generateImage(url, age.toString())],
                })
                .catch(() => {});
            }
            // If there is a birthday message delete it if the message is deletable and when it's not the members birthday or if the member left the server
          } else if (birthdayMessage && !(isBirthday && member)) {
            birthdayMessage.delete().catch(() => {});

            await drizzle
              .update(guildUsers)
              .set({ birthdayMsg: null })
              .where(
                and(
                  eq(guildUsers.guildId, guild.id),
                  eq(guildUsers.userId, bd.user.id),
                ),
              );
          }
        }
    }),
  );
};

if (process.env.NODE_ENV !== 'production') {
  router.use(
    'check',
    async ({ drizzle, msg, i18n, logger }) => {
      const { client } = msg;
      await checkBday(client, drizzle, i18n, logger);

      return 'Ohko';
    },
    HandlerType.BOTH,
    {
      description: 'Check all birthdays',
    },
  );
}

router.onInit = async (client, drizzle, i18n, logger) => {
  const offset = new Date().getTimezoneOffset();
  logger.info(`Offset in minutes: ${offset}`);

  await checkBday(client, drizzle, i18n, logger);

  const reportCron = new CronJob('5 0 0 * * *', async () => {
    await checkBday(client, drizzle, i18n, logger);
  });

  reportCron.start();
};

export default router;
