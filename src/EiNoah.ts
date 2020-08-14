import { Client, User } from 'discord.js';
import { createConnection } from 'typeorm';
import Router, { Handler, messageParser } from './Router';
import { User as UserEntity } from './entity/User';

class EiNoah {
  public readonly client = new Client();

  private readonly router = new Router();

  private readonly token : string;

  constructor(token : string) {
    this.token = token;
  }

  public use(route: typeof User, using: Handler) : void
  public use(route : string, using: Router | Handler) : void
  public use(route : any, using: any) : any {
    this.router.use(route, using);
  }

  public async start() {
    await createConnection({
      type: 'sqlite',
      database: 'eiNoah.sqlite',
      logging: true,
      synchronize: true,
      entities: [UserEntity],
    });

    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', async (msg) => {
      if (msg.author !== this.client.user) {
        const splitted = msg.content.split(' ').filter((param) => param);

        const botMention = `<@${this.client.user.id}>`;
        const botNickMention = `<@!${this.client.user.id}>`;

        if (splitted[0] === botMention || splitted[0].toUpperCase() === 'EI' || splitted[0] === botNickMention) {
          messageParser(msg).then((info) => {
            try {
              this.router.handle(info);
            } catch (err) {
              if (process.env.NODE_ENV !== 'production') {
                msg.channel.send(`Uncaught \`${err?.message}\``);
              } else {
                msg.channel.send('We have ran into an issue');
              }
            }
          }).catch((err) => {
            msg.channel.send(err.message);
          });
        }
      }
    });

    this.client.login(this.token);
  }
}

export default EiNoah;
