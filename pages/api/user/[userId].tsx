import { NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import { getExtendedUser } from '../../../data/data';
import { User } from '../../../data/entity/User';
import auth from '../../../middleware/auth';
import { ReqExtended } from '../../../types';

export default nextConnect()
  .use(auth)
  .get<ReqExtended, NextApiResponse>(async (req, res) => {
  if (req.user) {
    const user = await req.em.findOne(User, { id: req.query.userId }, { populate: ['guildUsers', 'guildUsers.quotes', 'guildUsers.createdQuotes'] });
    if (user) {
      const extended = await getExtendedUser(user, req.bot);

      if (extended) res.json(extended);
    } else {
      res.statusCode = 404;
      res.end();
    }
  } else {
    res.status(401).end('Not Authorized');
  }
});
