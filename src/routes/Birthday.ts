import moment from 'moment';
import { CronJob } from 'cron';
import { Permissions, TextChannel } from 'discord.js';
import { User } from '../entity/User';
import Router from '../Router';

const router = new Router();

router.use('set', async ({ msg, user, params }) => {
  const rawDate = params[0];

  if (typeof (rawDate) !== 'string') {
    msg.channel.send('Ik verwacht een datum als argument');

    return;
  }

  const args = msg.content.slice(rawDate.length).trim().split('/');
  if (!args.length) {
    msg.channel.send('Je hebt geen datum gegeven.');
  } else {
    const birth = new Date(parseInt(args[2], 10), parseInt(args[1], 10) - 1, parseInt(args[0], 10));
    const birth1 = moment(birth);
    // eslint-disable-next-line no-param-reassign
    user.birthday = birth1.toDate();
    if (user.birthday != null) {
      msg.channel.send(`Je verjaardag is gewijzigd met de datum: ${birth1.locale('nl').format('DD MMMM YYYY')}`);
    } else {
      msg.channel.send(`Je verjaardag is toegevoegd met de datum: ${birth1.locale('nl').format('DD MMMM YYYY')}`);
    }
  }
});

/* router.use('get', async ({ msg, guildUser, em }) => {
  // Toevoeging van een role op basis van ID
  if (msg.member) {
    const guild = await guildUser?.guild.birthdayRole;

    if (guild !== undefined) {
      const role = msg.member.roles.add(guild);
      const sendMessage = msg.channel.send('You have gained a birthday.');

      const today = moment().locale('nl').format('DD MMMM');
      const discUser = msg.client.users.fetch(msg.member.id, true);

      await role;
      await sendMessage;
    } else {
      msg.channel.send('Er is nog geen role geselecteerd voor deze server');
    }
  }
});
*/

router.use('help', async ({ msg }) => {
  let message = '**Krijg elke ochtend een melding als iemand jarig is**\nHier volgen alle commando\'s voor verjaardagen';
  message += '\n`ei bday show-all`: Laat alle geregistreerde verjaardagen zien';
  message += '\n`ei bday set <DD/MM/YYYY>`: Registreerd jouw verjaardag';
  message += '\n`ei bday delete`: Verwijderd jouw verjaardag';
  message += '\n`ei bday check`: Laat zien wie er vandaag jarig is';
  message += '\n***Admin Commando\'s***';
  message += '\n`ei bday set-channel`: Selecteerd het huidige kanaal voor de dagelijkse update';

  msg.channel.send(message);
});

router.use('show-all', async ({ msg, em }) => {
  let message = 'Hier zijn alle verjaardagen die zijn geregistreerd: ';
  const users = await em.find(User, { $not: { birthday: null } });
  const discUsers = await Promise.all(users.map((u) => msg.client.users.fetch(u.id, true)));
  discUsers.forEach((du) => { message += `\n${du.username} is geboren op ${moment(users.find((u) => u.id === du.id)?.birthday).locale('nl').format('DD MMMM YYYY')}`; });

  msg.channel.send(message);
});

router.use('delete', async ({ msg, user }) => {
  user.birthday = undefined;
  msg.channel.send(`@${msg.author.tag}, je verjaardag is verwijderd.`);
});

/* router.use('check', async ({ em, msg }) => {
  const today = moment().startOf('day').locale('nl').format('DD MMMM');
  const todayAge = moment().startOf('day').locale('nl').format('YYYY');

  const users = await em.find(User, { $not: { birthday: null } });
  const discUsers = await Promise.all(users.map((u) => msg.client.users.fetch(u.id, true)));

  let bdayToday = false;

  let message = '**Deze mensen zijn vandaag jarig**';

  discUsers.forEach((du) => {
    const discBday = moment(users.find((u) => u.id === du.id)?.birthday).locale('nl').
    format('DD MMMM');
    const discBdayAge = moment(users.find((u) => u.id === du.id)?.birthday).locale('nl').
    format('YYYY');
    if (today === discBday) {
      bdayToday = true;
      const age = parseInt(todayAge, 10) - parseInt(discBdayAge, 10);
      message += (`\n${du.username} is vandaag ${age} geworden!`);
    }
    if (bdayToday) {
      msg.channel.send(message);
    }
  });
});
*/

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
});

router.use('set-role', async ({ guildUser, msg }) => {
  if (!guildUser) {
    msg.channel.send('Dit kan alleen in een server gebruikt worden');
    return;
  }

  if (!msg.member?.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
    msg.channel.send('Alleen een Edwin mag dit aanpassen');
    return;
  }

  const { guild } = guildUser;
  const role = msg.guild?.roles.cache.get(msg.id);

  if (role !== undefined) {
    guild.birthdayRole = role.id;
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
              bdayChannel.send(message);
            }
          }
        });
      }
    });
  };

  const reportCron = new CronJob('0 7 * * *', checkBday);

  reportCron.start();
};

export default router;
