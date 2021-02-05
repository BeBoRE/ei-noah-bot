import {
  Client,
  DMChannel, MessageEmbed, Permissions, TextBasedChannelFields, TextChannel, User as DiscordUser,
} from 'discord.js';
import createMenu from '../createMenu';
import Quote from '../entity/Quote';
import { getUserGuildData } from '../data';
import Router, { Handler } from '../Router';

const router = new Router();

const sendQuote = async (channel : TextBasedChannelFields, quote : Quote, client : Client) => {
  const quoted = client.users.fetch(quote.guildUser.user.id, true);
  const owner = client.users.fetch(quote.creator.user.id, true);

  const text = quote.text.replace('`', '\\`');

  const embed = new MessageEmbed();

  const avatarURL = (await quoted).avatarURL() || undefined;
  let color : number | undefined;
  if (channel instanceof TextChannel) color = channel.guild.me?.displayColor;

  embed.setAuthor((await quoted).username, avatarURL);
  embed.setDescription(text);
  embed.setFooter(`Door ${(await owner).username}`);
  if (quote.date) embed.setTimestamp(quote.date);
  if (color) embed.setColor(color);

  await channel.send(embed);
};

const handler : Handler = async ({
  params, msg, em, guildUser,
}) => {
  if (msg.channel instanceof DMChannel || !msg.guild || !guildUser) {
    return 'DM mij niet smeervent';
  }

  if (params.length < 1) {
    return 'Zet er dan ook wat neer lul';
  }

  if (!(params[0] instanceof DiscordUser)) {
    return 'Ok dat is niet een persoon, mention iemand';
  }

  const user = params[0];
  params.shift();

  const quotedUser = await getUserGuildData(em, user, msg.guild);
  await quotedUser.quotes.init();

  if (params.length === 0) {
    if (quotedUser.quotes.length === 0) {
      return `${user.username} is niet populair en heeft nog geen quotes`;
    }

    if (quotedUser.quotes.length === 1) {
      await sendQuote(msg.channel, quotedUser.quotes[0], msg.client);
      return null;
    }

    createMenu(quotedUser.quotes.getItems(),
      msg.author,
      msg.channel,
      '**Kiest U Maar**',
      (q) => q.text,
      (q) => {
        sendQuote(msg.channel, q, msg.client);
      });
    return null;
  }

  if (params.some((param) => typeof param !== 'string')
      || params.some((param) => (<string>param).toLowerCase().match('@everyone') || (<string>param).toLowerCase().match('@here'))) {
    return 'Een quote kan geen mentions bevatten';
  }

  const text = params.filter((param) : param is string => typeof param === 'string').join(' ');

  if (text.length > 256) {
    return 'Quotes kunnen niet langer zijn dan 256 karakters';
  }

  quotedUser.quotes.add(new Quote(text, guildUser));

  return 'Ait die ga ik onthouden';
};

router.use(DiscordUser, handler);
router.use('add', handler);
router.use('toevoegen', handler);

const removeHandler : Handler = async ({
  msg, em, params, guildUser,
}) => {
  if (!msg.guild) {
    return 'Kan alleen in een server';
  }

  if (params.length < 1) {
    return 'Verwijder quotes van wie?';
  }

  if (params.length > 1) {
    return 'Alleen de gebruiker graag';
  }

  if (!(params[0] instanceof DiscordUser)) {
    return 'Hoe moeilijk is het om daar een mention neer te zetten?';
  }

  const guToRemoveFrom = await getUserGuildData(em, params[0], msg.guild);

  // Als iemand zijn eigen quotes ophaalt laat hij alles zien (of als degene admin is)
  // Anders laad alleen de quotes waar hij de creator van is
  if (guToRemoveFrom === guildUser || msg.member?.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
    await guToRemoveFrom.quotes.init();
  } else await guToRemoveFrom.quotes.init({ where: { creator: guildUser } });

  const quotes = guToRemoveFrom.quotes.getItems();

  if (quotes.length < 1) {
    return 'Jij hebt geen quotes aangemaakt voor deze user';
  }

  const quotesToRemove : Set<Quote> = new Set<Quote>();

  const menuEm = em.fork();

  createMenu(quotes,
    msg.author,
    msg.channel,
    '**Selecteer welke quote(s) je wil verwijderen**',
    (q) => `${quotesToRemove.has(q) ? '✅' : ''}${q.text}`,
    (q) => {
      if (quotesToRemove.has(q)) quotesToRemove.delete(q);
      else quotesToRemove.add(q);
      return false;
    },
    ['❌', () => {
      quotesToRemove.forEach((q) => { menuEm.remove(q); });
      if (quotesToRemove.size > 0) msg.channel.send(`${quotesToRemove.size} quote${quotesToRemove.size !== 1 ? 's' : ''} verwijderd`);
      else msg.channel.send('Geen quote(s) verwijderd');
      menuEm.flush();
      return true;
    }]);

  return null;
};

router.use('remove', removeHandler);
router.use('delete', removeHandler);
router.use('verwijder', removeHandler);
router.use('verwijderen', removeHandler);
router.use('manage', removeHandler);

router.use(null, async ({ msg, em }) => {
  if (!msg.guild) {
    return 'Dit commando alleen op een server gebruiken';
  }

  const quotes = await em.find(Quote, { guildUser: { guild: { id: msg.guild.id } } });

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  if (quotes) {
    await sendQuote(msg.channel, quote, msg.client);
    return null;
  }

  return 'Deze server heeft nog geen quotes';
});

router.use('help', () => [
  '**Hou quotes van je makkermaten bij!**',
  'Mogelijke Commandos:',
  '`ei quote`: Verstuur een random quote',
  '`ei quote <@member>`: Verstuur een quote van dat persoon',
  '`ei quote <@member> <quote>`: Sla een nieuwe quote op van dat persoon',
  '`ei quote remove <@member>`: Verwijder een selectie aan quotes van dat persoon',
  '> Je kan alleen de quotes verwijderen die je voor dat persoon geschreven hebt',
  '> Alleen quotes van jezelf kan je volledig beheren',
].join('\n'));

export default router;
