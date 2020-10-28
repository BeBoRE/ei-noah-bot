import { NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import auth from '../../middleware/auth';
import { ReqExtended } from '../../types';

export default nextConnect()
  .use(auth)
  .get((req : ReqExtended, res : NextApiResponse) => {
    req.logout();
    res.redirect('/login');
  })
  .post((req : ReqExtended, res : NextApiResponse) => {
    req.logout();
    res.end('');
  });
