import Image from 'next/image';

import ei from '../public/ei.png';

export default function Page() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-5">
      <h1 className="mb-5 text-center text-5xl font-bold text-primary-500">
        ei Noah
      </h1>
      <Image alt="ei Noah" src={ei} width={300} height={300} className="mb-5" />
      <q className="text-center text-4xl font-semibold text-primary-500">
        The best in class lobby manager for Discord
      </q>
      <h2 className="text-center text-3xl text-primary-300">- obamna</h2>
      <a href="https://discord.com/api/oauth2/authorize?client_id=730913870805336195&permissions=1133901047824&scope=bot">
        <button
          type="button"
          className="mt-5 rounded bg-discord px-4 py-2 text-xl font-semibold text-primary-50 hover:bg-discord"
        >
          <Image
            alt="Discord"
            src="/discord-mark-white.svg"
            width={20}
            height={20}
            className="mr-2 inline-block"
          />
          Invite to your server
        </button>
      </a>
    </div>
  );
}
