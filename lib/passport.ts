import { Request } from 'express';
import { IncomingMessage } from 'http';
import passport from 'passport';
import { Strategy } from 'passport-local';
import { User } from '../data/entity/User';
import AccessToken from '../data/entity/AccessToken';
// eslint-disable-next-line import/no-cycle
import { ReqExtended } from '../types';
import { getExtendedUser, ExtendedUser } from '../data/data';
import PublicKey from '../data/entity/PublicKey';

passport.serializeUser<ExtendedUser, string>((user, done) => {
  done(null, user.user.id);
});

passport.deserializeUser<ExtendedUser, string, IncomingMessage & ReqExtended>(
  async (req, id, done) => {
    const user = await req.em.findOne(User, { id });
    if (user) {
      done(null, await getExtendedUser(user, req.bot));
    } else done(null, undefined);
  },
);

passport.use(
  new Strategy({
    usernameField: 'id',
    passwordField: 'token',
    passReqToCallback: true,
  }, async (_req, id, token, done) => {
    const req = <Request & ReqExtended>_req;

    if (id && token) {
      const accessToken = await req.em.findOne(AccessToken, { user: { id }, token, expires: { $gt: new Date() } }, { populate: ['user'] });
      if (!accessToken) {
        done(null, null);
      } else {
        req.em.nativeDelete(AccessToken, { publicKey: { id: accessToken.publicKey.id } });
        req.em.remove(accessToken.publicKey);
        done(null, await getExtendedUser(accessToken.user, req.bot));
      }
    } else {
      done(null, null);
    }
  }),
);

export default passport;
