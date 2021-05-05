import Router, { HandlerType } from '../router/Router';

const router = new Router();

router.use('add', async ({ msg, guildUser }) => {
  // NOOIT parameters direct aanpassen
  // kan undefined behaviour veroorzaken

  const data = await guildUser;

  if (!data.user.count) data.user.count = 1;
  else data.user.count += 1;

  return `${msg.author.tag} has counted to ${data.user.count}`;
}, HandlerType.GUILD);

router.use('get', async ({ msg, guildUser }) => `${msg.author.tag} is now on ${(await guildUser)?.user.count}`);

export default router;
