import nextConnect from 'next-connect';
import passport from '../../lib/passport';
import auth from '../../middleware/auth';
import { ReqExtended } from '../../types';

export default nextConnect()
  .use(auth)
  .post<ReqExtended>(passport.authenticate('local'), (req, res) => {
  if (req.user) { res.end(JSON.stringify({ user: req.user })); } else {
    res.statusCode = 500;
    res.end(res.end(JSON.stringify({ error: 'Big gamer error' })));
  }
});
