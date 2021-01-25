import moment from 'moment';
import { CronJob } from 'cron';
import {
  Client,
  MessageEmbed,
  NewsChannel,
  Permissions, Role, TextChannel,
  User as DiscordUser,
} from 'discord.js';
import { EntityManager } from 'mikro-orm';
import { getUserData } from '../data';
import { User } from '../entity/User';
import Router, { Handler } from '../Router';

const router = new Router();

router.use('set', async ({ user, params }) => {
  const rawDate = params[0];

  if (typeof (rawDate) !== 'string') {
    return 'Ik verwacht een datum als argument';
  }

  const args = rawDate.split('/');
  if (!args.length) {
    return 'Je hebt geen datum gegeven.';
  }
  const birth = new Date(parseInt(args[2], 10), parseInt(args[1], 10) - 1, parseInt(args[0], 10));
  const birth1 = moment(birth);

  if (!birth1.isValid()) { return 'Leuk geprobeerd'; }

  if (birth1.isAfter(new Date())) {
    return 'Je geboorte kan niet in de toekomst zijn';
  }

  if (moment().subtract(80, 'years').isAfter(birth1)) {
    return 'Zo oud? 🤔';
  }

  // eslint-disable-next-line no-param-reassign
  user.birthday = birth1.toDate();

  if (user.birthday != null) {
    return `Je verjaardag is gewijzigd naar: ${birth1.locale('nl').format('D MMMM YYYY')}`;
  }
  return `Je verjaardag is toegevoegd: ${birth1.locale('nl').format('D MMMM YYYY')}`;
});

const helpHandler : Handler = async () => [
  '**Krijg elke ochtend een melding als iemand jarig is**',
  '`ei bday set <DD/MM/YYYY>`: Stel je geboortedatum in',
  '`ei bday show-all`: Laat iedereens geboortedatum zien',
  '`ei bday show-age`: Laat iedereens leeftijd zien',
  '`ei bday <@user>`: Laat de geboortedatum en leeftijd van een user zien',
  '`ei bday delete`: Verwijderd jouw verjaardag',
  '***Admin Commando\'s***',
  '`ei bday set-channel`: Selecteerd het huidige kanaal voor de dagelijkse update',
  '`ei bday set-role <Role Mention>`: Selecteerd de gekozen role voor de jarige-jop',
].join('\n');

router.use('help', helpHandler);
router.use(null, helpHandler);

router.use('show-all', async ({ msg, em }) => {
  const users = await em.find(User, { $not: { birthday: null } });
  const discUsers = await Promise.all(users.map((u) => msg.client.users.fetch(u.id, true)));
  const description = discUsers
    .sort((a, b) => {
      let dayA = moment(users.find((u) => u.id === a.id)?.birthday).dayOfYear();
      let dayB = moment(users.find((u) => u.id === b.id)?.birthday).dayOfYear();

      const todayDayOfYear = moment().dayOfYear();

      if (dayA < todayDayOfYear) dayA += 365;
      if (dayB < todayDayOfYear) dayB += 365;

      return dayA - dayB;
    })
    .map((du) => `\n${du.username} is geboren op ${moment(users.find((u) => u.id === du.id)?.birthday).locale('nl').format('D MMMM YYYY')}`);

  let color : string | undefined;
  if (msg.channel instanceof TextChannel || msg.channel instanceof NewsChannel) {
    color = msg.channel.guild.me?.displayHexColor;
  }

  if (!color || color === '#000000') color = '#ffcc5f';

  const embed = new MessageEmbed();
  embed.setColor(color);
  embed.setTitle('Verjaardagen:');
  embed.addField('Aankomende eerst', description);

  return embed;
});

router.use('show-age', async ({ msg, em }) => {
  const users = await em.find(User, { $not: { birthday: null } });
  const discUsers = await Promise.all(users.map((u) => msg.client.users.fetch(u.id, true)));
  const description = discUsers
    .sort((a, b) => {
      const bdayA = users.find((u) => u.id === a.id)?.birthday;
      const bdayB = users.find((u) => u.id === b.id)?.birthday;

      return (bdayA?.valueOf() || 0) - (bdayB?.valueOf() || 0);
    })
    .map((du) => `\n${du.username} is ${-moment(users.find((u) => u.id === du.id)?.birthday).diff(moment(), 'years')}`)
    .join('\n');

  let color : string | undefined;
  if (msg.channel instanceof TextChannel || msg.channel instanceof NewsChannel) {
    color = msg.channel.guild.me?.displayHexColor;
  }

  if (!color || color === '#000000') color = '#ffcc5f';

  const embed = new MessageEmbed();
  embed.setColor(color);
  embed.setTitle('Leeftijden:');
  embed.description = description;

  return embed;
});

router.use(DiscordUser, async ({ params, em, msg }) => {
  const user = params[0];

  if (!(user instanceof DiscordUser)) {
    return 'Onmogelijk pad, gefeliciteerd';
  }

  const dbUser = await getUserData(em, user);

  if (!dbUser.birthday) { return `${user.username} heeft geen verjaardag, dit is zo zielig`; }

  const embed = new MessageEmbed();

  let color : string | undefined;
  if (msg.channel instanceof TextChannel || msg.channel instanceof NewsChannel) {
    color = msg.channel.guild.me?.displayHexColor;
  }

  if (!color || color === '#000000') color = '#ffcc5f';

  embed.setColor(color);
  embed.setAuthor(user.username, user.avatarURL() || undefined);
  embed.description = `Geboren op ${moment(dbUser.birthday).format('D MMMM YYYY')} en is ${moment().diff(moment(dbUser.birthday), 'year')} jaar oud`;

  return embed;
});

router.use('delete', async ({ user }) => {
  // eslint-disable-next-line no-param-reassign
  user.birthday = undefined;
  return 'Je verjaardag is verwijderd.';
});

router.use('set-channel', async ({ guildUser, msg }) => {
  if (!guildUser) {
    return 'This can only be used in a server';
  }

  if (!msg.member?.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
    return 'Alleen een Edwin mag dit aanpassen';
  }

  const { guild } = guildUser;
  const { channel } = msg;

  guild.birthdayChannel = channel.id;
  return 'Het huidige kanaal is geselecteerd voor deze server';
});

router.use('set-role', async ({ guildUser, msg, params }) => {
  if (!guildUser) {
    return 'Dit kan alleen in een server gebruikt worden';
  }

  if (!msg.member?.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
    return 'Alleen een Edwin mag dit aanpassen';
  }
  const role = params[0];

  const { guild } = guildUser;

  if (role instanceof Role) {
    guild.birthdayRole = role.id;
    return 'De role voor deze server is gezet';
  }

  return 'Mention een role';
});

const checkBday = async (client : Client, em : EntityManager) => {
  const today = moment().startOf('day').locale('nl').format('DD MMMM');
  const todayAge = moment().startOf('day').locale('nl').format('YYYY');

  const users = await em.find(User, { $not: { birthday: null } });
  const discUsers = await Promise.all(users.map((u) => client.users.fetch(u.id, true)));

  discUsers.forEach(async (du) => {
    const user = users.find((u) => u.id === du.id);
    const discBday = moment(user?.birthday).locale('nl').format('DD MMMM');
    const discBdayAge = moment(user?.birthday).locale('nl').format('YYYY');
    if (today === discBday) {
      console.log(`${du.tag} is vandaag jarig`);
      const age = parseInt(todayAge, 10) - parseInt(discBdayAge, 10);

      const message = (`Is vandaag ${age} geworden!`);

      await user?.guildUsers.init();
      user?.guildUsers.getItems().forEach(async (gu) => {
        if (gu.guild.birthdayChannel) {
          const bdayChannel = await client.channels.fetch(gu.guild.birthdayChannel, true);
          if (bdayChannel instanceof TextChannel) {
            const bdayRole = await bdayChannel.guild.roles.fetch(gu.guild.birthdayRole, true);
            if (bdayRole instanceof Role) {
              const member = await bdayChannel.guild.members.fetch({ user: du, cache: true });
              if (!member.roles.cache.has(bdayRole.id)) {
                member.roles.add(bdayRole).catch(() => console.log('Kon geen rol geven'));

                const embed = new MessageEmbed();

                let color : string | undefined;
                color = member.guild.me?.displayHexColor;

                if (!color || color === '#000000') color = '#ffcc5f';

                embed.setColor(color);

                // eslint-disable-next-line max-len
                embed.setAuthor(member.nickname || member.user.username, member.user.avatarURL() || undefined);
                embed.description = message;
                embed.setThumbnail('http://clipart-library.com/images/kcKnBz4Ai.jpg');

                await bdayChannel.send(embed);
              }
            }
          }
        }
      });
    } else {
      await user?.guildUsers.init();
      user?.guildUsers.getItems().forEach(async (gu) => {
        if (gu.guild.birthdayChannel) {
          const bdayChannel = await client.channels.fetch(gu.guild.birthdayChannel, true);
          if (bdayChannel instanceof TextChannel) {
            const bdayRole = await bdayChannel.guild.roles.fetch(gu.guild.birthdayRole, true);
            if (bdayRole instanceof Role) {
              const member = await bdayChannel.guild.members.fetch({ user: du, cache: true });
              if (member.roles.cache.has(bdayRole.id)) member.roles.remove(bdayRole).catch(() => console.log('Kon rol niet verwijderen'));
            }
          }
        }
      });
    }
  });
};

router.onInit = async (client, orm) => {
  const offset = new Date().getTimezoneOffset();
  console.log(`Offset in minutes: ${offset}`);

  const reportCron = new CronJob('5 0 0 * * *', () => { checkBday(client, orm.em.fork()); });

  if (process.env.NODE_ENV !== 'production') {
    checkBday(client, orm.em.fork());
  }

  reportCron.start();
};

export default router;
