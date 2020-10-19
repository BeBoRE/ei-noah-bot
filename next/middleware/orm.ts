import { IncomingMessage } from 'http';
import NextConnect from 'next-connect';
import { ORM } from '../../data/data';
import { ReqExtended } from '../types';

const handler = NextConnect<ReqExtended & IncomingMessage>()
  .use(async (req, res, next) => {
    if (!req.em) {
      const orm = await ORM;

      req.em = orm.em.fork();

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
