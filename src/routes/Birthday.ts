import Router from '../Router';

const Discord = require('discord.js');

const router = new Router();

router.use('set', async ({ msg, guildUser }) => {
  msg.channel.send('Je verjaardag kan ook later toegevoegd worden.');
});

router.use('give', async ({ msg, guildUser }) => {
  // Toevoeging van een role op basis van ID
  const role = msg.member.roles.add('744926444756533358');
  const sendMessage = msg.channel.send('You have gained a birthday.');

  await role;
  await sendMessage;
});

router.use('help', async ({ msg, guildUser }) => {
  msg.channel.send('Hulp bericht is onderweg');
});

export default router;
