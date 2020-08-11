import { Client } from 'discord.js';
import Router, { RouteInfo } from './Router';

class EiNoah {
  private client : Client;

  constructor(token : string, initialRouter : Router) {
    this.client = new Client();

    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', (msg) => {
      if (msg.author !== this.client.user) {
        const splitted = msg.content.split(' ').filter((param) => param);

        const botMention = `<@!${this.client.user.id}>`;

        if (splitted[0] === botMention || splitted[0] === 'ei') {
          splitted.shift();

          const initialRouteInfo : RouteInfo = {
            absoluteParams: splitted,
            params: splitted,
            msg,
            flags: [],
          };

          initialRouter.handle(initialRouteInfo);
        }
      }
    });

    this.client.login(token);
  }
}

export default EiNoah;
