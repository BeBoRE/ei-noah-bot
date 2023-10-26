import * as context from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { TRPCError } from '@trpc/server';
import { Button } from 'app/_components/ui/button';
import { Separator } from 'app/_components/ui/separator';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/v10';
import { Settings, Users } from 'lucide-react';
import rscApi from 'utils/rsc';

import { userIsAdmin } from '@ei/trpc/src/utils';

type Props = {
  children?: React.ReactNode;
  params: {
    guildId: string;
  };
};

const GuildLayout = async ({ children, params: { guildId } }: Props) => {
  const api = await rscApi(context);

  const guild = (
    await api.guild.get({ guildId }).catch((err) => {
      if (err instanceof TRPCError) {
        if (err.code === 'NOT_FOUND') {
          notFound();
        }

        if (err.code === 'FORBIDDEN' || err.code === 'UNAUTHORIZED') {
          redirect('/');
        }
      }

      throw err;
    })
  )?.discord;

  const member = await api.user.memberMe({ guildId });

  const isAdmin = userIsAdmin(member, guild);

  const icon =
    guild?.icon &&
    `${RouteBases.cdn}/${CDNRoutes.guildIcon(
      guild.id,
      guild.icon,
      ImageFormat.PNG,
    )}`;

  if (!guild) {
    notFound();
  }

  return (
    <div className="container flex flex-1 flex-col gap-2 py-4 sm:flex-row">
      <div className="flex flex-col gap-2 sm:w-3/12">
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
        <div className="rounded-md bg-primary-100 p-2 dark:bg-primary-900 sm:dark:bg-gradient-to-b sm:dark:from-primary-900 sm:dark:to-primary-950 flex-1">
          <div className="py-2">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href={`/guild/${guildId}/roles`}>
                <Users className="mr-2 h-4 w-4" />
                Roles
              </Link>
            </Button>
          </div>
          {isAdmin && (
            <>
              <Separator />
              <div className="py-2">
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href={`/guild/${guildId}/settings`}>
                    <Settings className="h-w mr-2 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};

export default GuildLayout;
