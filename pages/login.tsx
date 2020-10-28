import React, { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { useRouter } from 'next/router';
import EiDropzone from '../components/EiDropzone';
import { useUser } from '../lib/hooks/useUser';
import styles from '../style/login.module.css';

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
  const [hasCopied, setHasCopied] = useState(false);
  const [user, { mutate }] = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
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
        .then(async (res) => {
          if ((await res).ok) { return (await res).json(); }
          throw Error('error while sending public key');
        })
        .then(async (res) => {
          if ((await res).id && typeof (await res).id === 'string') {
            setKeyId((await res).id);
          }
        });
    }
  }, []);

  useEffect(() => {
    if (user) router.push('/');
  }, [user]);

  const onResolve = (loginInfo : string) => {
    fetch('/api/login', {
      body: loginInfo,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((res) => mutate(res.user))
      .catch(console.log);
  };

  let text;

  if (!keyId) text = 'Wacht op de inlogcode';
  else if (!hasCopied) text = 'Klik op Ei Noah om de inlog code te kopieren';
  else if (!user) text = 'Plak de inlogcode in een kanaal waar Ei-Noah het kan zien en kan reageren';
  else text = `Welkom, ${user.username}`;

  return (
    <>
      <Row className="justify-content-md-center">
        <Col sm="auto">
          <h1>Inloggen bij Ei-Noah</h1>
        </Col>
      </Row>
      <Row className="justify-content-md-center">
        <Col sm="auto">
          <EiDropzone
            onCopy={() => setHasCopied(true)}
            code={keyId}
            pk={key?.privateKey}
            onResolve={onResolve}
          />
        </Col>
      </Row>
      <Row>
        <Col className={styles.copyBox} sm="12"><p>{text}</p></Col>
      </Row>
    </>
  );
}

export default Page;
