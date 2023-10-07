import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import '../styles/globals.css';

import { getServerSession } from 'next-auth';

import Image from 'next/image';
import Link from 'next/link';

import ei from '../public/ei.png';

import TRPCReactProvider from './providers';
import { authOptions } from './api/auth/[...nextauth]/route';

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
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      className="flex min-h-[100dvh] bg-primary-950 text-primary-100"
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
        <header className="flex justify-center bg-primary-900">
          <div className="container flex place-content-between py-3">
            <Link
              href="/"
              className="flex gap-2 text-xl font-bold text-primary-500"
            >
              <Image src={ei} alt="logo" height={30} className="inline-block" />
              <span>ei Noah</span>
            </Link>
          </div>
        </header>
        <TRPCReactProvider session={session}>{children}</TRPCReactProvider>
        <footer className="flex place-content-center bg-primary-900 p-3">
          <div className="container text-sm hover:underline">
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
