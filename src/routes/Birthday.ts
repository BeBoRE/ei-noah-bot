import moment from 'moment';
import { CronJob } from 'cron';
import {
  Permissions, Role, TextChannel,
} from 'discord.js';
import { User } from '../entity/User';
import Router, { Handler } from '../Router';

const router = new Router();

router.use('set', async ({ msg, user, params }) => {
  const rawDate = params[0];

  if (typeof (rawDate) !== 'string') {
    msg.channel.send('Ik verwacht een datum als argument');

    return;
  }

  const args = rawDate.split('/');
  if (!args.length) {
    msg.channel.send('Je hebt geen datum gegeven.');
  } else {
    const birth = new Date(parseInt(args[2], 10), parseInt(args[1], 10) - 1, parseInt(args[0], 10));
    const birth1 = moment(birth);

    if (user.birthday != null) {
      msg.channel.send(`Je verjaardag is gewijzigd met de datum: ${birth1.locale('nl').format('DD MMMM YYYY')}`);
    } else {
      msg.channel.send(`Je verjaardag is toegevoegd met de datum: ${birth1.locale('nl').format('DD MMMM YYYY')}`);
    }

    // eslint-disable-next-line no-param-reassign
    user.birthday = birth1.toDate();
  }
});

const helpHandler : Handler = async ({ msg }) => {
  let message = '**Krijg elke ochtend een melding als iemand jarig is**\nHier volgen alle commando\'s voor verjaardagen';
  message += '\n`ei bday show-all`: Laat alle geregistreerde verjaardagen zien';
  message += '\n`ei bday set <DD/MM/YYYY>`: Registreerd jouw verjaardag';
  message += '\n`ei bday delete`: Verwijderd jouw verjaardag';
  message += '\n***Admin Commando\'s***';
  message += '\n`ei bday set-channel`: Selecteerd het huidige kanaal voor de dagelijkse update';
  message += '\n`ei bday set-role <Role Mention>`: Selecteerd de gekozen role voor de jarige-jop';

  msg.channel.send(message);
};

router.use('help', helpHandler);
router.use(null, helpHandler);

router.use('show-all', async ({ msg, em }) => {
  let message = 'Hier zijn alle verjaardagen die zijn geregistreerd: ';
  const users = await em.find(User, { $not: { birthday: null } });
  const discUsers = await Promise.all(users.map((u) => msg.client.users.fetch(u.id, true)));
  discUsers.forEach((du) => { message += `\n${du.username} is geboren op ${moment(users.find((u) => u.id === du.id)?.birthday).locale('nl').format('DD MMMM YYYY')}`; });

  msg.channel.send(message);
});

router.use('delete', async ({ msg, user }) => {
  // eslint-disable-next-line no-param-reassign
  user.birthday = undefined;
  msg.channel.send(`@${msg.author.tag}, je verjaardag is verwijderd.`);
});

router.use('set-channel', async ({ guildUser, msg }) => {
  if (!guildUser) {
    msg.channel.send('This can only be used in a server');
    return;
  }

  if (!msg.member?.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
    msg.channel.send('Alleen een Edwin mag dit aanpassen');
    return;
  }

  const { guild } = guildUser;
  const { channel } = msg;

  guild.birthdayChannel = channel.id;
  msg.channel.send('Het huidige kanaal is geselecteerd voor deze server');
});

router.use('set-role', async ({ guildUser, msg, params }) => {
  if (!guildUser) {
    msg.channel.send('Dit kan alleen in een server gebruikt worden');
    return;
  }

  if (!msg.member?.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
    msg.channel.send('Alleen een Edwin mag dit aanpassen');
    return;
  }
  const rawRole = params[0];

  const { guild } = guildUser;
  if (rawRole instanceof Role) {
    if (rawRole !== undefined) {
      guild.birthdayRole = rawRole.id;
      msg.channel.send('De role voor deze server is gezet');
    }
  } else {
    msg.channel.send('Er is geen role gementioned');
  }
});

router.onInit = async (client, orm) => {
  const checkBday = async () => {
    const em = orm.em.fork();

    const today = moment().startOf('day').locale('nl').format('DD MMMM');
    const todayAge = moment().startOf('day').locale('nl').format('YYYY');

    const users = await em.find(User, { $not: { birthday: null } });
    const discUsers = await Promise.all(users.map((u) => client.users.fetch(u.id, true)));

    discUsers.forEach(async (du) => {
      const user = users.find((u) => u.id === du.id);
      const discBday = moment(user?.birthday).locale('nl').format('DD MMMM');
      const discBdayAge = moment(user?.birthday).locale('nl').format('YYYY');
      if (today === discBday) {
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
                await member.roles.add(bdayRole);
              }
              bdayChannel.send(message);
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
                member.roles.remove(bdayRole);
              }
            }
          }
        });
      }
    });
  };

  const reportCron = new CronJob('0 0 * * *', checkBday);

  reportCron.start();
};

export default router;
