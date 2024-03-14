import Image from 'next/image';

import { Icons } from './_components/Icons';
import LobbyExample from './_components/LobbyExample';
import acceptUserImage from '../public/acceptUserApp.png'

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
            className="mt-2 self-baseline rounded bg-discord px-4 py-2 text-xl font-semibold text-primary-50 transition-colors hover:bg-discord/70"
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
      <div className='self-stretch flex flex-col gap-4'>
        <h2 className="text-3xl text-center font-bold text-primary-900 dark:text-primary-500 py-4">
          Make Lobby Management Even Easier
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-4 bg-primary-900 p-4 rounded-lg">
            <h3 className="text-lg text-primary-700 dark:text-primary-500 text-center">
              Manage your lobby from anywhere
            </h3>
            <hr className='text-primary-500' />
            <div className='px-24 md:px-8'>
              <video loop autoPlay muted playsInline controls={false} className="rounded-lg" src='/eiNoahAppCompressed.mp4'/>
            </div>
          </div>
          <div className="flex flex-col gap-4 bg-primary-900 p-4 rounded-lg">
            <h3 className="text-lg text-primary-700 dark:text-primary-500 text-center">
              Do not leave your friends waiting
            </h3>
            <hr className='text-primary-500' />
            <div className='flex flex-col gap-3'>
              <h4 className='text-primary-700 dark:text-primary-500'>
                Allow them in through notification...
              </h4>
              <div className='bg-primary-800 p-3 flex gap-3 rounded-xl items-center'>
                <div className='bg-primary-200 h-12 w-12 rounded-lg flex items-center justify-center'>
                  <Icons.Logo className='h-10 w-10'/>
                </div>
                <div className='flex-1 flex-shrink'>
                  <div>
                    <span className='font-bold'>beforeb wants to join your lobby</span>
                  </div>
                  <div>
                    <span>Do you want to allow beforeb into your lobby</span>
                  </div>
                </div>
                <span className='text-primary-400 self-start'>Now</span>
              </div>
              <div className='px-10'>
                <div className='p-3 rounded-lg bg-primary-800'>
                  Accept
                </div>
              </div>
            </div>
            <div className='flex flex-col gap-3'>
              <h4 className='text-primary-700 dark:text-primary-500'>
                ...or the app
              </h4>
              <Image src={acceptUserImage} alt='eiNoah App Notification' width={900} height={200} className='rounded-lg self-center'/>
            </div>
          </div>
          <div className="flex flex-col gap-4 bg-primary-900 p-4 rounded-lg">
            <h3 className="text-lg text-primary-700 dark:text-primary-500 text-center">
              Get the app tomorrow?
            </h3>
            <hr className='text-primary-500' />
            <div className='px-24'>
              <div className='bg-primary-200 w-full aspect-square flex items-center justify-center rounded-3xl'>
                <Icons.Logo className='h-9/12 w-9/12'/>
              </div>
            </div>
            <h4 className='text-center font-bold text-3xl text-primary-400'>ei Noah</h4>
            <p className='text-primary-500 text-center'>
              Not yet available for download
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
