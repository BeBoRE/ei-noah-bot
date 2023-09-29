import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import '../styles/globals.css';

import { getServerSession } from 'next-auth';
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
      className="flex min-h-[100dvh] bg-primary-950 text-primary-50"
    >
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body
        className={['font-sans', fontSans.variable, 'flex-1', 'flex', 'flex-col'].join(' ')}
      >
        <TRPCReactProvider session={session}>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
