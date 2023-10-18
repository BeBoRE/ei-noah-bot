import * as context from 'next/headers';
import Link from 'next/link';
import rscApi from 'utils/rsc';

import HeaderUser from './_components/HeaderUser';
import { Icons } from './_components/Icons';
import { NavMenu } from './_components/NavMenu';

async function Header() {
  const api = await rscApi(context);
  const [user, guilds] = await Promise.all([
    api.user.me().catch(() => null),
    api.guild.all().catch(() => null),
  ]);

  return (
    <header className="flex min-h-[4rem] place-content-center bg-primary-100 dark:bg-primary-900">
      <div className="container flex place-content-between py-1">
        <div className="flex flex-1 place-items-center items-stretch gap-2">
          <Link className="flex place-items-center gap-1" href="/">
            <Icons.Logo className="h-6 w-6" />
            <h1 className="text-xl font-bold text-primary-800 dark:text-primary-300">
              ei Noah
            </h1>
          </Link>
          {guilds && <NavMenu guilds={guilds} />}
        </div>
        <div className="flex place-items-center">
          <HeaderUser user={user} />
        </div>
      </div>
    </header>
  );
}

export default Header;
