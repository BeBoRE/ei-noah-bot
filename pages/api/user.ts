import nextConnect from 'next-connect';
import { User } from '../../data/entity/User';
import orm from '../../middleware/orm';
import { ReqExtended } from '../../types';

export default nextConnect()
  .use(orm)
  .get<ReqExtended>(async (req, res) => {
  const user = await req.em.findOne(User, { id: '248143520005619713' });

  if (user) res.end(JSON.stringify(user));
  else res.end('null');
});
