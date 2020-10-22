import crypto from 'crypto';
import moment from 'moment';
import NodeRSA from 'node-rsa';
import AccessToken from '../../data/entity/AccessToken';
import PublicKey from '../../data/entity/PublicKeys';
import Router from '../Router';

const router = new Router();

router.use(null, async ({
  msg, em, params, user,
}) => {
  if (typeof params[0] === 'string') {
    const publicKey = await em.findOne(PublicKey, {
      id: params[0].toLowerCase(),
      expires: { $gt: new Date() },
    });

    if (!publicKey) {
      msg.channel.send('Deze code is verlopen of ongeldig');
    } else {
      crypto.randomBytes(512, (err, buf) => {
        if (err) {
          msg.channel.send('Er is iets fout gegaan');
        } else {
          const token = buf.toString('base64');

          const accessToken = new AccessToken();
          accessToken.token = token;
          accessToken.expires = moment().add(10, 'minutes').toDate();
          accessToken.user = user;

          const encryptionKey = new NodeRSA(publicKey.key, 'public');
          const tokenEncrypted = encryptionKey.encrypt(JSON.stringify({
            token,
            user,
          }), 'base64');

          em.persist(accessToken);

          msg.channel.send(tokenEncrypted);
        }
      });
    }
  } else {
    msg.channel.send('Kopieer de code uit het login schermpie');
  }
});

export default router;
