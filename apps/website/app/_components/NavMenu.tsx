import * as React from 'react';
import Link from 'next/link';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/v10';
import { Users } from 'lucide-react';
import rscApi from 'trpc/server';
import cn from 'utils/utils';

import { ApiGuild } from '@ei/trpc/src/schemas';

import { GuildAvatar } from './GuildAvatar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './ui/navigation-menu';
import navigationMenuTriggerStyle from './ui/navigationMenuStyle';
import { Skeleton } from './ui/skeleton';

type GuildProps = {
  guild: ApiGuild;
};

const Guild = React.forwardRef<React.ElementRef<'a'>, GuildProps>(
  ({ guild }, ref) => {
    const icon =
      guild.icon &&
      `${RouteBases.cdn}/${CDNRoutes.guildIcon(
        guild.id,
        guild.icon,
        ImageFormat.PNG,
      )}`;

    return (
      <li className="flex">
        <NavigationMenuLink
          asChild
          className={cn([
            navigationMenuTriggerStyle(),
            'flex flex-1 justify-start gap-2 py-7',
          ])}
        >
          <Link ref={ref} href={`/guild/${guild.id}/roles`}>
            <GuildAvatar name={guild.name} icon={icon} />
            <div className="text-md font-bold leading-none">{guild.name}</div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  },
);
Guild.displayName = 'Guild';

async function Guilds() {
  const guilds = await rscApi.guild.all().catch(() => null);

  if (!guilds || guilds.length <= 0) {
    return null;
  }

  return (
    <ul className="flex min-w-[10em] flex-col gap-3 p-2">
      {guilds.map((guild) => (
        <Guild key={guild.id} guild={guild} />
      ))}
    </ul>
  );
}

function GuildsSkeleton() {
  return (
    <ul className="flex min-w-[10em] flex-col gap-3 p-2">
      {new Array(3).fill(null).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key -- i is unique
        <li className="flex" key={i}>
          <button
            disabled
            type="button"
            className={cn([
              navigationMenuTriggerStyle(),
              'flex flex-1 justify-start gap-2 py-7',
            ])}
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export async function NavMenu() {
  const user = await rscApi.user.me().catch(() => null);

  if (!user) {
    return null;
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>
            <Users className="mr-2 h-4 w-4" />
            Roles
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <React.Suspense fallback={<GuildsSkeleton />}>
              <Guilds />
            </React.Suspense>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
