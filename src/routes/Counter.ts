import { Message } from 'discord.js';
import Router, { HandlerType } from '../router/Router';

const router = new Router('Development only');

router.use('add', async ({ msg, guildUser }) => {
  const requestingUser = msg instanceof Message ? msg.author : msg.user;

  const data = await guildUser;
  if (!data.user.isInitialized()) await data.user.init();

  if (!data.user.count) data.user.count = 1;
  else data.user.count += 1;

  return `${requestingUser.tag} has counted to ${data.user.count}`;
}, HandlerType.GUILD);

router.use('get', async ({ msg, guildUser }) => {
  const requestingUser = msg instanceof Message ? msg.author : msg.user;

  if ((await guildUser).user.isInitialized()) await (await guildUser).user.init(true);
  return `${requestingUser.tag} is now on ${guildUser.user.count}`;
}, HandlerType.GUILD);

export default router;
