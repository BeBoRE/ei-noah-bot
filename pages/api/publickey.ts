import nextConnect from 'next-connect';
import crypto from 'crypto';
import moment from 'moment';
import { NextApiRequest, NextApiResponse } from 'next';
import orm from '../../middleware/orm';
import { ReqExtended } from '../../types';
import PublicKey from '../../data/entity/PublicKeys';

interface Body {
  key?: string
}

export default nextConnect<NextApiRequest, NextApiResponse>()
  .use(orm)
  .post<{body: Body} & ReqExtended>((req, res) => {
  if (req.body.key && req.body.key.length === 268
    && req.body.key.endsWith('-----END PUBLIC KEY-----')
    && req.body.key.startsWith('-----BEGIN PUBLIC KEY-----')) {
    const { key } = req.body;

    crypto.randomBytes(8, (err, buf) => {
      if (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      } else {
        const id = buf.toString('hex');

        const pk = new PublicKey();
        pk.id = id;
        pk.key = key;
        pk.expires = moment().add(10, 'minutes').toDate();

        req.em.persist(pk);

        res.json({ id });
      }
    });
  } else {
    res.statusCode = 400;
    res.end(JSON.stringify({
      error: 'Invalid Public Key',
    }));
  }
});
