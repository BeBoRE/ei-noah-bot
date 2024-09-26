import { Suspense } from 'react';
import rscApi, { HydrateClient } from 'trpc/server';

import UserBirthdayList from './BirthdayList';

function BirthdayPage({ params }: { params: { guildId: string } }) {
  rscApi.birthday.allGuild.prefetch({ guildId: params.guildId });

  return (
    <HydrateClient>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-2 rounded-md bg-primary-100 p-4 dark:bg-background">
          <div className="flex place-content-between">
            <h1 className="flex-1 text-3xl">Birthdays</h1>
          </div>
          <div className="flex gap-2">
            <Suspense>
              <UserBirthdayList />
            </Suspense>
          </div>
        </div>
      </div>
    </HydrateClient>
  );
}

export default BirthdayPage;
