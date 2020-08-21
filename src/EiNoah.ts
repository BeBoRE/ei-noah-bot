import {
  Client, User as DiscordUser, TextChannel, NewsChannel,
} from 'discord.js';
import { createConnection, getRepository } from 'typeorm';
import { GuildUser } from './entity/GuildUser';
import Router, { Handler, messageParser } from './Router';
import { User } from './entity/User';
import { Guild } from './entity/Guild';

class EiNoah {
  public readonly client = new Client();

  private readonly router = new Router();

  private readonly token : string;

  constructor(token : string) {
    this.token = token;
  }

  // this.use wordt doorgepaast aan de echte router
  public use(route: typeof DiscordUser, using: Handler) : void
  public use(route : string, using: Router | Handler) : void
  public use(route : any, using: any) : any {
    this.router.use(route, using);
  }

  public async start() {
    // Creëerd de database connectie
    await createConnection();

    this.client.on('ready', () => {
      console.log('client online');
    });

    this.router.initialize();

    this.client.on('message', async (msg) => {
      if (msg.author !== this.client.user && msg.content) {
        const splitted = msg.content.split(' ').filter((param) => param);

        // Raw mention ziet er anders uit wanneer user een nickname heeft
        const botMention = `<@${this.client.user.id}>`;
        const botNickMention = `<@!${this.client.user.id}>`;

        if (splitted[0] === botMention || splitted[0].toUpperCase() === 'EI' || splitted[0] === botNickMention) {
          messageParser(msg).then((info) => {
            this.router.handle(info)
              .then(async (newData) => {
                if (newData instanceof GuildUser) {
                  const guRepo = getRepository(GuildUser);
                  const userRepo = getRepository(User);
                  const guildRepo = getRepository(Guild);

                  await guildRepo.save(newData.guild);
                  await userRepo.save(newData.user);
                  await guRepo.save(newData);
                }
              })
              .catch(async (err : Error) => {
                if (process.env.NODE_ENV !== 'production') {
                // Error message in development
                  msg.channel.send(`**${err?.name}**\n\`\`\`${err?.stack}\`\`\``);
                } else {
                // Error message in productie
                  msg.channel.send('Je sloopt de hele boel hier!\nGeen idee wat ik hiermee moet doen D:');

                  // Stuurt de stacktrace naar de developer's textkanaal
                  const errorChannelId = process.env.ERROR_CHANNEL;
                  if (errorChannelId) {
                    const errorChannel = await this.client.channels.fetch(errorChannelId);
                    if (errorChannel instanceof TextChannel
                     || errorChannel instanceof NewsChannel
                    ) {
                      errorChannel.send(`**${err?.name}**\n\`\`\`${err?.stack}\`\`\``);
                    }
                  }
                }
              });
          }).catch((err) => {
            // Dit wordt gecallt wanneer de parsing faalt
            msg.channel.send(err.message);
          });
        }
      }
    });

    this.client.login(this.token);
  }
}

export default EiNoah;
