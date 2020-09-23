import {
  Client,
  DMChannel, TextBasedChannelFields, User as DiscordUser,
} from 'discord.js';
import { transpile } from 'typescript';
import createMenu from '../createMenu';
import Quote from '../entity/Quote';
import { getUserGuildData } from '../data';
import Router, { Handler } from '../Router';

const router = new Router();

const sendQuote = async (channel : TextBasedChannelFields, quote : Quote, client : Client) => {
  const quoted = client.users.fetch(quote.guildUser.user.id, true);
  const owner = client.users.fetch(quote.creator.user.id, true);
  channel.send(`> ${quote.text}\n- ${(await quoted).username} (door ${(await owner).username})`);
};

const handler : Handler = async ({
  params, msg, em, guildUser,
}) => {
  if (msg.channel instanceof DMChannel) {
    msg.channel.send('DM mij niet smeervent');
    return;
  }

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

  const quotedUser = await getUserGuildData(em, user, msg.guild);
  await quotedUser.quotes.init();

  if (params.length === 0) {
    if (quotedUser.quotes.length === 0) {
      msg.channel.send(`${user.username} is niet populair en heeft dus nog geen quotes`);
      return;
    }

    if (quotedUser.quotes.length === 1) {
      await sendQuote(msg.channel, quotedUser.quotes[0], msg.client);
      return;
    }

    createMenu(quotedUser.quotes.getItems(),
      msg.author,
      msg.channel,
      '**Kiest U Maar**',
      (q) => q.text,
      (q) => sendQuote(msg.channel, q, msg.client),
      ['❌', () => true]);
    return;
  }

  if (params.some((param) => typeof param !== 'string')
      || params.some((param) => (<string>param).toLowerCase() === '@everyone' || (<string>param).toLowerCase() === '@here')) {
    await msg.channel.send('Een quote kan geen mentions bevatten');
    return;
  }

  const text = params.filter((param) : param is string => typeof param === 'string').join(' ');

  quotedUser.quotes.add(new Quote(text, guildUser));

  msg.channel.send('Ait die ga ik onthouden');
};

router.use(DiscordUser, handler);
router.use('add', handler);
router.use('remove', ({ msg }) => { msg.channel.send('Je kan op dit moment nog geen quotes verwijderen, vraag maar aan <@248143520005619713>'); });
router.use(null, ({ msg }) => { msg.channel.send('Wat moet ik nu doen dan, gewoon een random persoon quoten?'); });

export default router;
