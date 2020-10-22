import crypto from 'crypto';
import AccessToken from '../../data/entity/AccessToken';
import PublicKey from '../../data/entity/PublicKey';
import Router from '../Router';

const router = new Router();

/*
function importRsaKey(pem : string) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);

  // convert from a binary string to an ArrayBuffer
  const binaryDer = Buffer.from(pemContents, 'base64');

  return shitCrypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt'],
  );
}
*/

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

      // const key = await importRsaKey(publicKey.key);
      const text = JSON.stringify({
        token: accessToken.token,
        id: user.id,
      });

      const enc = new TextEncoder();
      const encoded = enc.encode(text);

      /*
      const tokenEncrypted = await shitCrypto.subtle.encrypt({
        name: 'RSA-OAEP',
      },
      key,
      encoded);
      */

      em.persist(accessToken);

      msg.channel.send(`https://ei.sweaties.net/ei-token-image/${crypto.publicEncrypt({ key: publicKey.key, oaepHash: 'sha256' }, encoded).toString('base64')}.png`);
      if (msg.deletable) msg.delete();
    }
  } else {
    msg.channel.send('Kopieer de code uit het login schermpie');
  }
});

export default router;
