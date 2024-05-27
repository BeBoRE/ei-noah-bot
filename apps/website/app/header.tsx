import Link from 'next/link';

import { SuspenseHeaderUser } from './_components/HeaderUser';
import { Icons } from './_components/Icons';
import { NavMenu } from './_components/NavMenu';
import GotoLobby from './GotoLobby';

async function Header() {
  return (
    <header className="flex min-h-[4rem] place-content-center bg-primary-100 dark:bg-primary-900">
      <div className="container flex place-content-between py-1">
        <div className="flex flex-1 place-items-center items-stretch gap-2">
          <Link className="flex place-items-center gap-1" href="/">
            <Icons.Logo className="h-8 w-8" />
            <h1 className="hidden text-xl font-bold text-primary-800 dark:text-primary-300 sm:block">
              ei Noah
            </h1>
          </Link>
          <NavMenu />
          <GotoLobby />
        </div>
        <div className="flex place-items-center">
          <SuspenseHeaderUser />
        </div>
      </div>
    </header>
  );
}

export default Header;
