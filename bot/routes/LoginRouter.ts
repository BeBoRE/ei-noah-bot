import moment from 'moment';
import { Crypto } from '@peculiar/webcrypto';
import AccessToken from '../../data/entity/AccessToken';
import PublicKey from '../../data/entity/PublicKeys';
import Router from '../Router';

const router = new Router();

const crypto = new Crypto();

function importRsaKey(pem : string) {
  // fetch the part of the PEM string between header and footer
  const pemHeader = '-----BEGIN PUBLIC KEY-----';
  const pemFooter = '-----END PUBLIC KEY-----';
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);

  // convert from a binary string to an ArrayBuffer
  const binaryDer = Buffer.from(pemContents, 'base64');

  return crypto.subtle.importKey(
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
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);

      const token = Buffer.from(randomBytes).toString('base64');

      const accessToken = new AccessToken();
      accessToken.token = token;
      accessToken.expires = moment().add(10, 'minutes').toDate();
      accessToken.user = user;

      const key = await importRsaKey(publicKey.key);
      const text = JSON.stringify({
        token,
        id: user.id,
      });

      const enc = new TextEncoder();
      const encoded = enc.encode(text);

      console.log(encoded.length);

      const tokenEncrypted = await crypto.subtle.encrypt({
        name: 'RSA-OAEP',
      },
      key,
      encoded);

      em.persist(accessToken);

      msg.channel.send(Buffer.from(tokenEncrypted).toString('base64'));
    }
  } else {
    msg.channel.send('Kopieer de code uit het login schermpie');
  }
});

export default router;
