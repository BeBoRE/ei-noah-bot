import moment from 'moment';
import { CronJob } from 'cron';
import {
  Client,
  Permissions, Role, TextChannel,
} from 'discord.js';
import { EntityManager } from 'mikro-orm';
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

  // eslint-disable-next-line no-param-reassign
  user.birthday = birth1.toDate();

  if (user.birthday != null) {
    return `Je verjaardag is gewijzigd naar: ${birth1.locale('nl').format('D MMMM YYYY')}`;
  }
  return `Je verjaardag is toegevoegd: ${birth1.locale('nl').format('D MMMM YYYY')}`;
});

const helpHandler : Handler = async () => {
  let message = '**Krijg elke ochtend een melding als iemand jarig is**\nHier volgen alle commando\'s voor verjaardagen';
  message += '\n`ei bday show-all`: Laat alle geregistreerde verjaardagen zien';
  message += '\n`ei bday set <DD/MM/YYYY>`: Registreerd jouw verjaardag';
  message += '\n`ei bday delete`: Verwijderd jouw verjaardag';
  message += '\n***Admin Commando\'s***';
  message += '\n`ei bday set-channel`: Selecteerd het huidige kanaal voor de dagelijkse update';
  message += '\n`ei bday set-role <Role Mention>`: Selecteerd de gekozen role voor de jarige-jop';

  return message;
};

router.use('help', helpHandler);
router.use(null, helpHandler);

router.use('show-all', async ({ msg, em }) => {
  let message = 'Hier zijn alle verjaardagen die zijn geregistreerd: ';
  const users = await em.find(User, { $not: { birthday: null } });
  const discUsers = await Promise.all(users.map((u) => msg.client.users.fetch(u.id, true)));
  discUsers.forEach((du) => { message += `\n${du.username} is geboren op ${moment(users.find((u) => u.id === du.id)?.birthday).locale('nl').format('DD MMMM YYYY')}`; });

  return message;
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
      const message = (`**Deze makker is vandaag jarig**\n${du.username} is vandaag ${age} geworden!`);

      await user?.guildUsers.init();
      user?.guildUsers.getItems().forEach(async (gu) => {
        if (gu.guild.birthdayChannel) {
          const bdayChannel = await client.channels.fetch(gu.guild.birthdayChannel, true);
          if (bdayChannel instanceof TextChannel) {
            const bdayRole = await bdayChannel.guild.roles.fetch(gu.guild.birthdayRole, true);
            if (bdayRole instanceof Role) {
              const member = await bdayChannel.guild.members.fetch({ user: du, cache: true });
              if (!member.roles.cache.has(bdayRole.id)) { member.roles.add(bdayRole).catch(() => console.log('Kon geen rol geven')); }
            }
            await bdayChannel.send(message);
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

  reportCron.start();

  // Check bday's één keer
  checkBday(client, orm.em.fork());
};

export default router;
