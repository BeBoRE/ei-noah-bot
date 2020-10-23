import React, { DragEventHandler } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import style from '../style/eiDropzone.module.css';

interface Props {
  onCopy() : void
  onResolve (data : string) : void
  code : string | undefined
}

function EiDropzone({ onResolve, code, onCopy } : Props) {
  const onDrop : DragEventHandler = (e) => {
    const text = e.dataTransfer.getData('text/plain');

    if (text !== '') {
      e.preventDefault();

      const start = 'https://ei.sweaties.net/ei-token-image/';
      const end = '.png';

      const data = text.substring(start.length, text.length - end.length);
      onResolve(data);
      console.log(data);
    }
  };

  return (
    <div className={`${code ? null : style.loading}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <CopyToClipboard text={code ? `ei login ${code.toUpperCase()}` : ''} onCopy={() => code && onCopy()}>
        <img draggable="false" src="https://ei.sweaties.net/ei-noah-empty.png" alt="ei-noah" />
      </CopyToClipboard>
    </div>
  );
}

export default EiDropzone;
