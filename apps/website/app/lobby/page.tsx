import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import rscApi from 'trpc/server';

import LobbyScreen from './LobbyScreen';

async function LobbyPage() {
  const user = await rscApi.user.me();

  if (!user) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="flex-1" />}>
      <LobbyScreen />
    </Suspense>
  );
}

export default LobbyPage;
