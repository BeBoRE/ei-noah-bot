import * as context from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import rscApi from 'utils/rsc';

import ei from '../public/ei.png';
import HeaderUser from './_components/HeaderUser';
import { NavMenu } from './_components/NavMenu';

async function Header() {
  const api = await rscApi(context);
  const [user, guilds] = await Promise.all([
    api.user.me().catch(() => null),
    api.guild.all().catch(() => null),
  ]);

  return (
    <header className="flex min-h-[4rem] place-content-center bg-primary-900">
      <div className="container flex place-content-between py-1">
        <div className="flex flex-1 place-items-center items-stretch gap-2">
          <Link className="flex place-items-center gap-1" href="/">
            <Image alt="ei Noah Logo" src={ei} width={30} height={30} />
            <h1 className="text-xl font-bold text-primary-300">ei Noah</h1>
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
