import { Request } from 'express';
import { IncomingMessage } from 'http';
import { EntityManager } from '@mikro-orm/core';
import passport from 'passport';
import { Strategy } from 'passport-local';
import { User } from '../data/entity/User';
import AccessToken from '../data/entity/AccessToken';
import { ReqExtended } from '../types';

export interface ExtendedUser {
  user: User
  avatar: string | null,
  username: string
}

passport.serializeUser<ExtendedUser, string>((user, done) => {
  done(null, user.user.id);
});

passport.deserializeUser<ExtendedUser, string, IncomingMessage & ReqExtended>(
  async (req, id, done) => {
    const user = await req.em.findOne(User, { id });
    if (user) {
      const { avatar, username } = await req.bot.users.fetch(user.id, true);

      done(null, { user, avatar, username });
    } else done(null, undefined);
  },
);

passport.use(
  new Strategy({
    usernameField: 'id',
    passwordField: 'token',
    passReqToCallback: true,
  }, async (_req, id, token, done) => {
    const req = <Request & {em: EntityManager}>_req;

    const accessToken = await req.em.findOne(AccessToken, { user: { id }, token, expires: { $gt: new Date() } }, { populate: ['user'] });
    if (!accessToken) {
      done(null, null);
    } else {
      done(null, accessToken.user);
    }
  }),
);

export default passport;
