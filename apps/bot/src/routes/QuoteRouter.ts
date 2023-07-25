import {
  Channel,
  Guild,
  Message,
  ButtonBuilder,
  PermissionsBitField,
  Role,
  User as DiscordUser,
  InteractionReplyOptions,
  InteractionUpdateOptions,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { GuildUser } from '@ei/database/entity/GuildUser';
import { i18n as I18n } from 'i18next';
import createMenu from '../createMenu';
import Quote from '@ei/database/entity/Quote';
import Router, { GuildHandler, HandlerType } from '../router/Router';

const router = new Router('Onthoud al');

router.use('help', ({ i18n }) => i18n.t('quote.help', { joinArrays: '\n' }), HandlerType.BOTH, {
  description: 'Help menu for quote\'s',
});

const getQuoteOptions = async (guild : Guild, quote : Quote, i18n : I18n) : Promise<InteractionReplyOptions> => {
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

  const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gm;

  if (text.match(linkRegex)) return { content: `${text}\n> - ${await quoted} ${quote.date ? `(<t:${quote.date.getTime() / 1000}:D>)` : ''}\n> ${i18n.t('quote.byUser', { user: (await owner).toString() })}` };

  const embed = new EmbedBuilder();

  const color : number | undefined = guild.members.me?.displayColor;

  embed.setAuthor({
    name: (await quoted).username,
    iconURL: (await quoted).displayAvatarURL({ size: 64 }),
  });
  embed.setDescription(text);
  embed.setFooter({
    text: i18n.t('quote.byUser', { user: (await owner).username }),
    iconURL: (await owner).displayAvatarURL({ size: 64 }),
  });
  if (quote.date) embed.setTimestamp(quote.date);
  if (color) embed.setColor(color);

  return { embeds: [embed] };
};

const addQuote = (params : (string | DiscordUser | Channel | Role | number | boolean)[], quotedUser : GuildUser, owner : GuildUser, guild : Guild, i18n : I18n, date ?: Date) => {
  const text = params.map((param) => {
    if (typeof param === 'string') return param;
    return param.toString();
  }).join(' ');

  if (text.length > 2000) {
    return i18n.t('quote.error.quoteSizeLimit');
  }

  const quote = new Quote(text, owner);
  if (date) quote.date = date;
  quotedUser.quotes.add(quote);

  return getQuoteOptions(guild, quote, i18n);
};

const handler : GuildHandler = async ({
  params, msg, guildUser, flags, i18n, logger, getGuildUser,
}) => {
  const [user] = flags.get('persoon') || params;
  params.shift();
  const quoteToAdd = params.length ? params : flags.get('quote');

  if (!(user instanceof DiscordUser)) {
    return i18n.t('quote.error.noUserGiven');
  }

  const requestingUser = msg.user;

  let quotedUser : GuildUser;
  if (requestingUser.id === user.id) quotedUser = guildUser;
  else quotedUser = await getGuildUser(user, msg.guild);

  if (!quotedUser.quotes.isInitialized()) { await quotedUser.quotes.init(); }

  if (!quoteToAdd || quoteToAdd.length === 0) {
    if (quotedUser.quotes.length === 0) {
      return i18n.t('quote.noQuoteFound', { user: user.toString() });
    }

    if (quotedUser.quotes.length === 1) {
      return getQuoteOptions(msg.guild, quotedUser.quotes[0], i18n);
    }

    createMenu({
      logger,
      list: quotedUser.quotes.getItems(),
      owner: requestingUser,
      msg,
      title: i18n.t('quote.quoteMenuTitle'),
      mapper: (q) => q.text,
      selectCallback: async (q) => ({
        ...<InteractionUpdateOptions> await getQuoteOptions(msg.guild, q, i18n),
        allowedMentions: {
          users: [],
          roles: [],
        },
      }),
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
      type: ApplicationCommandOptionType.User,
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
      type: ApplicationCommandOptionType.User,
      required: true,
    }, {
      name: 'quote',
      description: 'Quote you want to add',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
});
router.use('toevoegen', handler, HandlerType.GUILD);

router.useContext('Save As Quote', ApplicationCommandType.Message, async ({
  interaction, i18n, guildUser, getGuildUser,
}) => {
  const message = interaction.options.getMessage('message');

  if (!(message instanceof Message)) {
    return 'Onmogelijk pad';
  }

  if (!guildUser || !message.guild) {
    return i18n.t('error.onlyUsableInGuild');
  }

  if (!message.content) return i18n.t('quote.error.noContentInMessage');

  const quoted = await getGuildUser(message.author, message.guild);

  const quoteMessage = await addQuote(message.content.split(' '), quoted, guildUser, message.guild, i18n, message.createdAt);

  if (typeof quoteMessage === 'string') return quoteMessage;

  return {
    ...quoteMessage,
    ephemeral: false,
  };
});

const removeHandler : GuildHandler = async ({
  msg, em, params, guildUser, flags, i18n, logger, getGuildUser,
}) => {
  const [user] = flags.get('user') || params;
  if (!(user instanceof DiscordUser)) {
    return i18n.t('quote.error.noUserGiven');
  }

  const requestingUser = msg.user;

  const guToRemoveFrom = requestingUser.id === user.id ? guildUser : await getGuildUser(user, msg.guild);

  // Als iemand zijn eigen quotes ophaalt laat hij alles zien (of als degene admin is)
  // Anders laad alleen de quotes waar hij de creator van is
  const constraint = guToRemoveFrom.user.id === requestingUser.id || msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)
    ? undefined : { where: { creator: guildUser } };

  if (!guToRemoveFrom.quotes.isInitialized()) { await guToRemoveFrom.quotes.init(constraint); }

  const quotes = guToRemoveFrom.quotes.getItems();

  if (quotes.length < 1) {
    return i18n.t('quote.error.noQuoteFoundRemove');
  }

  const quotesToRemove : Set<Quote> = new Set<Quote>();

  const menuEm = em.fork();

  createMenu({
    logger,
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
        new ButtonBuilder()
          .setCustomId('delete')
          .setStyle(ButtonStyle.Danger)
          .setLabel('❌'),
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
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
});
router.use('delete', removeHandler, HandlerType.GUILD);
router.use('verwijder', removeHandler, HandlerType.GUILD);
router.use('verwijderen', removeHandler, HandlerType.GUILD);
router.use('manage', removeHandler, HandlerType.GUILD);

router.use('random', async ({ msg, em, i18n }) => {
  const quotes = await em.find(Quote, { guildUser: { guild: { id: msg.guild.id } } }, { populate: ['guildUser', 'creator'] });

  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  if (quote) {
    return getQuoteOptions(msg.guild, quote, i18n);
  }

  return i18n.t('quote.guildNoQuotes');
}, HandlerType.GUILD, {
  description: 'Give a random quote from the server',
});

export default router;
