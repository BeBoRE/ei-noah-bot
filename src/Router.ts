import {
  Message,
  User as DiscordUser,
  Role, Channel,
  Client,
  DiscordAPIError,
  TextChannel,
  NewsChannel,
  Guild,
} from 'discord.js';
import {
  EntityManager, MikroORM, IDatabaseDriver, Connection,
} from 'mikro-orm';
import { Category } from './entity/Category';
import { GuildUser } from './entity/GuildUser';
import { getUserGuildData, getCategoryData, getUserData } from './data';
import { User } from './entity/User';

export interface RouteInfo {
  msg: Message
  absoluteParams: Array<string | DiscordUser | Role | Channel>
  params: Array<string | DiscordUser | Role | Channel>
  flags: string[],
  guildUser: GuildUser | null,
  user: User,
  category: Category | null,
  em: EntityManager
}

export interface Handler {
  (info: RouteInfo) : void | Promise<void>
}

export interface RouteList {
  [path : string]: Router | Handler
}

function mapParams(_mention : string,
  client : Client,
  guild : Guild | null) : Array<Promise<Role | DiscordUser | string | null>> {
  const mention = _mention;

  const seperated = mention.match(/(<@!*[0-9]+>|<@&[0-9]+>|[<]|[^<]+)/g);

  if (seperated) {
    return seperated.map((param) => {
      const user = param.match(/<@!*([0-9]+)>/);
      if (user) return client.users.fetch(user[1], true);

      const role = param.match(/<@&*([0-9]+)>/);
      if (role && guild) return guild.roles.fetch(role[1], true);

      return Promise.resolve(param);
    });
  }

  return [Promise.resolve(null)];
}

function isFlag(argument: string) {
  return argument[0] === '-' && argument.length > 1;
}

export async function messageParser(msg : Message, em: EntityManager) {
  if (!msg.content) throw new Error('Message heeft geen content');

  const splitted = msg.content.split(' ').filter((param) => param);

  const flags = splitted.filter(isFlag).map((rawFlag) => rawFlag.substr(1, rawFlag.length - 1));
  const nonFlags = splitted.filter((argument) => !isFlag(argument));

  nonFlags.shift();

  if (nonFlags[0] && nonFlags[0].toLowerCase() === 'noah') nonFlags.shift();

  const parsed : Array<Promise<DiscordUser | Role | string | null>> = [];

  nonFlags.forEach((param) => { parsed.push(...mapParams(param, msg.client, msg.guild)); });

  let resolved;

  try {
    resolved = (await Promise.all(parsed)).filter(((item) : item is DiscordUser | Role => !!item));
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.httpStatus === 404) throw new Error('Invalid Mention of User, Role or Channel');
      else throw new Error('Unknown Discord Error');
    } else throw new Error('Unknown Parsing error');
  }

  let guildUser;
  if (msg.guild) {
    guildUser = await getUserGuildData(em, msg.author, msg.guild);
  } else guildUser = null;

  let category;
  if (msg.channel instanceof TextChannel || msg.channel instanceof NewsChannel) {
    category = await getCategoryData(em, msg.channel.parent);
  } else category = null;

  let user;
  if (!guildUser) { user = await getUserData(em, msg.author); } else user = guildUser.user;

  const routeInfo : RouteInfo = {
    absoluteParams: resolved,
    params: resolved,
    msg,
    flags,
    guildUser,
    user,
    category,
    em,
  };

  return routeInfo;
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
  public handle(info: RouteInfo) : Promise<void> {
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
            else resolve();
          } catch (err) {
            reject(err);
          }
        }
      }
    });
  }

  public initialize(client : Client, orm : MikroORM<IDatabaseDriver<Connection>>) {
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
