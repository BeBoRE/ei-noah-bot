import {
  Message, User, Role, Channel, Client, DiscordAPIError, DMChannel, Guild,
} from 'discord.js';
import {
  EntityManager, MikroORM, IDatabaseDriver, Connection,
} from 'mikro-orm';
import { Category } from './entity/Category';
import { GuildUser } from './entity/GuildUser';
import { getUserGuildData, getCategoryData } from './data';

export interface RouteInfo {
  msg: Message
  absoluteParams: Array<string | User | Role | Channel>
  params: Array<string | User | Role | Channel>
  flags: string[],
  guildUser: GuildUser,
  category?: Category,
  em: EntityManager
}

export interface Handler {
  (info: RouteInfo) : void | Promise<void>
}

export interface RouteList {
  [path : string]: Router | Handler
}

function getUserFromMention(_mention : string, client : Client, guild : Guild) {
  let mention = _mention;

  if (!mention) return null;

  if (mention.startsWith('<@') && mention.endsWith('>')) {
    mention = mention.slice(2, -1);

    if (mention.startsWith('!')) {
      mention = mention.slice(1);
    }

    if (mention.startsWith('&')) {
      mention = mention.slice(1);

      if (Number.isNaN(+mention)) { return null; }
      return guild.roles.fetch(mention, true);
    }

    if (Number.isNaN(+mention)) { return null; }
    return client.users.fetch(mention, true);
  }
  return null;
}

function isFlag(argument: string) {
  return argument[0] === '-' && argument.length > 1;
}

export async function messageParser(msg : Message, em: EntityManager) {
  if (msg.channel instanceof DMChannel) throw new Error('Bot niet DMable');

  const splitted = msg.content.split(' ').filter((param) => param);

  const flags = splitted.filter(isFlag).map((rawFlag) => rawFlag.substr(1, rawFlag.length - 1));
  const nonFlags = splitted.filter((argument) => !isFlag(argument));

  nonFlags.shift();

  if (nonFlags[0] && nonFlags[0].toLowerCase() === 'noah') nonFlags.shift();

  const parsed = nonFlags.map(async (param) => {
    const user = await getUserFromMention(param, msg.client, msg.guild);

    if (user) return user;
    return param;
  });

  let resolved : Array<User | string | Role>;

  try {
    resolved = await Promise.all(parsed);
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.httpStatus === 404) throw new Error('Invalid Mention of User, Role or Channel');
      else throw new Error('Unknown Discord Error');
    } else throw new Error('Unknown Parsing error');
  }

  const guildUser = await getUserGuildData(em, msg.author, msg.guild);
  const category = await getCategoryData(em, msg.channel.parent);

  const routeInfo : RouteInfo = {
    absoluteParams: resolved,
    params: resolved,
    msg,
    flags,
    guildUser,
    category,
    em,
  };

  return routeInfo;
}

export default class Router {
  private routes : RouteList = {};

  private userRoute : Handler;

  private nullRoute : Handler;

  private roleRoute : Handler;

  // Met use geef je aan welk commando waarheen gaat
  public use(route : typeof User, using: Handler) : void
  public use(route : typeof Role, using: Handler) : void
  public use(route : string, using: Router | Handler) : void
  public use(route : null, using : Handler) : void
  public use(route : any, using: any) : void {
    if (route === User) {
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

      let handler : Router | Handler;
      let newInfo : RouteInfo = info;

      if (typeof currentRoute !== 'string') {
        if (currentRoute instanceof User) {
          handler = this.userRoute;
        } else if (typeof currentRoute === 'undefined') {
          handler = this.nullRoute;
        } else if (currentRoute instanceof Role) {
          handler = this.roleRoute;
        }
      } else {
        const nameHandler = this.routes[currentRoute.toUpperCase()];

        if (!nameHandler) {
          info.msg.channel.send(`Route \`${info.absoluteParams.join(' ')}\` does not exist`);
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
