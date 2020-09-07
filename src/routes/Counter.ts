import Router from '../Router';

const router = new Router();

router.use('add', async ({ msg, guildUser }) => {
  // NOOIT parameters direct aanpassen
  // kan undefined behaviour veroorzaken
  const data = guildUser;

  if (!data.user.count) data.user.count = 1;
  else data.user.count += 1;

  msg.channel.send(`${msg.author.tag} has counted to ${data.user.count}`);
});

router.use('get', async ({ msg, guildUser }) => {
  msg.channel.send(`${msg.author.tag} is now on ${guildUser.user.count}`);

  // Geen data aangepast
  // Niks opslaan
});

export default router;
