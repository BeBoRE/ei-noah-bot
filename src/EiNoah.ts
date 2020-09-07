import {
  Client, User as DiscordUser, TextChannel, NewsChannel, Role,
} from 'discord.js';
import { MikroORM } from 'mikro-orm';
import sourceMapSupport from 'source-map-support';
import Router, { Handler, messageParser } from './Router';

sourceMapSupport.install();

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
  public use(route : string, using: Router | Handler) : void
  public use(route : any, using: any) : any {
    this.router.use(route, using);
  }

  public async start() {
    // Creëerd de database connectie
    const orm = await MikroORM.init();

    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', async (msg) => {
      if (msg.author !== this.client.user && msg.content) {
        const splitted = msg.content.split(' ').filter((param) => param);

        // Raw mention ziet er anders uit wanneer user een nickname heeft
        const botMention = `<@${this.client.user.id}>`;
        const botNickMention = `<@!${this.client.user.id}>`;

        if (splitted[0] === botMention || splitted[0].toUpperCase() === 'EI' || splitted[0] === botNickMention) {
          msg.channel.startTyping();
          const em = orm.em.fork();

          messageParser(msg, em).then((info) => {
            this.router.handle(info)
              .then(() => em.flush())
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

    await this.client.login(this.token);

    this.router.initialize(this.client, orm);
  }
}

export default EiNoah;
