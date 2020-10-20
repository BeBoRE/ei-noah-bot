import { IncomingMessage } from 'http';
import NextConnect from 'next-connect';
import bot from '../bot/index';
import ORM from '../data/orm';
import { ReqExtended } from '../types';

const handler = NextConnect<ReqExtended & IncomingMessage>()
  .use(async (req, res, next) => {
    if (!req.em) {
      const orm = ORM;
      if (!bot.started && process.env.DISABLE_BOT !== 'true') await bot.start();

      req.em = (await orm).em.fork();
      req.bot = bot.client;

      const oldEnd = res.end;
      res.end = async function resEndProxy(...args : any[]) {
        if (res.finished || res.writableEnded || res.headersSent) return;
        // sealing the cookie to be sent to client

        req.em.flush();

        oldEnd.apply(this, args);
      };
    }

    next();
  });

export default handler;
