import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import '../styles/globals.css';

import Link from 'next/link';

import { Button } from './_components/ui/button';
import GithubIcon from './GithubIcon';
import Header from './header';
import Providers from './providers';

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
      className="dark flex min-h-[100dvh]"
    >
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <body
        className={[
          'font-sans',
          fontSans.variable,
          'flex-1',
          'flex',
          'flex-col',
          'bg-primary-200 text-primary-900 dark:bg-primary-950 dark:text-primary-100'
        ].join(' ')}
      >
        <Providers>
          <Header />
          {children}
        </Providers>
        <footer className="flex place-content-center bg-primary-100 p-3 dark:bg-primary-900">
          <div className="container flex items-center justify-between text-sm">
            <div className="flex gap-2">
              <Button variant="link" asChild className="flex items-center">
                <Link href="/privacy">Privacy Policy</Link>
              </Button>
              <Button variant="link" asChild className="flex items-center">
                <Link href="/terms-of-service">Terms of Service</Link>
              </Button>
            </div>
            <div>
              <Button
                asChild
                variant="link"
                className="flex gap-2 p-2 focus:no-underline"
              >
                <Link href="https://github.com/BeBoRE/ei-noah-bot">
                  <span className="hidden sm:inline">Proudly open-source</span>
                  <GithubIcon className="h-8 w-8" />
                </Link>
              </Button>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
