import {
  Message, User, Role, Channel, Client, DiscordAPIError, DMChannel,
} from 'discord.js';
import { Category } from './entity/Category';
import { GuildUser } from './entity/GuildUser';
import { getUserGuildData, getCategoryData } from './data';

export interface RouteInfo {
  msg: Message
  absoluteParams: Array<string | User | Role | Channel>
  params: Array<string | User | Role | Channel>
  flags: string[],
  guildUser: GuildUser,
  category: Category
}

export interface Handler {
  (info: RouteInfo) : void | Promise<void>
}

export interface RouteList {
  [path : string]: Router | Handler
}

function getUserFromMention(_mention : string, client : Client) {
  let mention = _mention;

  if (!mention) return null;

  if (mention.startsWith('<@') && mention.endsWith('>')) {
    mention = mention.slice(2, -1);

    if (mention.startsWith('!')) {
      mention = mention.slice(1);
    }

    if (mention.startsWith('&')) {
      return null;
    }

    return client.users.fetch(mention, true);
  }
  return null;
}

function isFlag(argument: string) {
  return argument[0] === '-' && argument.length > 1;
}

export async function messageParser(msg : Message) {
  if (msg.channel instanceof DMChannel) throw new Error('Ja ik steek je neer');

  const splitted = msg.content.split(' ').filter((param) => param);

  const flags = splitted.filter(isFlag).map((rawFlag) => rawFlag.substr(1, rawFlag.length - 1));
  const nonFlags = splitted.filter((argument) => !isFlag(argument));

  nonFlags.shift();

  const parsed = nonFlags.map(async (param) => {
    const user = await getUserFromMention(param, msg.client);

    if (user) return user;
    return param;
  });

  let resolved : Array<User | string>;

  try {
    resolved = await Promise.all(parsed);
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      if (err.httpStatus === 404) throw new Error('Invalid Mention of User, Role or Channel');
      else throw new Error('Unknown Discord Error');
    } else throw new Error('Unknown Parsing error');
  }

  const guildUser = await getUserGuildData(msg.author, msg.guild);
  const category = await getCategoryData(msg.channel.parent);

  const routeInfo : RouteInfo = {
    absoluteParams: resolved,
    params: resolved,
    msg,
    flags,
    guildUser,
    category,
  };

  return routeInfo;
}

export default class Router {
  private routes : RouteList = {};

  private typeOfUserRoute : Handler;

  // Met use geef je aan welk commando waarheen gaat
  public use(route : typeof User, using: Handler) : void
  public use(route : string, using: Router | Handler) : void
  public use(route : any, using: any) : any {
    if (route === User) {
      if (this.typeOfUserRoute) throw new Error('User route already exists');

      if (using instanceof Router) throw new Error('Can\'t use Router on mention routing');

      this.typeOfUserRoute = using;
    } else if (typeof route === 'string') {
      if (this.routes[route]) throw new Error('This Route Already Exists');

      this.routes[route.toUpperCase()] = using;
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
          handler = this.typeOfUserRoute;
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

  public initialize(client : Client) {
    Object.entries(this.routes).forEach(([, route]) => {
      if (route instanceof Router) {
        route.initialize(client);
      }

      if (this.typeOfUserRoute instanceof Router) this.typeOfUserRoute.initialize(client);
    });

    if (this.onInit) this.onInit(client);
  }

  public onInit ?: ((client : Client) => void | Promise<void>) | void;
}
