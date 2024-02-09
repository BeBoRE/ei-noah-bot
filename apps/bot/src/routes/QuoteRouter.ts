import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonBuilder,
  ButtonStyle,
  Channel,
  User as DiscordUser,
  EmbedBuilder,
  Guild,
  InteractionReplyOptions,
  InteractionUpdateOptions,
  Message,
  PermissionsBitField,
  Role,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';
import { i18n as I18n } from 'i18next';

import { DrizzleClient } from '@ei/drizzle';
import {
  GuildUser,
  guildUsers,
  Quote,
  quotes,
  User,
} from '@ei/drizzle/tables/schema';

import createMenu from '../createMenu';
import { createEntityCache } from '../EiNoah';
import globalLogger from '../logger';
import Router, { GuildHandler, HandlerType } from '../router/Router';

const router = new Router('Onthoud al');

router.use(
  'help',
  ({ i18n }) => i18n.t('quote.help', { joinArrays: '\n' }),
  HandlerType.BOTH,
  {
    description: "Help menu for quote's",
  },
);

const getQuoteOptions = async (
  guild: Guild,
  quote: Quote,
  i18n: I18n,
  quotedUser: User,
  ownerDb: User | null,
): Promise<InteractionReplyOptions> => {
  const quoted = guild.client.users.fetch(`${BigInt(quotedUser.id)}`, {
    cache: true,
  });

  globalLogger.debug(ownerDb);
  const owner =
    ownerDb &&
    (await guild.client.users
      .fetch(`${BigInt(ownerDb.id)}`, {
        cache: true,
      })
      .catch(() => null));

  const text = quote.text.replace('`', '\\`');

  const linkRegex =
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gm;

  const date = quote.date !== null && new Date(quote.date);

  const ownerUserName = owner ? owner.username : 'Unknown';

  if (text.match(linkRegex)) {
    return {
      content: `${text}\n> - ${await quoted} ${
        date ? `(<t:${(date.getTime() / 1000).toFixed(0)}:D>)` : ''
      }\n> ${i18n.t('quote.byUser', { user: ownerUserName })}`,
    };
  }

  const embed = new EmbedBuilder();

  const color: number | undefined = guild.members.me?.displayColor;

  embed.setAuthor({
    name: (await quoted).username,
    iconURL: (await quoted).displayAvatarURL({ size: 64 }),
  });
  embed.setDescription(text);
  embed.setFooter({
    text: i18n.t('quote.byUser', { user: ownerUserName }),
    iconURL: (owner && owner.displayAvatarURL({ size: 64 })) || undefined,
  });
  if (date) embed.setTimestamp(date);
  if (color) embed.setColor(color);

  return { embeds: [embed] };
};

type GetUser = ReturnType<typeof createEntityCache>['getUser'];

const addQuote = async (
  params: (string | DiscordUser | Channel | Role | number | boolean)[],
  quotedUser: GuildUser,
  owner: GuildUser,
  guild: Guild,
  i18n: I18n,
  drizzle: DrizzleClient,
  getUser: GetUser,
  date?: Date,
) => {
  const text = params
    .map((param) => {
      if (typeof param === 'string') return param;
      return param.toString();
    })
    .join(' ');

  if (text.length > 2000) {
    return i18n.t('quote.error.quoteSizeLimit');
  }

  const quote: typeof quotes.$inferInsert = {
    text,
    creatorId: owner.id,
    guildUserId: quotedUser.id,
  };

  if (date) quote.date = date.toISOString();
  const [newQuote] = await drizzle.insert(quotes).values(quote).returning({
    id: quotes.id,
    date: quotes.date,
    creatorId: quotes.creatorId,
    guildUserId: quotes.guildUserId,
    text: quotes.text,
  });

  if (!newQuote) {
    return i18n.t('quote.error.quoteNotAdded');
  }

  const quotedDbUser = await getUser({ id: quotedUser.userId });
  const ownerDb = await getUser({ id: owner.userId });

  return getQuoteOptions(guild, newQuote, i18n, quotedDbUser, ownerDb);
};

const getQuotes = async (drizzle: DrizzleClient, guildUser: GuildUser) => {
  const quoteList = await drizzle
    .select()
    .from(quotes)
    .innerJoin(guildUsers, eq(quotes.guildUserId, guildUsers.id))
    .where(eq(guildUsers.id, guildUser.id));

  return quoteList.map((q) => q.quote);
};

const handler: GuildHandler = async ({
  params,
  msg,
  guildUser,
  flags,
  i18n,
  logger,
  getGuildUser,
  getUser,
  drizzle,
}) => {
  const [user] = flags.get('persoon') || params;
  params.shift();
  const quoteToAdd = params.length ? params : flags.get('quote');

  if (!(user instanceof DiscordUser)) {
    return i18n.t('quote.error.noUserGiven');
  }

  const requestingUser = msg.user;

  globalLogger.debug(requestingUser);

  let quotedUser: GuildUser;
  if (requestingUser.id === user.id) quotedUser = guildUser;
  else quotedUser = await getGuildUser(user, msg.guild);

  const quoteList = await getQuotes(drizzle, quotedUser);

  globalLogger.debug(quoteList);

  if (!quoteToAdd || quoteToAdd.length === 0) {
    if (quoteList.length === 0) {
      return i18n.t('quote.noQuoteFound', { user: user.toString() });
    }

    if (quoteList.length < 2 && quoteList[0]) {
      const quoted = await getUser({ id: quotedUser.userId });

      const [ownerGuildUser] = await drizzle
        .select()
        .from(guildUsers)
        .where(eq(guildUsers.id, quoteList[0].creatorId));

      globalLogger.debug(ownerGuildUser);
      const owner =
        (ownerGuildUser && (await getUser({ id: ownerGuildUser.userId }))) ||
        null;

      return getQuoteOptions(msg.guild, quoteList[0], i18n, quoted, owner);
    }

    createMenu({
      logger,
      list: quoteList,
      owner: requestingUser,
      msg,
      title: i18n.t('quote.quoteMenuTitle'),
      mapper: (q) => q.text,
      selectCallback: async (q) => {
        const quoted = await getUser({ id: quotedUser.userId });
        const [ownerGuildUser] = await drizzle
          .select()
          .from(guildUsers)
          .where(eq(guildUsers.id, q.creatorId));
        const owner =
          (ownerGuildUser && (await getUser({ id: ownerGuildUser.userId }))) ||
          null;

        return {
          ...(<InteractionUpdateOptions>(
            await getQuoteOptions(msg.guild, q, i18n, quoted, owner)
          )),
          allowedMentions: {
            users: [],
            roles: [],
          },
        };
      },
    });
    return null;
  }

  const quote = addQuote(
    quoteToAdd,
    quotedUser,
    guildUser,
    msg.guild,
    i18n,
    drizzle,
    getUser,
  );
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
    },
    {
      name: 'quote',
      description: 'Quote you want to add',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
});
router.use('toevoegen', handler, HandlerType.GUILD);

router.useContext(
  'Save As Quote',
  ApplicationCommandType.Message,
  async ({ interaction, i18n, getGuildUser, getUser, drizzle }) => {
    const message = interaction.options.getMessage('message');

    if (!(message instanceof Message)) {
      return 'Onmogelijk pad';
    }

    if (!message.guild) {
      return i18n.t('error.onlyUsableInGuild');
    }

    if (!message.content) return i18n.t('quote.error.noContentInMessage');

    const quoted = await getGuildUser(message.author, message.guild);
    const owner = await getGuildUser(interaction.user, message.guild);

    const quoteMessage = await addQuote(
      message.content.split(' '),
      quoted,
      owner,
      message.guild,
      i18n,
      drizzle,
      getUser,
      message.createdAt,
    );

    if (typeof quoteMessage === 'string') return quoteMessage;

    return {
      ...quoteMessage,
      ephemeral: false,
    };
  },
);

const removeHandler: GuildHandler = async ({
  msg,
  drizzle,
  params,
  guildUser,
  flags,
  i18n,
  logger,
  getGuildUser,
}) => {
  const [user] = flags.get('user') || params;
  if (!(user instanceof DiscordUser)) {
    return i18n.t('quote.error.noUserGiven');
  }

  const requestingUser = msg.user;

  const guToRemoveFrom =
    requestingUser.id === user.id
      ? guildUser
      : await getGuildUser(user, msg.guild);

  // Als iemand zijn eigen quotes ophaalt laat hij alles zien (of als degene admin is)
  // Anders laad alleen de quotes waar hij de creator van is
  const manageEverything = msg.member?.permissions.has(PermissionsBitField.Flags.Administrator) || requestingUser.id === user.id;

  const where = manageEverything ? 
    eq(quotes.guildUserId, guToRemoveFrom.id) : 
    and(
      eq(quotes.creatorId, guildUser.id),
      eq(quotes.guildUserId, guToRemoveFrom.id)
    );

  const quoteList = await drizzle.select().from(quotes)
    .where(where);

  if (quoteList.length < 1) {
    return i18n.t('quote.noQuoteFoundRemove');
  }

  const quotesToRemove: Set<Quote> = new Set<Quote>();

  createMenu({
    logger,
    list: quoteList,
    owner: requestingUser,
    msg,
    title: i18n.t('quote.quoteRemoveMenuTitle'),
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
        async () => {
          await Promise.all(Array.from(quotesToRemove).map((q) => drizzle.delete(quotes).where(eq(quotes.id, q.id))));

          if (quotesToRemove.size > 0) {
            msg.channel.send(
              i18n.t('quote.amountQuotesRemoved', {
                count: quotesToRemove.size,
              }),
            );
          } else msg.channel.send(i18n.t('quote.noQuotesRemoved'));
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
      description: "User you wan't to remove a quote from",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
});
router.use('delete', removeHandler, HandlerType.GUILD);
router.use('verwijder', removeHandler, HandlerType.GUILD);
router.use('verwijderen', removeHandler, HandlerType.GUILD);
router.use('manage', removeHandler, HandlerType.GUILD);

/*
router.use(
  'random',
  async ({ msg, em, i18n }) => {
    const quotes = await em.find(
      Quote,
      { guildUser: { guild: { id: msg.guild.id } } },
      { populate: ['guildUser', 'creator'] },
    );

    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    if (quote) {
      return getQuoteOptions(msg.guild, quote, i18n);
    }

    return i18n.t('quote.guildNoQuotes');
  },
  HandlerType.GUILD,
  {
    description: 'Give a random quote from the server',
  },
);

*/

export default router;
