import {
  Client, User as DiscordUser, TextChannel, NewsChannel, Role, Permissions,
} from 'discord.js';
import { Connection, IDatabaseDriver, MikroORM } from '@mikro-orm/core';
import Router, { Handler, messageParser } from './Router';

enum ErrorType {
  Uncaught,
  Unhandled,
}

const errorToChannel = async (channelId : string, client : Client, err : Error, type?: ErrorType) => {
  const errorChannel = await client.channels.fetch(channelId);
  if (errorChannel instanceof TextChannel
     || errorChannel instanceof NewsChannel
  ) {
    let header = '';
    if (type === ErrorType.Uncaught) header = '**Uncaught**';
    if (type === ErrorType.Unhandled) header = '**Unhandled**';
    return errorChannel.send(`${header}\n**${err?.name}**\n\`\`\`${err?.stack}\`\`\``, { split: true });
  }

  return null;
};

class EiNoah {
  public readonly client = new Client();

  private readonly router = new Router();

  private readonly token : string;

  private readonly orm : MikroORM<IDatabaseDriver<Connection>>;

  constructor(token : string, orm : MikroORM<IDatabaseDriver<Connection>>) {
    this.token = token;
    this.orm = orm;
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
    const { orm } = this;

    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', (msg) => {
      if (msg.author !== this.client.user && msg.content) {
        const splitted = msg.content.split(' ').filter((param) => param);

        // Raw mention ziet er anders uit wanneer user een nickname heeft
        const botMention = `<@${this.client.user?.id}>`;
        const botNickMention = `<@!${this.client.user?.id}>`;

        let canSendMessage = true;

        if ((msg.channel instanceof TextChannel || msg.channel instanceof NewsChannel) && msg.client.user) {
          if (!msg.channel.permissionsFor(msg.client.user)?.has(Permissions.FLAGS.SEND_MESSAGES)) canSendMessage = false;
        }

        if ((splitted[0] === botMention || splitted[0].toUpperCase() === 'EI' || splitted[0] === botNickMention)) {
          if (!canSendMessage) {
            if (msg.member && msg.member.hasPermission(Permissions.FLAGS.ADMINISTRATOR)) {
              msg.author.send('Ik kan toch niet in dat kanaal praten, doe je fucking werk of ik steek je neer');
              return;
            }

            msg.author.send('Ik kan niet in dat kanaal reageren, kunnen die kanker admins niet hun werk doen??');
            return;
          }

          msg.channel.startTyping(10000).catch(() => { });
          const em = orm.em.fork();

          messageParser(msg, em)
            .then((info) => this.router.handle(info))
            .then((response) => {
              if (response) {
                if (typeof (response) !== 'string') {
                  return msg.channel.send(response).catch(() => { });
                }

                return msg.channel.send(response, { split: true }).catch(() => { });
              }

              return null;
            })
            .finally(() => {
              msg.channel.stopTyping(true);
              return em.flush();
            })
            .catch((err) => {
              // Dit wordt gecallt wanneer de parsing faalt
              if (process.env.NODE_ENV !== 'production') {
                errorToChannel(msg.channel.id, msg.client, err).catch(() => { console.log('Error could not be send :('); });
              } else if (process.env.ERROR_CHANNEL) {
                msg.channel.send('Even normaal doen!').catch(() => {});
                errorToChannel(process.env.ERROR_CHANNEL, msg.client, err).catch(() => { console.log('Stel error kanaal in'); });
              }

              console.error(err);
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
    process.on('uncaughtException', async (err) => {
      if (process.env.ERROR_CHANNEL) await errorToChannel(process.env.ERROR_CHANNEL, this.client, err, ErrorType.Uncaught);
    });

    process.on('unhandledRejection', (err) => {
      if (err instanceof Error && process.env.ERROR_CHANNEL) {
        errorToChannel(process.env.ERROR_CHANNEL, this.client, err, ErrorType.Unhandled);
      }
    });
  }
}

export default EiNoah;
