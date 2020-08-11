import { Client } from 'discord.js';

class EiNoah {
  private client : Client;

  constructor(token : string) {
    this.client = new Client();

    this.client.login(token);
  }
}

export default EiNoah;
