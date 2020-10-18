import https from 'https';
import fs from 'fs';
import express from 'express';
import next from 'next';
import bot from '../bot/index';

bot.start();
const nextApp = next({ dev: process.env.NODE_ENV !== 'production' });

const handler = nextApp.getRequestHandler();

const server = https.createServer({
  cert: fs.readFileSync('./ssl/localhost.crt'),
  key: fs.readFileSync('./ssl/localhost.key'),
}, handler);

server.listen(443, 'localhost', () => {
  console.log('Webserver started');
});
