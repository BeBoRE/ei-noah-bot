import {
  Client, User as DiscordUser, TextChannel, NewsChannel, Role, Permissions, Guild, Message, DiscordAPIError, Channel, Snowflake, MessageEmbed, MessageAttachment, MessageOptions, ApplicationCommandData, ApplicationCommandOptionData, CommandInteraction, CommandInteractionOption, User, ApplicationCommandType, ChatInputApplicationCommandData, InteractionReplyOptions, GuildMember, AutocompleteInteraction, ThreadChannel, AnyChannel,
} from 'discord.js';
import {
  MikroORM,
} from '@mikro-orm/core';
import { EntityManager, PostgreSqlDriver } from '@mikro-orm/postgresql';

import console from 'console';
import { i18n as I18n } from 'i18next';
import LazyAutocompleteRouteInfo from './router/LazyAutocompleteRouteInfo';
import LazyMsgRouteInfo from './router/LazyMsgRouteInfo';
import { GuildUser } from './entity/GuildUser';
import { getUserData, getUserGuildData } from './data';
import ContextMenuInfo from './router/ContextMenuInfo';
import Router, {
  AutocompleteRouteInfo,
  BothHandler, ContextMenuHandler, ContextMenuHandlerInfo, DMHandler, GuildHandler, HandlerReturn, HandlerType, IRouter, MsgRouteInfo,
} from './router/Router';

enum ErrorType {
  Uncaught,
  Unhandled,
}

const errorToChannel = async (channelId : string, client : Client, err : unknown, type?: ErrorType) => {
  const errorChannel = await client.channels.fetch(<Snowflake>channelId, { cache: true });
  if (err instanceof Error && (errorChannel instanceof TextChannel
     || errorChannel instanceof NewsChannel)
  ) {
    let header = '';
    if (type === ErrorType.Uncaught) header = '**Uncaught**';
    if (type === ErrorType.Unhandled) header = '**Unhandled**';
    return errorChannel.send({ content: `${header}\n**${err?.name}**\n\`\`\`${err?.stack}\`\`\`` }).catch(() => { console.error(`${header}\n**${err?.name}**\n\`\`\`${err?.stack}\`\`\``); });
  }

  return null;
};

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
      if (err.httpStatus === 404) throw new Error('Invalid Mention of User, Role or Channel');
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
    while (command instanceof CommandInteraction || command instanceof AutocompleteInteraction || command.type === 'SUB_COMMAND' || command.type === 'SUB_COMMAND_GROUP') {
      if (command instanceof CommandInteraction || command instanceof AutocompleteInteraction) { params.push(command.commandName); } else params.push(command.name);
      const nextCommand : CommandInteractionOption | undefined = Array.isArray(command.options) ? command.options[0] : command.options?.data[0];
      if (!nextCommand || !(nextCommand.type === 'SUB_COMMAND' || nextCommand.type === 'SUB_COMMAND_GROUP')) break;
      command = nextCommand;
    }

    const options = Array.isArray(command.options) ? command.options : command.options?.data;

    options?.forEach((option) => {
      if (option.type === 'STRING' || option.type === 'BOOLEAN' || option.type === 'INTEGER' || option.type === 'NUMBER') {
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

const handlerReturnToMessageOptions = (handlerReturn : HandlerReturn) : MessageOptions | null => {
  if (handlerReturn) {
    if (typeof (handlerReturn) !== 'string') {
      if (handlerReturn instanceof MessageEmbed) return { embeds: [handlerReturn] };
      if (handlerReturn instanceof MessageAttachment) return { files: [handlerReturn] };
      if (Array.isArray(handlerReturn)) {
        const embeds : MessageEmbed[] = [];
        const files : MessageAttachment[] = [];

        handlerReturn.forEach((item) => {
          if (item instanceof MessageEmbed) {
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

const messageSender = (options : MessageOptions | null, msg : Message | CommandInteraction) : Promise<Message | Message[] | null> => {
  if (options && msg.channel) {
    return msg.channel.send({
      allowedMentions: { users: [], roles: [], repliedUser: true },
      reply: { messageReference: msg.id },
      ...options,
    });
  }
  return Promise.resolve(null);
};

class EiNoah implements IRouter {
  public readonly client = new Client({
    intents: ['DIRECT_MESSAGES', 'DIRECT_MESSAGE_TYPING', 'DIRECT_MESSAGE_REACTIONS', 'GUILD_MEMBERS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'GUILDS', 'GUILD_VOICE_STATES'],
    partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'],
  });

  private readonly router = new Router('Ei Noah');

  private readonly token : string;

  private readonly orm : MikroORM<PostgreSqlDriver>;

  private applicationCommandData : ApplicationCommandData[] = [];

  private contextHandlers : Map<string, ContextMenuHandlerInfo> = new Map();

  public i18n : I18n;

  constructor(token : string, orm : MikroORM<PostgreSqlDriver>, i18n : I18n) {
    this.token = token;
    this.orm = orm;
    this.i18n = i18n;
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
      console.log('Client online');
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (interaction.isCommand()) {
        const em = orm.em.fork();

        const defer = interaction.deferReply();
        messageParser(interaction, em, this.i18n)
          .then((info) => {
            if (info) { return this.router.handle(info); }
            return 'Er is iets misgegaan, volgende keer beter';
          })
          .then(handlerReturnToMessageOptions)
          .then((options) => Promise.all([options, em.flush()]))
          .then(async ([options]) => {
            if (options) {
              await defer;
              return interaction.followUp({ allowedMentions: { users: [], roles: [] }, ...options });
            }
            return null;
          })
          .catch((err) => {
            // Dit wordt gecallt wanneer de parsing faalt
            if (process.env.NODE_ENV !== 'production' && interaction.channel) {
              errorToChannel(interaction.channel.id, interaction.client, err).catch(() => { console.log('Error could not be send :('); });
            } else if (process.env.ERROR_CHANNEL) {
              interaction.followUp({ content: 'Er is iets misgegaan', ephemeral: true }).catch(() => {});
              errorToChannel(process.env.ERROR_CHANNEL, interaction.client, err).catch(() => { console.log('Stel error kanaal in'); });
            }

            console.error(err);
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
          .catch((err) => console.log(err));
      }

      if (interaction.isContextMenu()) {
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
          if (interaction.deferred) interaction.followUp(typeof (handlerReturn) === 'string' ? { ...defaultOptions, content: handlerReturn } : { ...defaultOptions, ...handlerReturn });
          else interaction.reply(typeof (handlerReturn) === 'string' ? { ...defaultOptions, content: handlerReturn } : { ...defaultOptions, ...handlerReturn });
        } catch (err) {
          if (interaction.channel && process.env.ERROR_CHANNEL) {
            if (process.env.NODE_ENV !== 'production') {
              errorToChannel(interaction?.channel.id || process.env.ERROR_CHANNEL, interaction.client, err).catch(() => { console.log('Error could not be send :('); });
              return;
            }

            if (interaction.deferred) interaction.followUp({ content: 'Er is iets misgegaan' }).catch(() => { });
            else interaction.reply({ content: 'Er is iets misgegaan', ephemeral: true });
            errorToChannel(process.env.ERROR_CHANNEL, interaction.client, err).catch(() => { console.log('Stel error kanaal in'); });
          }
        }
      }
    });

    this.client.on('messageCreate', (msg) => {
      if (msg.author !== this.client.user && msg.content) {
        const splitted = msg.content.split(' ').filter((param : string) => param);

        // Raw mention ziet er anders uit wanneer user een nickname heeft
        const botMention = `<@${this.client.user?.id}>`;
        const botNickMention = `<@!${this.client.user?.id}>`;

        if ((splitted[0] === botMention || splitted[0].toUpperCase() === 'EI' || splitted[0] === botNickMention)) {
          let canSendMessage = true;
          if (msg.client.user) {
            if (msg.channel instanceof TextChannel || msg.channel instanceof NewsChannel) {
              if (!msg.channel.permissionsFor(msg.client.user.id)?.has(Permissions.FLAGS.SEND_MESSAGES)) {
                canSendMessage = false;
              }
            }

            if (msg.channel instanceof ThreadChannel) {
              if (!msg.channel.permissionsFor(msg.client.user.id)?.has(Permissions.FLAGS.SEND_MESSAGES_IN_THREADS)) canSendMessage = false;
            }
          }

          if (!canSendMessage) {
            if (msg.member && msg.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
              msg.author.send('Ik kan toch niet in dat kanaal praten, doe je fucking werk of ik steek je neer').catch(() => { });
              return;
            }

            msg.author.send('Ik kan niet in dat kanaal reageren, kunnen die klote admins niet hun werk doen??').catch(() => { });
            return;
          }

          msg.channel.sendTyping().catch(() => { });

          const em = orm.em.fork();

          if (process.env.NODE_ENV !== 'production') console.time(`${msg.id}`);

          messageParser(msg, em, this.i18n)
            .then((info) => {
              if (!info) return 'Ongeldige user(s), role(s) en/of channel(s) gegeven';

              return this.router.handle(info);
            })
            .then(handlerReturnToMessageOptions)
            .then((options) => Promise.all([options, em.flush()]))
            .then(([options]) => {
              if (process.env.NODE_ENV !== 'production') console.timeEnd(`${msg.id}`);
              return options;
            })
            .then((options) => messageSender(options, msg))
            .catch((err) => {
              if (process.env.NODE_ENV !== 'production') console.timeEnd(`${msg.id}`);
              // Dit wordt gecallt wanneer de parsing faalt
              if (process.env.NODE_ENV !== 'production') {
                errorToChannel(msg.channel.id, msg.client, err).catch(() => { console.log('Error could not be send :('); });
              } else if (process.env.ERROR_CHANNEL) {
                msg.channel.send('Er is iets misgegaan').catch(() => {});
                errorToChannel(process.env.ERROR_CHANNEL, msg.client, err).catch(() => { console.log('Stel error kanaal in'); });
              }

              console.error(err);
            });
        }
      }
    });

    this.client.on('rateLimit', ({
      timeout, limit, method, path, global,
    }) => {
      console.log([
        '**Rate Limit**',
        `Global: ${global}`,
        `Method: ${method}`,
        `Path: ${path}`,
        `Limit: ${limit}`,
        `Timeout: ${timeout}`].join('\n'));
    });

    await this.client.login(this.token);

    this.router.onInit = async (client) => {
      if (this.onInit) await this.onInit(client, orm);

      this.contextHandlers.forEach((info, name) => {
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
      if (process.env.ERROR_CHANNEL) await errorToChannel(process.env.ERROR_CHANNEL, this.client, err, ErrorType.Uncaught);
    });

    process.on('unhandledRejection', (err) => {
      if (err instanceof Error && process.env.ERROR_CHANNEL) {
        errorToChannel(process.env.ERROR_CHANNEL, this.client, err, ErrorType.Unhandled);
      }
    });
  }
}

export default EiNoah;
