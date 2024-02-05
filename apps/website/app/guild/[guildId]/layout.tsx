import { PropsWithChildren, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { Button } from 'app/_components/ui/button';
import { Separator } from 'app/_components/ui/separator';
import { Skeleton } from 'app/_components/ui/skeleton';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/v10';
import { Settings, Users } from 'lucide-react';
import rscApi from 'trpc/server';

import { userIsAdmin } from '@ei/trpc/src/utils';

type Props = PropsWithChildren & {
  params: {
    guildId: string;
  };
};

const getGuild = async (
  api: Awaited<ReturnType<typeof rscApi>>,
  guildId: string,
) => {
  const guild = await api.guild.get({ guildId }).catch((err) => {
    if (err instanceof TRPCError) {
      if (
        err.code === 'NOT_FOUND' ||
        err.code === 'FORBIDDEN' ||
        err.code === 'UNAUTHORIZED'
      ) {
        notFound();
      }
    }

    throw err;
  });

  return guild.discord;
};

async function AdminButtons({ guildId }: { guildId: string }) {
  const api = await rscApi();
  const guild = await getGuild(api, guildId);
  const user = await api.user.memberMe({ guildId });

  const isAdmin = userIsAdmin(user, guild);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Separator />
      <div className="py-2">
        <Button asChild className="w-full justify-start" variant="outline">
          <Link href={`/guild/${guildId}/settings`}>
            <Settings className="h-w mr-2 w-4" />
            Settings
          </Link>
        </Button>
      </div>
    </>
  );
}

async function GuildInfo({ guildId }: { guildId: string }) {
  const api = await rscApi();
  const guild = await getGuild(api, guildId);

  const icon =
    guild?.icon &&
    `${RouteBases.cdn}/${CDNRoutes.guildIcon(
      guild.id,
      guild.icon,
      ImageFormat.PNG,
    )}`;

  return (
    <h1 className="flex items-center justify-center gap-3 rounded-md p-2 text-center text-2xl  text-primary-900 dark:text-primary-300 ">
      <span>
        {icon && (
          <Image
            src={icon}
            alt={`${guild.name} icon`}
            width={48}
            height={48}
            className="rounded-full"
          />
        )}
      </span>
      {guild?.name}
    </h1>
  );
}

function GuildLayout({ children, params: { guildId } }: Props) {
  return (
    <div className="container flex flex-1 flex-col gap-2 py-4 sm:flex-row">
      <div className="flex flex-col gap-2 sm:w-3/12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 p-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          }
        >
          <GuildInfo guildId={guildId} />
        </Suspense>
        <div className="flex-1 rounded-md bg-primary-100 p-2 dark:bg-primary-900 sm:dark:bg-gradient-to-b sm:dark:from-primary-900 sm:dark:to-primary-950">
          <div className="py-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href={`/guild/${guildId}/roles`}>
                <Users className="mr-2 h-4 w-4" />
                Roles
              </Link>
            </Button>
          </div>
          <Suspense fallback>
            <AdminButtons guildId={guildId} />
          </Suspense>
        </div>
      </div>
      <Suspense>{children}</Suspense>
    </div>
  );
}

export default GuildLayout;
