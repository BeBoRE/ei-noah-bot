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

  if (params.length === 0) {
    const guildUser = await getUserGuildData(em, user, msg.guild);
    await guildUser.quotes.init();

    const quote = guildUser.quotes[Math.floor(Math.random() * guildUser.quotes.length)];

    msg.channel.send(`"${quote.text}"\n- ${user.username}`);
  }

  if (!params.every((param) => typeof param === 'string')) {
    msg.channel.send('Een quote kan geen mentions bevatten');
    return;
  }

  const text = params.filter((param) : param is string => typeof param === 'string').join(' ');

  const guildUser = await getUserGuildData(em, user, msg.guild);

  const quote = em.create(Quote, { guildUser, text });
  em.persist(quote);

  msg.channel.send('Ait die ga ik onthouden');
};

router.use(DiscordUser, handler);
router.use(null, ({ msg }) => { msg.channel.send('Wat moet ik nu doen dan, gewoon een random iemand quoten?'); });

export default router;
