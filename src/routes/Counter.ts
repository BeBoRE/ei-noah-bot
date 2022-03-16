import Router, { HandlerType } from '../router/Router';

const router = new Router('Development only');

router.use('add', async ({ msg, guildUser }) => {
  const data = await guildUser;
  if (!data.user.isInitialized()) await data.user.init();

  if (!data.user.count) data.user.count = 1;
  else data.user.count += 1;

  return `${msg.user.tag} has counted to ${data.user.count}`;
}, HandlerType.GUILD, {
  description: 'Tel er eentje bij op',
});

router.use('get', async ({ msg, guildUser }) => {
  if ((await guildUser).user.isInitialized()) await (await guildUser).user.init(true);
  return `${msg.user.tag} is now on ${guildUser.user.count}`;
}, HandlerType.GUILD, {
  description: 'Krijg die teller van jezelf',
});

export default router;
