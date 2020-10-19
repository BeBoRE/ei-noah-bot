import { Request } from 'express';
import { IncomingMessage } from 'http';
import { EntityManager } from 'mikro-orm';
import passport from 'passport';
import { Strategy } from 'passport-local';
import User from '../../dist/data/entity/User';
import AccessToken from '../../data/entity/AccessToken';

passport.serializeUser<User, string>((user, done) => {
  done(null, user.id);
});

passport.deserializeUser<User, string, IncomingMessage & {em: EntityManager}>(
  async (req, id, done) => {
    const user = await req.em.findOne(User, { id });
    if (user) done(null, user);
    else done(null, undefined);
  },
);

passport.use(
  new Strategy({
    usernameField: 'id',
    passwordField: 'token',
    passReqToCallback: true,
  }, async (_req, id, token, done) => {
    const req = <Request & {em: EntityManager}>_req;

    const user = await req.em.findOne(AccessToken, { user: { id }, token });
    if (!user) {
      done(null, null);
    } else {
      done(null, user);
    }
  }),
);

export default passport;
