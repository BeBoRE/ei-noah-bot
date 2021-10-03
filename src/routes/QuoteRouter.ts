import {
  Channel,
  Guild,
  Message,
  MessageButton,
  MessageEmbed, NewsChannel, Permissions, Role, TextChannel, User as DiscordUser, Util,
} from 'discord.js';
import { GuildUser } from 'entity/GuildUser';
import { i18n as I18n } from 'i18next';
import createMenu from '../createMenu';
import Quote from '../entity/Quote';
import { getUserGuildData } from '../data';
import Router, { GuildHandler, HandlerType } from '../router/Router';

const router = new Router('Onthoud al');

router.use('help', ({ i18n }) => i18n.t('quote.help', { joinArrays: '\n' }), HandlerType.BOTH, {
  description: 'Help menu for quote\'s',
});

const getQuoteEmbed = async (guild : Guild, quote : Quote, i18n : I18n) : Promise<MessageEmbed> => {
  await Promise.all([(() => {
    if (!quote.guildUser.isInitialized()) return quote.guildUser.init();

    return quote.guildUser;
  })(), (() => {
    if (!quote.creator.isInitialized()) return quote.creator.init();

    return quote.creator;
  })()]);

  const quoted = guild.client.users.fetch(`${BigInt(quote.guildUser.user.id)}`, { cache: true });
  const owner = guild.client.users.fetch(`${BigInt(quote.creator.user.id)}`, { cache: true });

  const text = quote.text.replace('`', '\\`');

  const embed = new MessageEmbed();

  const avatarURL = (await quoted).avatarURL() || undefined;
  const color : number | undefined = guild.me?.displayColor;

  embed.setAuthor((await quoted).username, avatarURL);
  embed.setDescription(text);
  embed.setFooter(i18n.t('quote.byUser', { user: (await owner).username }), (await owner).displayAvatarURL({ size: 64, dynamic: false }));
  if (quote.date) embed.setTimestamp(quote.date);
  if (color) embed.setColor(color);

  return embed;
};

const addQuote = (params : (string | DiscordUser | Channel | Role | number | boolean)[], quotedUser : GuildUser, owner : GuildUser, guild : Guild, i18n : I18n) => {
  const text = Util.removeMentions(params.map((param) => {
    if (typeof param === 'string') return param;
    if (param instanceof DiscordUser) return param.username;
    if (param instanceof Role) return param.name;
    if (param instanceof TextChannel || param instanceof NewsChannel) return param.name;
    return '[UNKNOWN]';
  }).join(' '));

  if (text.length > 256) {
    return i18n.t('quote.error.quoteSizeLimit');
  }

  const quote = new Quote(text, owner);
  quotedUser.quotes.add(quote);

  return getQuoteEmbed(guild, quote, i18n);
};

const handler : GuildHandler = async ({
  params, msg, em, guildUser, flags, i18n,
}) => {
  const [user] = flags.get('persoon') || params;
  params.shift();
  const quoteToAdd = params.length ? params : flags.get('quote');

  if (!(user instanceof DiscordUser)) {
    return i18n.t('quote.error.noUserGiven');
  }

  const requestingUser = msg instanceof Message ? msg.author : msg.user;

  let quotedUser : GuildUser;
  if (requestingUser.id === user.id) quotedUser = guildUser;
  else quotedUser = await getUserGuildData(em, user, msg.guild);

  if (!quotedUser.quotes.isInitialized()) { await quotedUser.quotes.init(); }

  if (!quoteToAdd || quoteToAdd.length === 0) {
    if (quotedUser.quotes.length === 0) {
      return i18n.t('quote.noQuoteFound', { user: user.toString() });
    }

    if (quotedUser.quotes.length === 1) {
      return getQuoteEmbed(msg.guild, quotedUser.quotes[0], i18n);
    }

    createMenu({
      list: quotedUser.quotes.getItems(),
      owner: requestingUser,
      msg,
      title: i18n.t('quote.quoteMenuTitle'),
      mapper: (q) => q.text,
      selectCallback: async (q) => {
        msg.channel.send({ embeds: [await getQuoteEmbed(msg.guild, q, i18n)] }).catch(() => { });
      },
    });
    return null;
  }

  const quote = addQuote(quoteToAdd, quotedUser, guildUser, msg.guild, i18n);
  if (typeof quote === 'string') return quote;

  return quote;
};

router.use('user', handler, HandlerType.GUILD);
router.use('get', handler, HandlerType.GUILD, {
  description: 'Quote someone',
  options: [
    {
      name: 'persoon',
      description: 'Person you want to quote',
      type: 'USER',
      required: true,
    },
  ],
});
router.use('add', handler, HandlerType.GUILD, {
  description: 'Add a quote to a user',
  options: [
    {
      name: 'persoon',
      description: 'Person you want to add a quote from',
      type: 'USER',
      required: true,
    }, {
      name: 'quote',
      description: 'Quote you want to add',
      type: 'STRING',
      required: true,
    },
  ],
});
router.use('toevoegen', handler, HandlerType.GUILD);

const removeHandler : GuildHandler = async ({
  msg, em, params, guildUser, flags, i18n,
}) => {
  const [user] = flags.get('user') || params;
  if (!(user instanceof DiscordUser)) {
    return i18n.t('quote.error.noUserGiven');
  }

  const requestingUser = msg instanceof Message ? msg.author : msg.user;

  const guToRemoveFrom = requestingUser.id === user.id ? guildUser : await getUserGuildData(em, user, msg.guild);

  // Als iemand zijn eigen quotes ophaalt laat hij alles zien (of als degene admin is)
  // Anders laad alleen de quotes waar hij de creator van is
  const constraint = guToRemoveFrom.user.id === requestingUser.id || msg.member?.permissions.has(Permissions.FLAGS.ADMINISTRATOR)
    ? undefined : { where: { creator: guildUser } };

  if (!guToRemoveFrom.quotes.isInitialized()) { await guToRemoveFrom.quotes.init(constraint); }

  const quotes = guToRemoveFrom.quotes.getItems();

  if (quotes.length < 1) {
    return i18n.t('quote.error.noQuoteFoundRemove');
  }

  const quotesToRemove : Set<Quote> = new Set<Quote>();

  const menuEm = em.fork();

  createMenu({
    list: quotes,
    owner: requestingUser,
    msg,
    title: i18n.t('lobby.quoteRemoveMenuTitle'),
    mapper: (q) => `${quotesToRemove.has(q) ? '✅' : ''}${q.text}`,
    selectCallback: (q) => {
      if (quotesToRemove.has(q)) quotesToRemove.delete(q);
      else quotesToRemove.add(q);
      return false;
    },
    extraButtons: [
      [
        new MessageButton({
          style: 'DANGER',
          label: '❌',
          customId: 'delete',
        }),
        () => {
          quotesToRemove.forEach((q) => { menuEm.remove(q); });
          if (quotesToRemove.size > 0) msg.channel.send(i18n.t('quote.amountQuotesRemoved', { count: quotesToRemove.size }));
          else msg.channel.send(i18n.t('quote.noQuotesRemoved'));
          menuEm.flush();
          return true;
        },
      ],
    ],
  });

  return null;
};

router.use('remove', removeHandler, HandlerType.GUILD, {
  description: 'Remove a quote from someone',
  options: [
    {
      name: 'user',
      description: 'User you wan\'t to remove a quote from',
      type: 'USER',
      required: true,
    },
  ],
});
router.use('delete', removeHandler, HandlerType.GUILD);
router.use('verwijder', removeHandler, HandlerType.GUILD);
router.use('verwijderen', removeHandler, HandlerType.GUILD);
router.use('manage', removeHandler, HandlerType.GUILD);

router.use('random', async ({ msg, em, i18n }) => {
  const quotes = await em.find(Quote, { guildUser: { guild: { id: msg.guild.id } } }, { populate: { guildUser: true, creator: true } });

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  if (quote) {
    return getQuoteEmbed(msg.guild, quote, i18n);
  }

  return i18n.t('quote.guildNoQuotes');
}, HandlerType.GUILD, {
  description: 'Give a random quote from the server',
});

export default router;
