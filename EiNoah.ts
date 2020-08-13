import { Client, User } from 'discord.js';
import Router, { Handler, messageParser } from './Router';

class EiNoah {
  public readonly client = new Client();

  private readonly router = new Router();

  private readonly token : string;

  constructor(token : string) {
    this.token = token;
  }

  public use = (route : string | typeof User, using: Router | Handler) => {
    this.router.use(route, using);
  };

  public start() {
    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', async (msg) => {
      if (msg.author !== this.client.user) {
        const splitted = msg.content.split(' ').filter((param) => param);

        const botMention = `<@${this.client.user.id}>`;
        const botNickMention = `<@!${this.client.user.id}>`;

        if (splitted[0] === botMention || splitted[0] === 'ei' || splitted[0] === botNickMention) {
          const initialRouteInfo = messageParser(msg);

          try {
            this.router.handle(await initialRouteInfo);
          } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
              msg.channel.send(`Uncaught \`${err?.message}\``);
            } else {
              msg.channel.send('We have ran into an issue');
            }

            console.error(err);
          }
        }
      }
    });

    this.client.login(this.token);
  }
}

export default EiNoah;
