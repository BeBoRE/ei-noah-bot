import React, { DragEventHandler, FC } from 'react';
import style from '../style/eiDropzone.module.css';

interface Props {
  onResolve (data : string) : void
}

function EiDropzone({ onResolve } : Props) {
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

  return <div className={style.dropzone} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} />;
}

export default EiDropzone;
