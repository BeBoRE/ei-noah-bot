import {
  Message, User, Role, Channel, Client, DiscordAPIError,
} from 'discord.js';

export interface RouteInfo {
  msg: Message
  absoluteParams: Array<string | User | Role | Channel>
  params: Array<string | User | Role | Channel>
  flags: string[]
}

export interface Handler {
  (info: RouteInfo) : void | Promise<any>
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

    return client.users.fetch(mention, true);
  }
  return null;
}

export async function messageParser(msg : Message) {
  const splitted = msg.content.split(' ').filter((param) => param);

  splitted.shift();

  const parsed = splitted.map(async (param) => {
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

  const routeInfo : RouteInfo = {
    absoluteParams: resolved,
    params: resolved,
    msg,
    flags: [],
  };

  return routeInfo;
}

export default class Router {
  private routes : RouteList = {};

  private typeOfUserRoute : Router | Handler;

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
  public handle(info: RouteInfo) {
    return new Promise((resolve, reject) => {
      const currentRoute = info.params[0];

      if (typeof currentRoute !== 'string') {
        if (currentRoute instanceof User) {
          if (this.typeOfUserRoute instanceof Router) this.typeOfUserRoute.handle(info);
          else this.typeOfUserRoute(info);
        }
      } else {
        const handler = this.routes[currentRoute.toUpperCase()];

        if (!handler) {
          info.msg.channel.send(`Route \`${info.absoluteParams.join(' ')}\` does not exist`);
        } else {
          const newParams = [...info.params];
          newParams.shift();

          const newInfo : RouteInfo = { ...info, params: newParams };

          if (handler instanceof Router) handler.handle(newInfo).then(resolve).catch(reject);
          else {
            try {
              const handling = handler(newInfo);
              if (handling instanceof Promise) handling.then(resolve).catch(reject);
            } catch (err) {
              reject(err);
            }
          }
        }
      }
    });
  }
}
