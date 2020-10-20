import nextConnect from 'next-connect';
import auth from '../../middleware/auth';
import orm from '../../middleware/orm';
import { ReqExtended } from '../../types';

export default nextConnect()
  .use(auth)
  .get<ReqExtended>(async (req, res) => {
  if (req.user) res.end(JSON.stringify(req.user));
  else {
    res.statusCode = 401;
    res.end('Not Authorized');
  }
});
