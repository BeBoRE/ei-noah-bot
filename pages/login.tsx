import React, { ChangeEventHandler, useEffect, useState } from 'react';

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
  const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;

  return pemExported;
}

function Page() {
  const [key, setKey] = useState<CryptoKeyPair>();
  const [keyId, setKeyId] = useState<string>();

  useEffect(() => {
    crypto.subtle.generateKey({
      name: 'RSA-OAEP',
      modulusLength: 1024,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    }, true, ['decrypt'])
      .then((k) => {
        setKey(k);
        return exportCryptoKey(k.publicKey);
      })
      .then((pem) => {
        console.log(pem.length);
        console.log(pem);
        return fetch('/api/publickey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: pem,
          }),
        });
      })
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

  return (
    keyId ? (
      <div>
        ei login
        {' '}
        {keyId.toUpperCase()}
      </div>
    ) : <div>Welcome to login lol :)</div>
  );
}

export default Page;
