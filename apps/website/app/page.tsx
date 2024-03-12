import Image from 'next/image';

import { Icons } from './_components/Icons';
import LobbyExample from './_components/LobbyExample';

export default function Page() {
  return (
    <main className="container flex flex-1 flex-col items-center gap-4 py-5">
      <div className="flex items-center">
        <div>
          <Icons.Logo className="h-auto max-h-64 w-auto" />
        </div>
        <div className="flex flex-col">
          <h1 className="mb-5 text-5xl font-bold text-primary-900 dark:text-primary-500">
            ei Noah
          </h1>
          <p className="text-2xl text-primary-700 dark:text-primary-500">
            The best in class lobby manager for Discord
          </p>
          <a
            href="https://discord.com/api/oauth2/authorize?client_id=730913870805336195&permissions=8&scope=bot"
            className="mt-5 self-baseline rounded bg-discord px-4 py-2 text-xl font-semibold text-primary-50 transition-colors hover:bg-discord/70"
          >
            <Image
              alt="Discord"
              src="/discord-mark-white.svg"
              width={20}
              height={20}
              className="mr-2 inline-block"
            />
            Invite to your server
          </a>
        </div>
      </div>
      <LobbyExample />
    </main>
  );
}
