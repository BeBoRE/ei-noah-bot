import React, { DragEventHandler } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import style from '../style/eiDropzone.module.css';

interface Props {
  onCopy() : void
  onResolve (data : string) : void
  code : string | undefined
  pk: CryptoKey | undefined
}

function EiDropzone({
  onResolve, code, onCopy, pk,
} : Props) {
  const onDrop : DragEventHandler = (e) => {
    const text = e.dataTransfer.getData('text/plain');

    if (text !== '') {
      e.preventDefault();

      if (pk) {
        const start = 'https://ei.sweaties.net/ei-token-image/';
        const end = '.png';

        const data = text.substring(start.length, text.length - end.length);

        let buffer : ArrayBufferLike;
        try {
          buffer = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)).buffer;
          crypto.subtle.decrypt({
            name: 'RSA-OAEP',
          }, pk, buffer)
            .then((decryptedBuffer) => (new TextDecoder()).decode(decryptedBuffer))
            .then((decoded) => onResolve(decoded));
        } catch (err) {
          if (err instanceof DOMException) console.log('Sleep ei-noah\'s gezicht hierheen');
        }
      }
    }
  };

  return (
    <div className={`${code ? style.loaded : style.loading}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <CopyToClipboard text={code ? `ei login ${code.toUpperCase()}` : ''} onCopy={() => code && onCopy()}>
        <img draggable="false" src="https://ei.sweaties.net/ei-noah-empty.png" alt="ei-noah" />
      </CopyToClipboard>
    </div>
  );
}

export default EiDropzone;
