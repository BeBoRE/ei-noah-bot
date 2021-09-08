import {
  Message,
  User as DiscordUser,
  Role, Channel,
  Client,
  MessageOptions,
  TextChannel,
  NewsChannel,
  DMChannel,
  Guild,
  GuildMember,
  MessageEmbed,
  MessageAttachment,
  CommandInteraction,
  ApplicationCommandSubCommandData,
  InteractionReplyOptions,
  ApplicationCommandType,
} from 'discord.js';
import {
  MikroORM,
} from '@mikro-orm/core';
import { EntityManager, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Category } from '../entity/Category';
import { GuildUser } from '../entity/GuildUser';
import { User } from '../entity/User';
import ContextMenuInfo from './ContextMenuInfo';

export interface RouteInfo {
  msg: Message | CommandInteraction
  absoluteParams: Array<string | DiscordUser | Role | Channel>
  params: Array<string | DiscordUser | Role | Channel>
  flags: Map<string, Array<string | DiscordUser | Role | Channel | boolean | number>>,
  readonly guildUser: Promise<GuildUser> | null,
  readonly user: Promise<User>,
  readonly category: Promise<Category> | null,
  em : EntityManager
}

type BothRouteInfo = (DMRouteInfo | GuildRouteInfo);

export interface DMRouteInfo extends RouteInfo {
  msg: (Message | CommandInteraction) & {
    channel: DMChannel
    guild : null
    member : null
  }
  readonly guildUser: null,
  readonly category: null,
}

export interface GuildRouteInfo extends RouteInfo {
  msg: (Message | CommandInteraction) & {
    channel: TextChannel | NewsChannel
    guild : Guild
    member : GuildMember
  }
  readonly guildUser: Promise<GuildUser>,
  readonly category: null | Promise<Category>,
}

export type HandlerReturn =
  MessageOptions | MessageEmbed | MessageAttachment | (MessageEmbed | MessageAttachment)[] | string | null;

export enum HandlerType {
  DM = 'dm',
  GUILD = 'guild',
  BOTH = 'both'
}

export interface BothHandler {
  (info: BothRouteInfo) : HandlerReturn | Promise<HandlerReturn>
}

export interface BothHandlerWithIndicator {
  (info: BothRouteInfo) : HandlerReturn | Promise<HandlerReturn>,
  type : HandlerType.BOTH
}

export interface DMHandler {
  (info: DMRouteInfo) : HandlerReturn | Promise<HandlerReturn>,
}

export interface DMHandlerWithIndicator {
  (info: DMRouteInfo) : HandlerReturn | Promise<HandlerReturn>,
  type : HandlerType.DM
}

export interface GuildHandler {
  (info: GuildRouteInfo) : HandlerReturn | Promise<HandlerReturn>
}

export interface GuildHandlerWithIndicator {
  (info: GuildRouteInfo) : HandlerReturn | Promise<HandlerReturn>,
  type : HandlerType.GUILD
}

interface RouteList {
  [path : string]: Router | BothHandlerWithIndicator | DMHandlerWithIndicator | GuildHandlerWithIndicator | undefined;
}

export interface IRouter {
  use(route : string, using: BothHandler, type ?: HandlerType.BOTH, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: DMHandler, type : HandlerType.DM, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: GuildHandler, type : HandlerType.GUILD, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: Router | BothHandler) : void
  use(route : string, using: Router | BothHandler | DMHandler | GuildHandler, type ?: HandlerType, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void

  onInit ?: ((client : Client, orm : MikroORM<PostgreSqlDriver>)
  => void | Promise<void>)
}

export type ContextMenuHandler = (info : ContextMenuInfo) => InteractionReplyOptions | string | Promise<InteractionReplyOptions | string>;
export interface ContextMenuHandlerInfo {
  type: Exclude<ApplicationCommandType, 'CHAT_INPUT'>
  handler : ContextMenuHandler
}

export default class Router implements IRouter {
  public readonly description : string;

  constructor(description : string) {
    this.description = description;
  }

  private routes : RouteList = {};

  private _isInitialized : boolean = false;

  public get isInitialized() {
    // eslint-disable-next-line no-underscore-dangle
    return this._isInitialized;
  }

  public commandDataList : Map<string, Omit<ApplicationCommandSubCommandData, 'name'>> = new Map();

  public contextHandlers : Map<string, ContextMenuHandlerInfo> = new Map();

  // Met use geef je aan welk commando waarheen gaat
  use(route : string, using: BothHandler, type ?: HandlerType.BOTH, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: DMHandler, type : HandlerType.DM, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: GuildHandler, type : HandlerType.GUILD, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void
  use(route : string, using: Router | BothHandler) : void
  use(route : string, using: Router | BothHandler | DMHandler | GuildHandler, type: HandlerType = HandlerType.BOTH, commandData?: Omit<ApplicationCommandSubCommandData, 'name' | 'type'>) : void {
    const newUsing = <Router | BothHandlerWithIndicator | DMHandlerWithIndicator | GuildHandlerWithIndicator>using;

    if (this.routes[route]) throw new Error('This Route Already Exists');

    if (!(newUsing instanceof Router)) {
      newUsing.type = type;
    }

    this.routes[route.toUpperCase()] = newUsing;

    if (commandData) this.commandDataList.set(route.toLowerCase(), { ...commandData, type: 'SUB_COMMAND' });
  }

  public useContext(name : string, type : Exclude<ApplicationCommandType, 'CHAT_INPUT'>, handler : ContextMenuHandler) : void {
    if (this.contextHandlers.has(name)) throw new Error('There is already a context menu handler with that name');

    this.contextHandlers.set(name, {
      type,
      handler,
    });
  }

  // INTERNAL
  // Zorgt dat de commando's op de goede plek terecht komen
  public handle(info: RouteInfo) : Promise<HandlerReturn> {
    return new Promise((resolve, reject) => {
      const currentRoute = info.params[0];

      let handler : Router | BothHandlerWithIndicator | DMHandlerWithIndicator | GuildHandlerWithIndicator | undefined;
      const newInfo = info;

      if (typeof currentRoute === 'string') {
        const nameHandler = this.routes[currentRoute.toUpperCase()];

        if (nameHandler) {
          const newParams = [...info.params];
          newParams.shift();

          newInfo.params = newParams;
          handler = nameHandler;
        }
      }

      if (!handler) {
        handler = this.routes.HELP;
      }

      if (handler) {
        if (handler instanceof Router) {
          handler.handle(newInfo).then(resolve).catch(reject);
        } else {
          try {
            let handling : HandlerReturn | Promise<HandlerReturn>;

            if (handler.type === HandlerType.DM) {
              if (newInfo.msg.guild) {
                handling = 'Commando kan alleen in server gebruikt worden';
              } else {
                handling = handler(<DMRouteInfo>newInfo);
              }
            } else if (handler.type === HandlerType.GUILD) {
              if (!newInfo.msg.guild) {
                handling = 'Commando kan alleen in DMs gebruikt worden';
              } else {
                handling = handler(<GuildRouteInfo>newInfo);
              }
            } else {
              handling = handler(<BothRouteInfo>newInfo);
            }

            if (handling instanceof Promise) handling.then(resolve).catch(reject);
            else resolve(handling);
          } catch (err) {
            reject(err);
          }
        }
      } else {
        resolve(`Ja ik heb toch geen idee wat \`${info.absoluteParams.map((param) => {
          if (typeof param === 'string') return param;
          if (param instanceof Role) return `@${param.name}`;
          if (param instanceof DiscordUser) return `@${param.username}`;
          return '[UNKNOWN]';
        }).join(' ')}\` moet betekenen`);
      }
    });
  }

  protected initialize(client : Client, orm : MikroORM<PostgreSqlDriver>) {
    Object.entries(this.routes).forEach(([, route]) => {
      if (route instanceof Router && !route.isInitialized) {
        route.initialize(client, orm);
      }
    });

    if (this.onInit) {
      this.onInit(client, orm);
      // eslint-disable-next-line no-underscore-dangle
      this._isInitialized = true;
    }
  }

  public onInit ?: ((client : Client, orm : MikroORM<PostgreSqlDriver>)
  => void | Promise<void>);
}
