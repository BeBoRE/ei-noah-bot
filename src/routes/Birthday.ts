import { GuildUser } from 'entity/GuildUser';
import moment from 'moment';
import Router from '../Router';

const router = new Router();
const users: string[] = [];
const bdays: any[] = [];

router.use('set', async ({ msg, guildUser }) => {
  const prefix = 'ei bday set';
  const args = msg.content.slice(prefix.length).trim().split('/');
  if (!args.length) {
    msg.channel.send('Je hebt geen datum gegeven.');
  } else if (guildUser.user.birthday != null) {
    msg.channel.send('Je verjaardag is al geregistreerd.');
  } else {
    const birth = new Date(parseInt(args[2], 10), parseInt(args[1], 10) - 1, parseInt(args[1], 10));
    const birth1 = moment(birth);
    guildUser.user.birthday = birth1.toDate();
    msg.channel.send(`Je verjaardag is toegevoegd met de datum: ${birth1}`);
  }
});

router.use('give', async ({ msg }) => {
  // Toevoeging van een role op basis van ID
  const role = msg.member.roles.add('744926444756533358');
  const sendMessage = msg.channel.send('You have gained a birthday.');

  await role;
  await sendMessage;
});

router.use('help', async ({ msg }) => {
  msg.channel.send('ei bday set - Geef je geboorte datum in een vorm van "dag/maand/jaar"');
});

router.use('show-all', async ({ msg, em }) => {
  const message = 'Hier zijn alle verjaardagen die zijn geregistreerd: ';

  msg.channel.send(message);
});

router.use('delete', async ({ msg, guildUser }) => {
  guildUser.user.birthday = null;
  msg.channel.send(`@${msg.member.user.tag}, je verjaardag is verwijderd.`);
});

router.onInit = async (client, orm) => {

};

export default router;
