import { Client } from 'discord.js';
import Router, { Handler, messageParser } from './Router';

class EiNoah {
  public readonly client = new Client();

  private readonly router = new Router();

  private readonly token : string;

  constructor(token : string) {
    this.token = token;
  }

  public use = (route : string, using: Router | Handler) => this.router.use(route, using);

  public start() {
    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', (msg) => {
      if (msg.author !== this.client.user) {
        const splitted = msg.content.split(' ').filter((param) => param);

        const botMention = `<@${this.client.user.id}>`;
        const botNickMention = `<@!${this.client.user.id}>`;

        if (splitted[0] === botMention || splitted[0] === 'ei' || splitted[0] === botNickMention) {
          const initialRouteInfo = messageParser(msg);

          this.router.handle(initialRouteInfo);
        }
      }
    });

    this.client.login(this.token);
  }
}

export default EiNoah;
