import React, { FC } from 'react';
import Header from './Header';

interface Props {
  children: Element
}

// eslint-disable-next-line react/prop-types
const Layout : FC = function Layout({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
};

export default Layout;
