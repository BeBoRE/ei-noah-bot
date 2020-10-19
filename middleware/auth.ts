import nextConnect from 'next-connect';
import { session } from 'next-session';
import passport from '../lib/passport';
import orm from './orm';

const auth = nextConnect()
  .use(orm)
  .use(
    session({
      name: 'sess',
      cookie: {
        maxAge: 60 * 60 * 8, // 8 hours,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
      },
    }),
  )
  .use(passport.initialize())
  .use(passport.session());

export default auth;
