import { AppProps } from 'next/dist/next-server/lib/router/router';
import React from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../style/global.css';
import { Container } from 'react-bootstrap';

export default function App({ Component, pageProps } : AppProps) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Container><Component {...pageProps} /></Container>;
}
