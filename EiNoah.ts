import { Client } from 'discord.js';
import Router, { RouteInfo, Handler } from './Router';

class EiNoah {
  private client : Client;

  private router = new Router();

  private token : string;

  constructor(token : string) {
    this.token = token;
  }

  public use = (route : string, using: Router | Handler) => this.router.use(route, using);

  public start() {
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

          this.router.handle(initialRouteInfo);
        }
      }
    });

    this.client.login(this.token);
  }
}

export default EiNoah;
