import nextConnect from 'next-connect';
import crypto from 'crypto';
import auth from '../../middleware/auth';
import { ReqExtended } from '../../types';

export default nextConnect()
  .use(auth)
  .get<ReqExtended>(async ({ user }, res) => {
  if (user) {
    user.count += 1;
    res.end(JSON.stringify(user));
  } else res.end('null');
});
