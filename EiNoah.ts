import { Client, Message } from 'discord.js';

interface RouteInfo {
  msg: Message,
  params: string[]
  flags: string[]
}

interface Route {
  (msg : Message) : void
}

interface Router {
  [name: string]: Route | Router
}

class EiNoah {
  private client : Client;

  constructor(token : string) {
    this.client = new Client();

    this.client.on('ready', () => {
      console.log('client online');
    });

    this.client.on('message', (msg) => {
      if (msg.author !== this.client.user) {
        const splitted = msg.content.split(' ').filter((param) => param);

        const botMention = `<@!${this.client.user.id}>`;

        if (splitted[0] === botMention || splitted[0] === 'ei') {
          console.log(msg.content);
        }
      }
    });

    this.client.login(token);
  }
}

export default EiNoah;
