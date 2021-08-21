import {
  Client, User as DiscordUser, TextChannel, NewsChannel, Role, Permissions, Guild, Message, DiscordAPIError, Channel, Snowflake, MessageEmbed, MessageAttachment, MessageOptions, ApplicationCommandData, ApplicationCommandOptionData, CommandInteraction, CommandInteractionOption, User, ApplicationCommandSubCommandData,
} from 'discord.js';
import {
  Connection, IDatabaseDriver, MikroORM, EntityManager,
} from '@mikro-orm/core';

import console from 'console';
import LazyRouteInfo from './router/LazyRouteInfo';
import Router, {
  BothHandler, DMHandler, GuildHandler, HandlerReturn, HandlerType, IRouter, RouteInfo,
} from './router/Router';

enum ErrorType {
  Uncaught,
  Unhandled,
}

const errorToChannel = async (channelId : string, client : Client, err : Error, type?: ErrorType) => {
  const errorChannel = await client.channels.fetch(<Snowflake>channelId, { cache: true });
  if (errorChannel instanceof TextChannel
     || errorChannel instanceof NewsChannel
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
  guild : Guild | null) : Array<Promise<Role | DiscordUser | string | Channel>> {
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
  const parsed : Array<Promise<DiscordUser | Channel | Role | string | null>> = [];

  params.forEach((param) => { parsed.push(...mapParams(param, client, guild)); });

  let resolved;

  try {
    resolved = (await Promise.all(parsed)).filter(((item) : item is DiscordUser | Role | string | Channel => !!item));
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

async function messageParser(msg : Message | CommandInteraction, em: EntityManager) {
  const flags = new Map<string, Array<Role | DiscordUser | string | Channel | boolean | number>>();
  const params : Array<Role | DiscordUser | string | Channel> = [];

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
    let command : CommandInteractionOption | CommandInteraction = msg;
    while (command instanceof CommandInteraction || command.type === 'SUB_COMMAND' || command.type === 'SUB_COMMAND_GROUP') {
      if (command instanceof CommandInteraction) { params.push(command.commandName); } else params.push(command.name);
      const nextCommand : CommandInteractionOption | undefined = Array.isArray(command.options) && command.options ? command.options[0] : undefined;
      if (!nextCommand || !(nextCommand.type === 'SUB_COMMAND' || nextCommand.type === 'SUB_COMMAND_GROUP')) break;
      command = nextCommand;
    }

    if (Array.isArray(command.options)) {
      command?.options?.forEach((option) => {
        if (option.type === 'STRING' || option.type === 'BOOLEAN' || option.type === 'INTEGER') {
          if (typeof option.value === 'string') flags.set(option.name, option.value.split(' '));
          if (option.value !== undefined) flags.set(option.name, [option.value]);
        }

        if (option.channel instanceof Channel) flags.set(option.name, [option.channel]);
        if (option.user instanceof User) flags.set(option.name, [option.user]);
        if (option.role instanceof Role) flags.set(option.name, [option.role]);
      });
    }
  }

  const routeInfo : RouteInfo = new LazyRouteInfo({
    params,
    msg,
    flags,
    em,
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
    return msg.channel.send({ ...options });
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

  private readonly orm : MikroORM<IDatabaseDriver<Connection>>;

  private applicationCommandData : ApplicationCommandData[] = [];

  constructor(token : string, orm : MikroORM<IDatabaseDriver<Connection>>) {
    this.token = token;
    this.orm = orm;
  }

  use(route : string, using: BothHandler, type ?: HandlerType.BOTH, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: DMHandler, type : HandlerType.DM, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: GuildHandler, type : HandlerType.GUILD, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: Router | BothHandler) : void
  use(route : string, using: Router | BothHandler | DMHandler | GuildHandler, type?: HandlerType, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route: string, using: any, type: any = HandlerType.BOTH, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>): void {
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

  public onInit ?: ((client : Client, orm : MikroORM<IDatabaseDriver<Connection>>)
  => void | Promise<void>);

  public readonly updateSlashCommands = () => Promise.all([
    this.client.guilds.cache.map((guild) => guild.commands.fetch()
      .then(() => guild.commands.set(this.applicationCommandData))
      .then((commands) => commands))]);

  public async start() {
    const { orm } = this;

    this.client.on('ready', () => {
      console.log('Client online');
    });

    this.client.on('interaction', async (interaction) => {
      if (interaction.isCommand()) {
        const em = orm.em.fork();

        const defer = interaction.deferReply();
        messageParser(interaction, em)
          .then((info) => {
            if (info) { return this.router.handle(info); }
            return 'Er is iets misgegaan, volgende keer beter';
          })
          .then(handlerReturnToMessageOptions)
          .then((options) => Promise.all([options, em.flush()]))
          .then(async ([options]) => {
            if (options) {
              await defer;
              return interaction.followUp(options);
            }
            return null;
          })
          .catch((err) => {
            // Dit wordt gecallt wanneer de parsing faalt
            if (process.env.NODE_ENV !== 'production' && interaction.channel) {
              errorToChannel(interaction.channel.id, interaction.client, err).catch(() => { console.log('Error could not be send :('); });
            } else if (process.env.ERROR_CHANNEL && interaction.channel) {
              interaction.channel.send('Er is iets misgegaan').catch(() => {});
              errorToChannel(process.env.ERROR_CHANNEL, interaction.client, err).catch(() => { console.log('Stel error kanaal in'); });
            }

            console.error(err);
          });
      }
    });

    this.client.on('message', (msg) => {
      if (msg.author !== this.client.user && msg.content) {
        const splitted = msg.content.split(' ').filter((param : string) => param);

        // Raw mention ziet er anders uit wanneer user een nickname heeft
        const botMention = `<@${this.client.user?.id}>`;
        const botNickMention = `<@!${this.client.user?.id}>`;

        let canSendMessage = true;

        if ((msg.channel instanceof TextChannel || msg.channel instanceof NewsChannel) && msg.client.user) {
          if (!msg.channel.permissionsFor(msg.client.user.id)?.has(Permissions.FLAGS.SEND_MESSAGES)) canSendMessage = false;
        }

        if ((splitted[0] === botMention || splitted[0].toUpperCase() === 'EI' || splitted[0] === botNickMention)) {
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

          messageParser(msg, em)
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
      if (process.env.NODE_ENV === 'production') {
        await client.application?.commands.set(this.applicationCommandData);
      }
    };

    // @ts-ignore
    this.router.initialize(this.client, orm);

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
