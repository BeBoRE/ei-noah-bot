import {
  Client,
  CollectorFilter,
  DMChannel, MessageReaction, TextBasedChannelFields, User as DiscordUser,
} from 'discord.js';
import { Collection, EntityManager } from 'mikro-orm';
import Quote from '../entity/Quote';
import { getUserGuildData } from '../data';
import Router, { Handler } from '../Router';

const router = new Router();

const sendQuote = async (channel : TextBasedChannelFields, quote : Quote, client : Client) => {
  const quoted = client.users.fetch(quote.guildUser.user.id, true);
  const owner = client.users.fetch(quote.creator.user.id, true);
  channel.send(`> ${quote.text}\n- ${(await quoted).username} (door ${(await owner).username})`);
};

const createQuoteMenu = async (
  em : EntityManager,
  quotes: Collection<Quote>,
  owner: DiscordUser,
  quotedUser: DiscordUser,
  channel: TextBasedChannelFields,
) => {
  const emotes = [
    '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
  ];
  const pageLeft = '◀️';
  const pageRight = '▶️';

  const title = '**Kiest U maar**';
  const quoteList = quotes.getItems();
  let page = 0;

  const generateText = () => {
    let text = title;

    for (let i = 0; i < emotes.length; i += 1) {
      const quote = quoteList[i + page * emotes.length];
      if (quote) text += `\n${emotes[i]} \`${quote.text}\``;
    }

    const pageText = `\n\n> \`${page + 1}/${Math.floor(quoteList.length / emotes.length) + 1}\``;

    return text + pageText;
  };

  const message = await channel.send(generateText());
  if (quoteList.length > emotes.length) {
    message.react(pageLeft);
    message.react(pageRight);
  }
  quoteList.forEach((q, i) => { if (i <= 4) message.react(emotes[i]); });

  // eslint-disable-next-line max-len
  const filter : CollectorFilter = (r : MessageReaction, u : DiscordUser) => (emotes.some((e) => e === r.emoji.name) || r.emoji.name === pageLeft || r.emoji.name === pageRight) && u.id === owner.id;
  const collector = message.createReactionCollector(filter);

  const resetOrStopTimeout = (() => {
    let timeout : NodeJS.Timeout;
    return (stop = false) => {
      if (timeout) clearTimeout(timeout);
      if (!stop) {
        timeout = setTimeout(() => {
          collector.stop();
          message.delete().catch(console.error);
        }, 1000 * 20);
      }
    };
  })();

  resetOrStopTimeout();

  collector.on('collect', (r, u) => {
    const i = emotes.findIndex((e) => e === r.emoji.name);
    const quote = quotes[i + page * emotes.length];

    r.users.remove(u).catch();

    if (quote && i !== -1) {
      sendQuote(channel, quote, owner.client);

      message.delete();
      collector.stop();

      resetOrStopTimeout(true);
    }

    if (r.emoji.name === pageLeft || r.emoji.name === pageRight) {
      if (r.emoji.name === pageLeft && page > 0) page -= 1;
      if (r.emoji.name === pageRight && page < Math.floor(quoteList.length / emotes.length)) {
        page += 1;
      }

      message.edit(generateText());

      resetOrStopTimeout();
    }
  });
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

    createQuoteMenu(em, quotedUser.quotes, msg.author, user, msg.channel);
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
