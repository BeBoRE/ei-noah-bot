import nextConnect from 'next-connect';
import orm from '../../middleware/orm';

export default nextConnect()
  .use(orm)
  .get((req, res) => {
    res.end('Gamer');
  });
