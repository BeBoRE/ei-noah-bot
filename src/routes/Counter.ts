import Router from '../Router';

const router = new Router();

router.use('add', async ({ msg, guildUser }) => {
  const data = guildUser;

  if (!data.user.count) data.user.count = 1;
  else data.user.count += 1;

  msg.channel.send(`${msg.author.tag} has counted to ${data.user.count}`);

  return data;
});

router.use('remove', async ({ msg, guildUser }) => {
  const data = guildUser;

  if (!data.user.count) data.user.count = -1;
  else data.user.count -= 1;

  msg.channel.send(`${msg.author.tag} has counted down to ${data.user.count}`);

  return data;
});

export default router;
