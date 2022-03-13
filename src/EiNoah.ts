import {
  Client, User as DiscordUser, Role, Guild, Message, DiscordAPIError, Channel, Snowflake, Embed, MessageAttachment, ApplicationCommandData, ApplicationCommandOptionData, CommandInteraction, CommandInteractionOption, User, ApplicationCommandType, ChatInputApplicationCommandData, InteractionReplyOptions, GuildMember, AutocompleteInteraction, AnyChannel, ApplicationCommandOptionType, GatewayIntentBits, Partials,
} from 'discord.js';
import {
  MikroORM,
} from '@mikro-orm/core';
import { EntityManager, PostgreSqlDriver } from '@mikro-orm/postgresql';

import { i18n as I18n } from 'i18next';
import { Logger } from 'winston';
import LazyAutocompleteRouteInfo from './router/LazyAutocompleteRouteInfo';
import LazyMsgRouteInfo from './router/LazyMsgRouteInfo';
import { GuildUser } from './entity/GuildUser';
import { getUserData, getUserGuildData } from './data';
import ContextMenuInfo from './router/ContextMenuInfo';
import Router, {
  AutocompleteRouteInfo,
  BothHandler, ContextMenuHandler, ContextMenuHandlerInfo, DMHandler, GuildHandler, HandlerReturn, HandlerType, IRouter, MsgRouteInfo,
} from './router/Router';

function mapParams(mention : string,
  client : Client,
  guild : Guild | null) : Array<Promise<Role | DiscordUser | string | AnyChannel>> {
  const seperated : string[] = [];

  const matches = mention.match(/<(@[!&]?|#)[0-9]+>/g);
  if (matches) {
    let index = 0;
    matches.forEach((match) => {
      const found = mention.indexOf(match, index);
      if (found !== index) seperated.push(mention.substring(index, found));
      seperated.push(mention.substr(found, match.length));

      index = found + match.length;
    });
    if (index < mention.length) {
      seperated.push(mention.substring(index, mention.length));
    }
  } else {
    seperated.push(mention);
  }

  return seperated.map((param) => {
    const user = param.match(/<@!?([0-9]+)>/);
    if (user) return client.users.fetch(<Snowflake>user[1], { cache: true });

    const role = param.match(/<@&([0-9]+)>/);
    if (role && guild) {
      return guild.roles.fetch(<Snowflake>role[1], { cache: true }).then((r) => {
        if (!r) throw new Error('Role not found');

        return r;
      });
    }

    const channel = param.match(/<#([0-9]+)>/);
    if (channel && guild) {
      return client.channels.fetch(<Snowflake>channel[1], { cache: true }).then((c) => {
        if (!c) throw new Error('Channel not found');

        return c;
      });
    }

    return Promise.resolve(param);
  });
}

export async function parseParams(params : string[], client : Client, guild : Guild | null) {
  const parsed : Array<Promise<DiscordUser | AnyChannel | Role | string | null>> = [];

  params.forEach((param) => { parsed.push(...mapParams(param, client, guild)); });

  let resolved;

  try {
    resolved = (await Promise.all(parsed)).filter(((item) : item is DiscordUser | Role | string | AnyChannel => !!item));
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.status === 404) throw new Error('Invalid Mention of User, Role or Channel');
      else throw new Error('Unknown Discord Error');
    } else throw new Error('Unknown Parsing error');
  }

  return resolved;
}

function isFlag(argument: string) {
  return argument[0] === '-' && argument.length > 1;
}

async function messageParser(msg : AutocompleteInteraction, em: EntityManager, i18n : I18n) : Promise<AutocompleteRouteInfo | null>;
async function messageParser(msg : Message | CommandInteraction, em: EntityManager, i18n : I18n) : Promise<MsgRouteInfo | null>;
async function messageParser(msg : Message | CommandInteraction | AutocompleteInteraction, em: EntityManager, i18n : I18n) : Promise<AutocompleteRouteInfo | MsgRouteInfo | null> {
  const flags = new Map<string, Array<Role | DiscordUser | string | AnyChannel | boolean | number>>();
  const params : Array<Role | DiscordUser | string | AnyChannel> = [];
  const user = msg instanceof Message ? msg.author : msg.user;
  const guildUserOrUser = msg.guild ? getUserGuildData(em, user, msg.guild) : getUserData(em, user);

  if (msg instanceof Message) {
    if (!msg.content) throw new Error('Message heeft geen content');

    const splitted = msg.content.split(' ').filter((param) => param);

    splitted.shift();

    if (splitted[0] && splitted[0].toLowerCase() === 'noah') splitted.shift();

    const resolved = await parseParams(splitted, msg.client, msg.guild).catch(() => null);

    if (!resolved) return null;

    let flag : string | null = null;
    resolved.forEach((param) => {
      if (typeof param === 'string' && isFlag(param)) {
        flag = param.substr(1, param.length - 1).toLowerCase();
        flags.set(flag, []);
        return;
      }

      if (flag) {
        flags.get(flag)?.push(param);
        return;
      }

      params.push(param);
    });
  } else {
    let command : CommandInteractionOption | CommandInteraction | AutocompleteInteraction = msg;
    while (command instanceof CommandInteraction || command instanceof AutocompleteInteraction || command.type === ApplicationCommandOptionType.Subcommand || command.type === ApplicationCommandOptionType.SubcommandGroup) {
      if (command instanceof CommandInteraction || command instanceof AutocompleteInteraction) { params.push(command.commandName); } else params.push(command.name);
      const nextCommand : CommandInteractionOption | undefined = Array.isArray(command.options) ? command.options[0] : command.options?.data[0];
      if (!nextCommand || !(nextCommand.type === ApplicationCommandOptionType.Subcommand || nextCommand.type === ApplicationCommandOptionType.SubcommandGroup)) break;
      command = nextCommand;
    }

    const options = Array.isArray(command.options) ? command.options : command.options?.data;

    options?.forEach((option) => {
      if (option.type === ApplicationCommandOptionType.String || option.type === ApplicationCommandOptionType.Boolean || option.type === ApplicationCommandOptionType.Integer || option.type === ApplicationCommandOptionType.Number) {
        if (typeof option.value === 'string') flags.set(option.name, option.value.split(' '));
        if (option.value !== undefined) flags.set(option.name, [option.value]);
      }

      if (option.channel instanceof Channel) flags.set(option.name, [option.channel]);
      if (option.user instanceof User) flags.set(option.name, [option.user]);
      if (option.role instanceof Role) flags.set(option.name, [option.role]);
    });
  }

  const awaitedGuildUserOrUser = await guildUserOrUser;
  const language = (awaitedGuildUserOrUser instanceof GuildUser ? (awaitedGuildUserOrUser.user.language || awaitedGuildUserOrUser.guild.language) : awaitedGuildUserOrUser.language);

  const newI18n = i18n.cloneInstance({ lng: language || 'nl' });

  if (msg instanceof AutocompleteInteraction) {
    return new LazyAutocompleteRouteInfo({
      params,
      msg,
      flags,
      em,
      guildUserOrUser: await guildUserOrUser,
      i18n: newI18n,
    });
  }

  const routeInfo : MsgRouteInfo = new LazyMsgRouteInfo({
    params,
    msg,
    flags,
    em,
    guildUserOrUser: await guildUserOrUser,
    i18n: newI18n,
  });

  return routeInfo;
}

const handlerReturnToMessageOptions = (handlerReturn : HandlerReturn) : InteractionReplyOptions | null => {
  if (handlerReturn) {
    if (typeof (handlerReturn) !== 'string') {
      if (handlerReturn instanceof Embed) return { embeds: [handlerReturn] };
      if (handlerReturn instanceof MessageAttachment) return { files: [handlerReturn] };
      if (Array.isArray(handlerReturn)) {
        const embeds : Embed[] = [];
        const files : MessageAttachment[] = [];

        handlerReturn.forEach((item) => {
          if (item instanceof Embed) {
            embeds.push(item);
            return;
          }

          files.push(item);
        });

        if (!embeds.length && !files.length) return null;
        return {
          embeds,
          files,
        };
      }

      return handlerReturn;
    }

    if (handlerReturn.length > 2000) {
      const attachment = new MessageAttachment(Buffer.from(handlerReturn));
      attachment.contentType = 'txt';
      attachment.name = 'text.txt';

      return {
        files: [attachment],
      };
    }

    return { content: handlerReturn };
  }

  return null;
};

class EiNoah implements IRouter {
  public readonly client = new Client({
    intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    partials: [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message, Partials.Reaction],
  });

  private readonly router = new Router('Ei Noah');

  private readonly token : string;

  private readonly orm : MikroORM<PostgreSqlDriver>;

  private readonly logger : Logger;

  private applicationCommandData : ApplicationCommandData[] = [];

  private contextHandlers : Map<string, ContextMenuHandlerInfo> = new Map();

  public i18n : I18n;

  constructor(token : string, orm : MikroORM<PostgreSqlDriver>, i18n : I18n, logger : Logger) {
    this.token = token;
    this.orm = orm;
    this.i18n = i18n;
    this.logger = logger;
  }

  use(route : string, using: BothHandler, type ?: HandlerType.BOTH, commandData?: Omit<ChatInputApplicationCommandData, 'name' | 'type'>) : void
  use(route : string, using: DMHandler, type : HandlerType.DM, commandData?: Omit<ChatInputApplicationCommandData, 'name' | 'type'>) : void
  use(route : string, using: GuildHandler, type : HandlerType.GUILD, commandData?: Omit<ChatInputApplicationCommandData, 'name' | 'type'>) : void
  use(route : string, using: Router | BothHandler) : void
  use(route : string, using: Router | BothHandler | DMHandler | GuildHandler, type?: HandlerType, commandData?: Omit<ChatInputApplicationCommandData, 'name' | 'type'>) : void
  use(route: string, using: any, type: any = HandlerType.BOTH, commandData?: Omit<ChatInputApplicationCommandData, 'name' | 'type'>): void {
    this.router.use(route, using, type);

    if (using instanceof Router) {
      const commandDataList : ApplicationCommandOptionData[] = [];
      using.commandDataList.forEach((value, key) => {
        commandDataList.push({
          name: key,
          ...value,
        });
      });

      if (commandDataList.length) {
        this.applicationCommandData.push({
          name: route,
          description: using.description,
          options: commandDataList,
        });
      }

      using.contextHandlers.forEach((info, key) => {
        if (this.contextHandlers.has(key)) throw new Error('ContextHandler already uses this name');

        this.contextHandlers.set(key, info);
      });
    }

    if (commandData) {
      if (typeof route === 'string') {
        this.applicationCommandData.push({
          name: route,
          ...commandData,
        });
      }
    }
  }

  public useContext(name : string, type : Exclude<ApplicationCommandType, 'CHAT_INPUT'>, handler : ContextMenuHandler) : void {
    if (this.contextHandlers.has(name)) throw new Error('There is already a context menu handler with that name');

    this.contextHandlers.set(name, {
      type,
      handler,
    });
  }

  public onInit ?: ((client : Client, orm : MikroORM<PostgreSqlDriver>)
  => void | Promise<void>);

  public readonly updateSlashCommands = () => Promise.all(
    this.client.guilds.cache.map((guild) => guild.commands.fetch()
      .then(() => guild.commands.set(this.applicationCommandData))
      .then((commands) => commands)),
  );

  public async start() {
    const { orm } = this;

    this.client.on('ready', () => {
      this.logger.info('Client online');
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isCommand()) {
        const em = orm.em.fork();

        messageParser(interaction, em, this.i18n)
          .then((info) => {
            if (info) { return this.router.handle(info); }
            return 'Er is iets misgegaan, volgende keer beter';
          })
          .then(handlerReturnToMessageOptions)
          .then((options) => Promise.all([options, em.flush()]))
          .then(async ([options]) => {
            if (options) {
              if (interaction.deferred) return interaction.followUp({ allowedMentions: { users: [], roles: [] }, ...options });
              return interaction.reply({ allowedMentions: { users: [], roles: [] }, ...options });
            }
            return null;
          })
          .catch((err) => {
            if (interaction.deferred) {
              interaction.followUp({ content: 'Er is iets misgegaan', ephemeral: true }).catch(() => {});
            } else interaction.reply({ content: 'Er is iets misgegaan', ephemeral: true }).catch(() => {});

            this.logger.error('Command interaction handeling error', {
              error: err,
            });
          });
      }

      if (interaction.isAutocomplete()) {
        const em = orm.em.fork();
        messageParser(interaction, em, this.i18n)
          .then((info) => {
            if (!info) return [{ name: 'Er is iets misgegaan', value: 'error' }];
            return this.router.handle(info);
          })
          .then((options) => interaction.respond(options))
          .catch((err) => { this.logger.error('Autocomplete handeling error', { error: err }); });
      }

      if (interaction.isContextMenuCommand()) {
        const em = orm.em.fork();
        const guildUserOrUser = interaction.member instanceof GuildMember ? await getUserGuildData(em, interaction.member.user, interaction.member.guild) : await getUserData(em, interaction.user);

        const handler = this.contextHandlers.get(interaction.commandName);
        if (!handler) {
          interaction.reply({ content: 'Kon deze actie niet vinden', ephemeral: true });
          return;
        }

        const i18n = this.i18n.cloneInstance();
        i18n.changeLanguage(guildUserOrUser instanceof GuildUser ? guildUserOrUser.user.language || guildUserOrUser.guild.language : guildUserOrUser.language);

        try {
          const handlerReturn = await handler.handler(new ContextMenuInfo(interaction, guildUserOrUser, em, i18n));
          const defaultOptions : InteractionReplyOptions = {
            allowedMentions: {
              roles: [],
              users: [],
            },
            ephemeral: true,
          };

          await em.flush();
          if (interaction.deferred) await interaction.followUp(typeof (handlerReturn) === 'string' ? { ...defaultOptions, content: handlerReturn } : { ...defaultOptions, ...handlerReturn });
          else await interaction.reply(typeof (handlerReturn) === 'string' ? { ...defaultOptions, content: handlerReturn } : { ...defaultOptions, ...handlerReturn });
        } catch (err) {
          if (interaction.channel && process.env.ERROR_CHANNEL) {
            if (interaction.deferred) interaction.followUp({ content: 'Er is iets misgegaan' }).catch(() => { });
            else interaction.reply({ content: 'Er is iets misgegaan', ephemeral: true });

            this.logger.error('ContextMenu handling error', { error: err });
          }
        }
      }
    });

    this.client.on('rateLimit', ({
      timeout, limit, method, path, global,
    }) => {
      this.logger.warn('Rate Limit', {
        meta: {
          global,
          method,
          path,
          limit,
          timeout,
        },
      });
    });

    await this.client.login(this.token);

    this.router.onInit = async (client) => {
      if (this.onInit) await this.onInit(client, orm);

      this.contextHandlers.forEach((info, name) => {
        // TODO: Dit weer weghalen na release V14
        // @ts-ignore
        this.applicationCommandData.push({
          name,
          type: info.type,
        });
      });

      if (process.env.NODE_ENV === 'production') {
        await client.application?.commands.set(this.applicationCommandData);
      }
    };

    // @ts-ignore
    this.router.initialize(this.client, orm, this.i18n);

    process.on('uncaughtException', async (err) => {
      this.logger.error('UncaughtError', {
        level: 'error',
        message: 'UncaughtError',
        error: err,
      });
    });

    process.on('unhandledRejection', (err) => {
      this.logger.error('UnhandledRejection', {
        error: err,
      });
    });
  }
}

export default EiNoah;
