import Image from 'next/image';
import ei from '../public/ei.png';

export default function Page() {
  return (
    <div className="flex flex-1 flex-col justify-center items-center py-5">
      <h1 className="text-center text-5xl text-primary-500 font-bold mb-5">
        ei Noah
      </h1>
      <Image alt="ei Noah" src={ei} width={300} height={300} className="mb-5" />
      <q className="text-center text-4xl text-primary-500 font-semibold">
        The best in class lobby manager for Discord
      </q>
      <h2 className="text-center text-3xl text-primary-300">
        - obamna
      </h2>
      <a href="https://discord.com/api/oauth2/authorize?client_id=730913870805336195&permissions=1133901047824&scope=bot">
        <button type="button" className="bg-discord hover:bg-discord text-primary-50 text-xl font-semibold py-2 px-4 rounded mt-5">
          <Image alt="Discord" src="/discord-mark-white.svg" width={20} height={20} className="inline-block mr-2" />
          Invite to your server
        </button>
      </a>
    </div>
  );
}
