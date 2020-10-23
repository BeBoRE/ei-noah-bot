import crypto from 'crypto';
import AccessToken from '../../data/entity/AccessToken';
import PublicKey from '../../data/entity/PublicKey';
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
      const accessToken = new AccessToken(user, publicKey);

      const text = JSON.stringify({
        token: accessToken.token,
        id: user.id,
      });

      const enc = new TextEncoder();
      const encoded = enc.encode(text);

      em.persist(accessToken);

      msg.channel.send(`https://ei.sweaties.net/ei-token-image/${crypto.publicEncrypt({ key: publicKey.key, oaepHash: 'sha256' }, encoded).toString('base64')}.png`);
      if (msg.deletable) msg.delete();
    }
  } else {
    msg.channel.send('Kopieer de code uit het login schermpie');
  }
});

export default router;
