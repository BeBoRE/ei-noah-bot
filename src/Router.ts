import {
  Message,
  User as DiscordUser,
  Role, Channel,
  Client,
  MessageOptions,
  StringResolvable,
  MessageAdditions,
} from 'discord.js';
import {
  EntityManager, MikroORM, IDatabaseDriver, Connection,
} from '@mikro-orm/core';
import { Category } from './entity/Category';
import { GuildUser } from './entity/GuildUser';
import { User } from './entity/User';

export interface RouteInfo {
  msg: Message
  absoluteParams: Array<string | DiscordUser | Role | Channel>
  params: Array<string | DiscordUser | Role | Channel>
  flags: Map<string, Array<string | DiscordUser | Role | Channel>>,
  readonly guildUser: Promise<GuildUser> | null,
  readonly user: Promise<User>,
  readonly category: Promise<Category> | null,
  em: EntityManager
}
export type HandlerReturn =
  (MessageOptions & {content: StringResolvable}) | MessageAdditions | string | null;

export interface Handler {
  (info: RouteInfo) : HandlerReturn | Promise<HandlerReturn>
}

interface RouteList {
  [path : string]: Router | Handler
}

export default class Router {
  private routes : RouteList = {};

  private userRoute ?: Handler;

  private nullRoute ?: Handler;

  private roleRoute ?: Handler;

  // Met use geef je aan welk commando waarheen gaat
  public use(route : typeof DiscordUser, using: Handler) : void
  public use(route : typeof Role, using: Handler) : void
  public use(route : string, using: Router | Handler) : void
  public use(route : null, using : Handler) : void
  public use(route : any, using: any) : void {
    if (route === DiscordUser) {
      if (this.userRoute) throw new Error('User route already exists');

      if (using instanceof Router) throw new Error('Can\'t use Router on mention routing');

      this.userRoute = using;
    } else if (route === Role) {
      if (this.roleRoute) throw new Error('Role route already exists');

      if (using instanceof Router) throw new Error('Can\'t use Router on mention routing');

      this.roleRoute = using;
    } else if (typeof route === 'string') {
      if (this.routes[route]) throw new Error('This Route Already Exists');

      this.routes[route.toUpperCase()] = using;
    } else if (route === null) {
      this.nullRoute = using;
    }
  }

  // INTERNAL
  // Zorgt dat de commando's op de goede plek terecht komen
  protected handle(info: RouteInfo) : Promise<HandlerReturn> {
    return new Promise((resolve, reject) => {
      const currentRoute = info.params[0];

      let handler : Router | Handler | undefined;
      let newInfo : RouteInfo = info;

      if (typeof currentRoute !== 'string') {
        if (currentRoute instanceof DiscordUser) {
          handler = this.userRoute;
        } else if (typeof currentRoute === 'undefined') {
          handler = this.nullRoute;
        } else if (currentRoute instanceof Role) {
          handler = this.roleRoute;
        }
      } else {
        const nameHandler = this.routes[currentRoute.toUpperCase()];

        if (!nameHandler) {
          info.msg.channel.send(`Ja ik heb toch geen idee wat \`${info.absoluteParams.map((param) => {
            if (typeof param === 'string') return param;
            if (param instanceof Role) return `@${param.name}`;
            if (param instanceof DiscordUser) return `@${param.username}`;
            return '[UNKNOWN]';
          }).join(' ')}\` moet betekenen`);
        } else {
          const newParams = [...info.params];
          newParams.shift();

          newInfo = { ...info, params: newParams };
          handler = nameHandler;
        }
      }

      if (handler) {
        if (handler instanceof Router) {
          handler.handle(newInfo).then(resolve).catch(reject);
        } else {
          try {
            const handling = handler(newInfo);
            if (handling instanceof Promise) handling.then(resolve).catch(reject);
            else resolve(handling);
          } catch (err) {
            reject(err);
          }
        }
      } else {
        resolve(null);
      }
    });
  }

  protected initialize(client : Client, orm : MikroORM<IDatabaseDriver<Connection>>) {
    Object.entries(this.routes).forEach(([, route]) => {
      if (route instanceof Router) {
        route.initialize(client, orm);
      }

      if (this.userRoute instanceof Router) this.userRoute.initialize(client, orm);
    });

    if (this.onInit) this.onInit(client, orm);
  }

  public onInit ?: ((client : Client, orm : MikroORM<IDatabaseDriver<Connection>>)
  => void | Promise<void>);
}
