import moment from 'moment';
import { CronJob } from 'cron';
import {
  BaseGuildTextChannel,
  Client,
  Guild,
  GuildMember,
  MessageAttachment,
  Embed,
  MessageOptions,
  NewsChannel,
  PermissionsBitField, Role, TextChannel,
  User as DiscordUser,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from 'discord.js';
import { EntityManager } from '@mikro-orm/postgresql';
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
import i18next, { i18n as I18n } from 'i18next';
import { Logger } from 'winston';
import { User } from '../entity/User';
import Router, { BothHandler, GuildHandler, HandlerType } from '../router/Router';

const router = new Router('Laat Ei-Noah je verjaardag bijhouden of vraag die van iemand anders op');

const helpHandler : BothHandler = async ({ i18n }) => i18n.t('birthday.help', { joinArrays: '\n' });

router.use('help', helpHandler, HandlerType.BOTH, {
  description: 'Get a help menu',
});

const setRouter : BothHandler = async ({
  user, params, flags, i18n,
}) => {
  const input = (flags.get('date') || params)
    .filter((item) : item is string => typeof (item) === 'string')
    .join(' ');

  if (!input.length) {
    if (!user.birthday) return i18n.t('birthday.setHelperAdd');
    return i18n.t('birthday.setHelperChange');
  }

  const birthday = moment(input, ['DD MM YYYY', 'DD MMMM YYYY'], 'nl');

  if (!birthday.isValid()) { return i18n.t('birthday.error.niceTry'); }

  if (birthday.isAfter(new Date())) {
    return i18n.t('birthday.error.notInFuture');
  }

  // eslint-disable-next-line no-param-reassign
  user.birthday = birthday.toDate();

  if (user.birthday != null) {
    return i18n.t('birthday.bdayChanged', { changedTo: birthday.locale(i18n.language).format('D MMMM YYYY') });
  }
  return i18n.t('birthday.bdayAdded', { changedTo: birthday.locale(i18n.language).format('D MMMM YYYY') });
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

const showAll : GuildHandler = async ({ msg, em, i18n }) => {
  const members : GuildMember[] = await msg.guild.members.list({ limit: 1000 }).then((c) => [...c.values()]).catch(() => []);
  const users = await em.find(User, { $not: { birthday: null }, id: { $in: members.map((member) => member.id) } });

  const description = users
    .sort((a, b) => {
      let dayA = moment(a.birthday).dayOfYear();
      let dayB = moment(b.birthday).dayOfYear();

      const todayDayOfYear = moment().dayOfYear();

      if (dayA < todayDayOfYear) dayA += 365;
      if (dayB < todayDayOfYear) dayB += 365;

      return dayA - dayB;
    })
    .map((dbUser) => `\n${i18n.t('birthday.userIsBornOn', { username: members.find((u) => u.id === dbUser.id)?.toString(), date: moment(dbUser.birthday).locale(i18n.language).format('D MMMM YYYY') })}`);

  return `**${i18n.t('birthday.embedTitleAll')}**${description.join('')}\n> ${i18n.t('birthday.oncomingFirst')}`;
};

router.use('show-all', showAll, HandlerType.GUILD);
router.use('all', showAll, HandlerType.GUILD, {
  description: 'See all birthdays',
});

const showAgeHandler : GuildHandler = async ({ msg, em, i18n }) => {
  const members : GuildMember[] = await msg.guild.members.list({ limit: 1000 }).then((c) => [...c.values()]).catch(() => []);
  const users = await em.find(User, { $not: { birthday: null }, id: { $in: members.map((member) => member.id) } });

  if (users.length === 0) return i18next.t('birthday.noBirthdayRegistered');

  const description = users
    .sort((a, b) => (a.birthday?.valueOf() || 0) - (b.birthday?.valueOf() || 0))
    .map((dbUser) => `\n${members.find((m) => m.id === dbUser.id)?.toString()} is ${-moment(dbUser.birthday).diff(moment(), 'years')}`)
    .join('');

  return `**${i18n.t('birthday.embedTitleAge')}**${description}`;
};

router.use('show-age', showAgeHandler, HandlerType.GUILD);
router.use('ages', showAgeHandler, HandlerType.GUILD, {
  description: 'Show everyones birthday',
});

const getBdayEmbed = (user : DiscordUser, dbUser : User, guild : Guild | null, i18n : I18n) => {
  const embed = new Embed();

  let color = guild?.me?.displayColor;

  if (!color || color === 0) color = 0xffcc5f;

  embed.setColor(color);
  embed.setAuthor({ name: user.username, iconURL: user.avatarURL() || undefined });
  embed.setDescription(dbUser.birthday ? i18n.t('birthday.userIsBornOnAge', { date: moment(dbUser.birthday).format('D MMMM YYYY'), yearsOld: moment().diff(moment(dbUser.birthday), 'year') }) : i18n.t('birthday.noBirthdaySad', { username: user.toString() }));

  return embed;
};

router.use('get', async ({
  params, msg, flags, i18n, getUser,
}) => {
  const [user] = flags.get('user') || params;

  if (!(user instanceof DiscordUser)) {
    return i18n.t('birthday.error.notUser');
  }

  const dbUser = await getUser(user);

  return { embeds: [getBdayEmbed(user, dbUser, msg.guild, i18n)] };
}, HandlerType.BOTH, {
  description: 'Get someone\'s birthday',
  options: [{
    name: 'user',
    description: 'The person you want to know the birthday of',
    type: ApplicationCommandOptionType.User,
    required: true,
  }],
});

router.useContext('Get Birthday', ApplicationCommandType.User, async ({
  interaction, i18n, user, getUser,
}) => {
  const discUser = interaction.options.getUser('user', true);

  if (!(discUser instanceof DiscordUser)) {
    return i18n.t('birthday.error.notUser');
  }

  const dbUser = discUser.id === user.id ? user : await getUser(discUser);

  return { embeds: [getBdayEmbed(discUser, dbUser, interaction.guild, i18n)], ephemeral: true };
});

router.use('remove', async ({ user, i18n }) => {
  // eslint-disable-next-line no-param-reassign
  user.birthday = undefined;
  return i18n.t('birthday.birthdayRemoved');
}, HandlerType.BOTH, {
  description: 'Give Ei-Noah amnosia',
});

const setChannelHandler : GuildHandler = async ({ guildUser, msg, i18n }) => {
  if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i18n.t('error.notAdmin');
  }

  const guild = await guildUser.guild.init();
  const { channel } = msg;

  if (guild.birthdayChannel === channel.id) {
    guild.birthdayChannel = undefined;
    return i18n.t('birthday.notSelectedAsAnnouncement');
  }

  guild.birthdayChannel = channel.id;
  return i18n.t('birthday.selectedAsAnnouncement');
};

router.use('set-channel', setChannelHandler, HandlerType.GUILD);
router.use('channel', setChannelHandler, HandlerType.GUILD, {
  description: 'Select/deselect current channel as birthday announcement channel',
});

const setRoleHandler : GuildHandler = async ({
  guildUser, msg, params, flags, i18n,
}) => {
  if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return i18n.t('error.notAdmin');
  }

  if (!msg.guild.me?.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return i18n.t('birthday.error.noGiveRolePermission');
  }

  const [role] = flags.get('role') || params;

  const guild = await guildUser.guild.init();

  if (role instanceof Role) {
    if (msg.guild && msg.guild.me && msg.guild?.me?.roles.highest.position > role.position) {
      guild.birthdayRole = role.id;
      return i18n.t('birthday.birthdayRoleSet');
    }

    return i18n.t('birthday.error.givenRoleTooHigh');
  }

  return i18n.t('birthday.error.noRoleGiven');
};

router.use('set-role', setRoleHandler, HandlerType.GUILD);
router.use('role', setRoleHandler, HandlerType.GUILD, {
  description: 'User who\'s birthday it is get this role',
  options: [{
    name: 'role',
    type: ApplicationCommandOptionType.Role,
    description: 'Role for the one who\'s birthday it is',
    required: true,
  }],
});

const bdayHatPromise = loadImage('./src/images/bday-hat.png');
const confettiFullPromise = loadImage('./src/images/confetti-full.png');
const confettiCannon = loadImage('./src/images/confetti-cannon.png');
const bdayCake = loadImage('./src/images/bday-cake.png');

const colors = ['#C00000', '#229954', '#1F9ADA', '#9B5CB4', '#EC1C61', '#F4C223', '#E97C26'];

const colorFullText = (ctx : CanvasRenderingContext2D, text : string, _x : number, y : number) => {
  let x = _x;

  ctx.save();
  text.split('').forEach((letter) => {
    const color = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillStyle = color;
    ctx.fillText(letter, x, y);
    x += ctx.measureText(letter).width;
  });
  ctx.restore();
};

const generateImage = async (url : string, age : string) : Promise<MessageAttachment> => {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  const fontSize = 180;

  ctx.font = `${fontSize}px 'Arial Black'`;
  ctx.fillStyle = '#FFFFFF';
  colorFullText(ctx, age, (canvas.width - ctx.measureText(age).width) / 2, fontSize);

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

    ctx.drawImage(cake, (canvas.width - width) / 2, canvas.height - height, width, height);
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

  return new MessageAttachment(canvas.createPNGStream());
};

if (process.env.NODE_ENV !== 'production') {
  router.use('generate', ({ params }) => {
    const [user] = params;

    if (!(user instanceof DiscordUser)) return 'Not gaming';
    const url = user.avatarURL({ size: 256, extension: 'png' });
    if (!url) return 'Not url';
    return generateImage(url, '22');
  });
}

const getMsgOptions = async (member : GuildMember, channel : BaseGuildTextChannel, age : number, i18n : I18n) : Promise<MessageOptions | null> => {
  const url = member.user.avatarURL({ size: 256, extension: 'png' });
  const permissionMissingText = i18n.t('birthday.error.permissionMissing');

  const permissions = member.client.user ? channel.permissionsFor(member.client.user) : null;

  if (!member.client.user || !permissions || !permissions.has(PermissionsBitField.Flags.SendMessages, true)) { return null; }

  if (url && permissions.has(PermissionsBitField.Flags.AttachFiles, true)) {
    return {
      content: member.client.user?.id !== member.user.id ? i18n.t('birthday.birthdayMsg', { user: member.user.toString() }) : i18n.t('birthday.meBirthdayMsg'),
      files: [await generateImage(url, age.toString())],
    };
  }

  if (permissions.has(PermissionsBitField.Flags.EmbedLinks, true)) {
    const embed = new Embed();

    let color;
    color = member.guild.me?.displayColor;

    if (!color || color === 0) color = 0xffcc5f;

    embed.setColor(color);

    // eslint-disable-next-line max-len
    embed.setAuthor({ name: member.nickname || member.user.username, iconURL: member.user.avatarURL() || undefined });
    embed.setDescription(i18n.t('birthday.birthdayMsgAge', { age }));
    embed.setThumbnail('http://clipart-library.com/images/kcKnBz4Ai.jpg');

    embed.setFooter({ text: permissionMissingText });

    return { embeds: [embed] };
  }

  return { content: i18n.t('birthday.birthdayMsgAgeUser', { age, user: member.user.toString() }) };
};

// TODO: Deze functie aanpakken
// Bug: Announcement wordt alleen gegeven wanneer de user met ei-noah heeft interact (in die guild)
// Bug: Announcement wordt alleen gegeven wanneer de server een bday-rol had ingesteld (moet niet verplicht zijn)
// Refactor: If in if in if in if in if
// Refactor: Iets meer van async gebruikmaken
const checkBday = async (client : Client, em : EntityManager, _i18n : I18n, logger : Logger) => {
  const today = moment().startOf('day').locale('nl').format('DD MMMM');
  const currentYear = (new Date()).getFullYear();

  const users = await em.find(User, { $not: { birthday: null } }, ['guildUsers', 'guildUsers.guild']);
  const discUsers = (await Promise.all(users.map((u) => client.users.fetch(`${BigInt(u.id)}`, { cache: true }).catch(() => null))))
    .filter((user) : user is DiscordUser => !!user);

  await Promise.all(discUsers.map(async (du) => {
    const user = users.find((u) => u.id === du.id);
    if (user) {
      const discBday = moment(user?.birthday).locale('nl').format('DD MMMM');
      const birthYear = user?.birthday?.getFullYear();
      const isBirthday = today === discBday;
      const age = birthYear ? currentYear - birthYear : 0;

      await Promise.all(user.guildUsers.getItems().map(async (gu) => {
        const [guild, channel] = await Promise.all([
          client.guilds.fetch({ guild: gu.guild.id, cache: true }).catch(() => null),
          gu.guild.birthdayChannel ? client.channels.fetch(gu.guild.birthdayChannel, { cache: true }).catch(() => null) : Promise.resolve(null),
        ]);

        if (guild) {
          const [member, role] = await Promise.all([
            guild.members.fetch({ user: gu.user.id, cache: true }).catch(() => null),
            gu.guild.birthdayRole ? guild.roles.fetch(gu.guild.birthdayRole, { cache: true }).catch(() => null) : Promise.resolve(null),
          ]);

          // Give or remove birthday role
          if (member && role) {
            if (isBirthday && !member.roles.cache.has(role.id)) {
              member.roles.add(role).catch((error) => logger.error(error.description, { error }));
            } else if (!isBirthday && member.roles.cache.has(role.id)) {
              member.roles.remove(role).catch((error) => logger.error(error.description, { error }));
            }
          }

          if (channel && (channel instanceof TextChannel || channel instanceof NewsChannel)) {
            const birthdayMessage = gu.birthdayMsg ? await channel.messages.fetch(gu.birthdayMsg, { cache: true }).catch(() => null) : null;

            // Post the birthday message when it's a member's birthday,
            // when there is already a birthday message only post a new message if the last one can't be deleted
            if (member && isBirthday && !birthdayMessage) {
              const i18n = _i18n.cloneInstance({ lng: gu.guild.language || user.language || 'nl' });
              const options = await getMsgOptions(member, channel, age, i18n);

              if (options) {
                // eslint-disable-next-line no-param-reassign
                gu.birthdayMsg = await channel.send(options)
                  .then((msg) => {
                    if (msg) {
                      const overwrites = client.user && channel.permissionsFor(client.user);

                      if (overwrites && (overwrites.has(PermissionsBitField.Flags.SendMessagesInThreads) || overwrites.has(PermissionsBitField.Flags.SendMessagesInThreads))) {
                        msg.startThread({ name: i18n.t('birthday.congratulations'), autoArchiveDuration: 1440 }).catch(() => {});
                      }
                      return msg.id;
                    }

                    return undefined;
                  })
                  .catch(() => undefined);
              } else {
                const owner = await guild.fetchOwner({ cache: true });

                const url = member.user.avatarURL({ size: 256, extension: 'png' }) || member.user.defaultAvatarURL;

                const ownerUser = await em.findOneOrFail(User, { id: owner.user.id });
                await i18n.changeLanguage(ownerUser.language);

                owner.send({
                  content: i18n.t('birthday.error.noSendPermission', channel.toString()),
                  files: [await generateImage(url, age.toString())],
                }).catch(() => {});
              }
            // If there is a birthday message delete it if the message is deletable and when it's not the members birthday or if the member left the server
            } else if (birthdayMessage && !(isBirthday && member)) {
              birthdayMessage.delete().catch(() => {});
              // eslint-disable-next-line no-param-reassign
              gu.birthdayMsg = undefined;
            }
          }
        }
      }));
    }
  }));
};

if (process.env.NODE_ENV !== 'production') {
  router.use('check', async ({
    em, msg, i18n, logger,
  }) => {
    const { client } = msg;
    await checkBday(client, em, i18n, logger);

    return 'Ohko';
  },
  HandlerType.BOTH, {
    description: 'Check all birthdays',
  });
}

router.onInit = async (client, orm, i18n, logger) => {
  const offset = new Date().getTimezoneOffset();
  logger.info(`Offset in minutes: ${offset}`);

  {
    const em = orm.em.fork();
    await checkBday(client, em, i18n, logger);
    await em.flush();
  }

  const reportCron = new CronJob('5 0 0 * * *', async () => {
    const em = orm.em.fork();
    await checkBday(client, em, i18n, logger);
    await em.flush();
  });

  reportCron.start();
};

export default router;
