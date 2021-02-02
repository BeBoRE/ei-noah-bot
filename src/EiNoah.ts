import {
  Client, User as DiscordUser, TextChannel, NewsChannel, Role,
} from 'discord.js';
import { Connection, IDatabaseDriver, MikroORM } from '@mikro-orm/core';
import Router, { Handler, messageParser } from './Router';

const errorToChannel = async (channelId : string, client : Client, err : Error) => {
  const errorChannel = await client.channels.fetch(channelId);
  if (errorChannel instanceof TextChannel
     || errorChannel instanceof NewsChannel
  ) {
    errorChannel.send(`**${err?.name}**\n\`\`\`${err?.stack}\`\`\``);
  }
};

class EiNoah {
  public readonly client = new Client();

  private readonly router = new Router();

  private readonly token : string;

  constructor(token : string) {
    this.token = token;
  }

  // this.use wordt doorgepaast aan de echte router
  public use(route: typeof DiscordUser, using: Handler) : void
  public use(route: typeof Role, using: Handler) : void
  public use(route: null, using: Handler) : void
  public use(route : string, using: Router | Handler) : void
  public use(route : any, using: any) : any {
    this.router.use(route, using);
  }

  public onInit ?: ((client : Client, orm : MikroORM<IDatabaseDriver<Connection>>)
  => void | Promise<void>);

  public async start() {
    // Creëerd de database connectie
    const orm = await MikroORM.init().catch((err) => { console.error(err); process.exit(-1); });
    await orm.getMigrator().up();

    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', async (msg) => {
      if (msg.author !== this.client.user && msg.content) {
        const splitted = msg.content.split(' ').filter((param) => param);

        // Raw mention ziet er anders uit wanneer user een nickname heeft
        const botMention = `<@${this.client.user?.id}>`;
        const botNickMention = `<@!${this.client.user?.id}>`;

        if (splitted[0] === botMention || splitted[0].toUpperCase() === 'EI' || splitted[0] === botNickMention) {
          msg.channel.startTyping();
          const em = orm.em.fork();

          messageParser(msg, em).then((info) => {
            this.router.handle(info)
              .then(async (response) => {
                if (response) {
                  if (typeof (response) !== 'string') {
                    await msg.channel.send(response);
                  } else {
                    await msg.channel.send(response, { split: true });
                  }
                }
                await em.flush();
              })
              .catch(async (err : Error) => {
                if (process.env.NODE_ENV !== 'production') {
                // Error message in development
                  errorToChannel(msg.channel.id, msg.client, err);
                } else {
                // Error message in productie
                  msg.channel.send('Je sloopt de hele boel hier!\nGeen idee wat ik hiermee moet doen D:');
                  if (process.env.ERROR_CHANNEL) {
                    errorToChannel(process.env.ERROR_CHANNEL, msg.client, err);
                  }
                }
              });
          }).catch((err) => {
            // Dit wordt gecallt wanneer de parsing faalt
            if (process.env.NODE_ENV !== 'production') {
              errorToChannel(msg.channel.id, msg.client, err);
            } else if (process.env.ERROR_CHANNEL) {
              msg.channel.send('Even normaal doen!');
              errorToChannel(process.env.ERROR_CHANNEL, msg.client, err);
            }

            console.error(err);
          }).finally(() => {
            msg.channel.stopTyping(true);
          });
        }
      }
    });

    this.client.on('rateLimit', () => {
      console.log('We are getting rate limited');
    });

    await this.client.login(this.token);

    this.router.onInit = this.onInit;

    this.router.initialize(this.client, orm);
    process.on('uncaughtException', (err) => {
      if (process.env.ERROR_CHANNEL) errorToChannel(process.env.ERROR_CHANNEL, this.client, err);
    });

    process.on('unhandledRejection', (err) => {
      if (err instanceof Error && process.env.ERROR_CHANNEL) {
        errorToChannel(process.env.ERROR_CHANNEL, this.client, err);
      }
    });
  }
}

export default EiNoah;
