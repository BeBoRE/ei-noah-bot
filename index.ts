import dotenv from 'dotenv';
import { Client } from 'discord.js';

dotenv.config();

const client = new Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (msg) => {
  if (msg.content === 'ping') {
    msg.reply('verified');
  }
});

client.login(process.env.CLIENT_TOKEN);
