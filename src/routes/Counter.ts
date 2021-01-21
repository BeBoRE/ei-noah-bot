import Router from '../Router';

const router = new Router();

router.use('add', async ({ msg, guildUser }) => {
  // NOOIT parameters direct aanpassen
  // kan undefined behaviour veroorzaken

  if (guildUser == null) {
    return 'Alleen gebruiken in een server';
  }
  const data = guildUser;

  if (!data.user.count) data.user.count = 1;
  else data.user.count += 1;

  return `${msg.author.tag} has counted to ${data.user.count}`;
});

router.use('get', async ({ msg, guildUser }) => `${msg.author.tag} is now on ${guildUser?.user.count}`);

export default router;
