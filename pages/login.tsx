import React, { useEffect, useState } from 'react';
import Dropzone from '../components/EiDropzone';

/*
Convert  an ArrayBuffer into a string
from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
function ab2str(buf : ArrayBuffer) {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

/*
Export the given key and write it into the "exported-key" space.
*/
async function exportCryptoKey(key : CryptoKey) {
  const exported = await window.crypto.subtle.exportKey(
    'spki',
    key,
  );
  const exportedAsString = ab2str(exported);
  const exportedAsBase64 = window.btoa(exportedAsString);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

function Page() {
  const [key, setKey] = useState<CryptoKeyPair>();
  const [keyId, setKeyId] = useState<string>();
  const [encryptedInfo, setEncryptedInfo] = useState<string>('');
  const [user, setUser] = useState<Object>({});
  const [error, setError] = useState('');

  useEffect(() => {
    crypto.subtle.generateKey({
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    }, true, ['decrypt'])
      .then((k) => {
        setKey(k);
        return exportCryptoKey(k.publicKey);
      })
      .then((pem) => fetch('/api/publickey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: pem,
        }),
      }))
      .then((res) => {
        if (res.ok) { return res.json(); }
        throw Error('error while sending public key');
      })
      .then((res) => {
        if (res.id && typeof res.id === 'string') {
          setKeyId(res.id);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (encryptedInfo && key) {
      const { buffer } = Uint8Array.from(atob(encryptedInfo), (c) => c.charCodeAt(0));

      crypto.subtle.decrypt({
        name: 'RSA-OAEP',
      }, key?.privateKey, buffer)
        .then((decryptedBuffer) => (new TextDecoder()).decode(decryptedBuffer))
        .then((loginInfo) => fetch('/api/login', {
          body: loginInfo,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }))
        .then((res) => res.json())
        .then((res) => setUser(res))
        .catch((err) => {
          if (err instanceof DOMException) setError('Je kan geen ei-noah gezicht van iemand anders gebruiken');
        });
    }
  }, [encryptedInfo]);

  return (
    keyId && key ? (
      <div>
        ei login
        {' '}
        {keyId.toUpperCase()}
        <Dropzone onResolve={(data) => { setEncryptedInfo(data); }} />
        <p>{JSON.stringify(user)}</p>
        <p>{error}</p>
      </div>
    ) : <div>Welcome to login lol :)</div>
  );
}

export default Page;
