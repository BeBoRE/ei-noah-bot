import { Message } from 'discord.js';

export interface RouteInfo{
  msg: Message
  absoluteParams: string[]
  params: string[]
  flags: string[]
}

export interface Handler{
  (info: RouteInfo) : void
}

export interface RouteList{
  [path : string]: Router | Handler
}

export default class Router {
  private routes : RouteList = {};

  public use(route : string, using: Router | Handler) {
    if (this.routes[route]) throw new Error('This Route Already Exists');

    this.routes[route] = using;
  }

  public handle(info: RouteInfo) {
    const currentRoute = info.params[0];
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
