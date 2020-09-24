import {
  Client,
  DMChannel, Permissions, TextBasedChannelFields, User as DiscordUser,
} from 'discord.js';
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
      (q) => sendQuote(msg.channel, q, msg.client));
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
router.use('remove', async ({
  msg, em, params, guildUser,
}) => {
  if (params.length < 1) {
    msg.channel.send('Verwijder quotes van wie?');
    return;
  }

  if (params.length > 1) {
    msg.channel.send('Alleen de gebruiker graag');
    return;
  }

  if (!(params[0] instanceof DiscordUser)) {
    msg.channel.send('Hoe moeilijk is het om daar een mention neer te zetten?');
    return;
  }

  const guToRemoveFrom = await getUserGuildData(em, params[0], msg.guild);

  // Als iemand zijn eigen quotes ophaalt laat hij alles zien (of als degene admin is)
  // Anders laad alleen de quotes waar hij de creator van is
  if (guToRemoveFrom === guildUser || msg.member.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
    await guToRemoveFrom.quotes.init();
  } else await guToRemoveFrom.quotes.init({ where: { creator: guildUser } });

  const quotes = guToRemoveFrom.quotes.getItems();

  if (quotes.length < 1) {
    msg.channel.send('Jij hebt geen quotes aangemaakt voor deze user');
    return;
  }

  const quotesToRemove : Set<Quote> = new Set<Quote>();

  const menuEm = em.fork();

  createMenu(quotes,
    msg.author,
    msg.channel,
    '**Selecteer welke quote(s) je wil verwijderen**',
    (q) => `${quotesToRemove.has(q) ? '✅ ' : ''}${q.text}`,
    (q) => {
      if (quotesToRemove.has(q)) quotesToRemove.delete(q);
      else quotesToRemove.add(q);
      return false;
    },
    ['❌', () => {
      quotesToRemove.forEach((q) => { menuEm.remove(Quote, q); });
      if (quotesToRemove.size > 0) msg.channel.send(`${quotesToRemove.size} quote${quotesToRemove.size !== 1 ? 's' : ''} verwijderd`);
      else msg.channel.send('Geen quote(s) verwijderd');
      menuEm.flush();
      return true;
    }]);
});

router.use(null, async ({ msg, em }) => {
  const repo = em.getRepository(Quote);
  const quotes = await repo.findAll();

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  await sendQuote(msg.channel, quote, msg.client);
});

const helpHanlder : Handler = ({ msg }) => {
  let message = '**Maak een tijdelijke voice kanaal aan**';
  message += '\nMogelijke Commandos:';
  message += '\n`ei lobby create [@mention ...]`: Maak een private lobby aan en laat alleen de toegestaande mensen joinen';
  message += '\n`ei lobby create [@mention ...] -mute`: Iedereen mag joinen, maar alleen toegestaande mensen mogen spreken';
  message += '\n`ei lobby create [@mention ...] -public`: Iedereen mag joinen';
  message += '\n`ei lobby create [@mention ...] -<nummer>`: Zet een user limit op de lobby';
  message += '\n`ei lobby add @mention ...`: Laat user(s) toe aan de lobby';
  message += '\n`ei lobby remove [@mention ...]`: Verwijder user(s)/ role(s) uit de lobby';
  message += '\n`ei lobby set [mute / private / public]`: Verander het type van de lobby';
  message += '\n`ei lobby limit <nummer>`: Verander de lobby user limit';
  message += '\n`*Admin* ei lobby category true/ false`: Sta users toe lobbies aan te maken in deze categorie';
  message += '\n`*Admin* ei lobby bitrate <8000 - 128000>`: Stel in welke bitrate de lobbies hebben wanneer ze worden aangemaakt';
  msg.channel.send(message);
};

router.use('help', ({ msg }) => {
  let message = '**Hou quotes van je makkermaten bij**';
  message += '\nMogelijke Commandos:';
  message += '\n`ei quote`: Verstuur een random quote';
  message += '\n`ei quote <@member>`: Verstuur een quote van dat persoon';
  message += '\n`ei quote <@member> <quote>`: Sla een nieuwe quote op van dat persoon';
  message += '\n`ei quote remove <@member>`: Verwijder een selectie aan quotes van dat persoon';
  message += '\n> Je kan alleen de quotes verwijderen die je voor dat persoon geschreven hebt';
  message += '\n> Alleen quotes van jezelf kan je volledig beheren';
  msg.channel.send(message);
});

export default router;
