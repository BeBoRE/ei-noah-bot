import {
  Message, User, Role, Channel, Client,
} from 'discord.js';
import { isString } from 'util';

export interface RouteInfo {
  msg: Message
  absoluteParams: Array<string | Promise<User> | Promise<Role> | Promise<Channel>>
  params: Array<string | Promise<User> | Promise<Role> | Promise<Channel>>
  flags: string[]
}

export interface Handler {
  (info: RouteInfo) : void
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

export function messageParser(msg : Message) {
  const splitted = msg.content.split(' ').filter((param) => param);

  splitted.shift();

  const parsed = splitted.map((param) => {
    const user = getUserFromMention(param, msg.client);

    if (user) return user;
    return param;
  });

  const routeInfo : RouteInfo = {
    absoluteParams: parsed,
    params: parsed,
    msg,
    flags: [],
  };

  return routeInfo;
}

export default class Router {
  private client : Client;

  private routes : RouteList = {};

  public use(route : string, using: Router | Handler) {
    if (this.routes[route]) throw new Error('This Route Already Exists');

    this.routes[route] = using;
  }

  public handle(info: RouteInfo) {
    const currentRoute = info.params[0];

    if (!isString(currentRoute)) {
      info.msg.channel.send('Using mention/ role/ channel as route is currently unsupported');
      return;
    }

    const handler = this.routes[currentRoute];

    if (!handler) {
      info.msg.channel.send(`Route \`${info.absoluteParams.join(' ')}\` does not exist`);
    } else {
      const newParams = [...info.params];
      newParams.shift();

      const newInfo : RouteInfo = { ...info, params: newParams };

      if (handler instanceof Router) handler.handle(newInfo);
      else handler(newInfo);
    }
  }
}
