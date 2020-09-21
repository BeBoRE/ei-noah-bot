import {
  CollectorFilter,
  DMChannel, MessageReaction, ReactionEmoji, TextBasedChannelFields, User as DiscordUser,
} from 'discord.js';
import { Collection, EntityManager } from 'mikro-orm';
import Quote from '../entity/Quote';
import { getUserGuildData } from '../data';
import Router, { Handler } from '../Router';

const router = new Router();

const sendQuote = (channel : TextBasedChannelFields, quote : Quote, user : DiscordUser) => channel.send(`> ${quote.text}\n- ${user.username}`);

const createQuoteMenu = async (
  em : EntityManager,
  quotes: Collection<Quote>,
  owner: DiscordUser,
  quotedUser: DiscordUser,
  channel: TextBasedChannelFields,
) => {
  const emotes = [
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣',
    '🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹', '🇺', '🇻', '🇼', 'x', 'y', '🇿',
  ];
  const title = '**Kiest U maar**\n';

  const quoteList = quotes.getItems().map((q, index) => `${emotes[index]} \`${q.text}\``).join('\n');

  const message = await channel.send(title + quoteList);
  quotes.getItems().forEach((q, i) => message.react(emotes[i]));

  // eslint-disable-next-line max-len
  const filter : CollectorFilter = (reaction : MessageReaction, user : DiscordUser) => emotes.some((e) => e === reaction.emoji.name) && user.id === owner.id;
  const collector = message.createReactionCollector(filter, { max: 1 });

  const timeout = setTimeout(() => {
    collector.stop();
    message.delete().catch(console.error);
  }, 60 * 1000);

  collector.on('collect', (r) => {
    const i = emotes.findIndex((e) => e === r.emoji.name);
    sendQuote(channel, quotes[i], quotedUser);
    message.delete();

    clearTimeout(timeout);
  });
};

const handler : Handler = async ({ params, msg, em }) => {
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

  const guildUser = await getUserGuildData(em, user, msg.guild);
  await guildUser.quotes.init();

  if (params.length === 0) {
    if (guildUser.quotes.length === 0) {
      msg.channel.send(`${user.username} is niet populair en heeft dus nog geen quotes`);
      return;
    }

    createQuoteMenu(em, guildUser.quotes, msg.author, user, msg.channel);
    return;
  }

  if (params.some((param) => typeof param !== 'string')
      || params.some((param) => (<string>param).toLowerCase() === '@everyone' || (<string>param).toLowerCase() === '@here')) {
    await msg.channel.send('Een quote kan geen mentions bevatten');
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
