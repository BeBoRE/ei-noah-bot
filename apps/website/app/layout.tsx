import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import '../styles/globals.css';

import Link from 'next/link';

import Header from './header';
import TRPCReactProvider from './providers';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'ei Noah',
  description: 'Never run out of voice channels again!',
  openGraph: {
    title: 'ei Noah',
    description: 'Never run out of voice channels again!',
    url: 'https://ei.sweaties.net',
    siteName: 'ei Noah',
  },
};

type Props = {
  children: React.ReactNode;
};

export default async function Layout({ children }: Props) {
  return (
    <html
      lang="en"
      className="flex min-h-[100dvh] bg-primary-200 text-primary-900 dark:bg-primary-950 dark:text-primary-100"
    >
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body
        className={[
          'font-sans',
          fontSans.variable,
          'flex-1',
          'flex',
          'flex-col',
        ].join(' ')}
      >
        <Header />
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <footer className="flex place-content-center bg-primary-100 p-3 dark:bg-primary-900">
          <div className="container text-sm hover:underline">
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
