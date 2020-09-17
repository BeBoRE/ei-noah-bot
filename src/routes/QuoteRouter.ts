import { User as DiscordUser } from 'discord.js';
import Quote from '../entity/Quote';
import { getUserGuildData } from '../data';
import Router, { Handler } from '../Router';

const router = new Router();

const handler : Handler = async ({ params, msg, em }) => {
  if (params.length < 1) {
    msg.channel.send('Zet er dan ook wat neer lul');
    return;
  }

  if (!(params[0] instanceof DiscordUser)) {
    msg.channel.send('Ok dat is niet een persoon, mention iemand');
    return;
  }

  const user = params[0];
  params.shift();

  const guildUser = await getUserGuildData(em, user, msg.guild);
  await guildUser.quotes.init();

  if (params.length === 0) {
    if (guildUser.quotes.length === 0) {
      msg.channel.send(`${user.username} is niet populair en heeft dus nog geen quotes`);
      return;
    }

    const quote = guildUser.quotes[Math.floor(Math.random() * guildUser.quotes.length)];
    msg.channel.send(`> ${quote.text}\n- ${user.username}`);
    return;
  }

  if (params.some((param) => typeof param !== 'string')
      || params.some((param) => (<string>param).toLowerCase() === '@everyone' || (<string>param).toLowerCase() === '@here')) {
    msg.channel.send('Een quote kan geen mentions bevatten');
    return;
  }

  const text = params.filter((param) : param is string => typeof param === 'string').join(' ');

  guildUser.quotes.add(new Quote(text));

  msg.channel.send('Ait die ga ik onthouden');
};

router.use(DiscordUser, handler);
router.use('add', handler);
router.use('remove', ({ msg }) => { msg.channel.send('Je kan op dit moment nog geen quotes verwijderen, vraag maar aan <@248143520005619713>'); });
router.use(null, ({ msg }) => { msg.channel.send('Wat moet ik nu doen dan, gewoon een random persoon quoten?'); });

export default router;
