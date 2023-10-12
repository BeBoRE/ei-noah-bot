import * as React from 'react';
import Link from 'next/link';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/v10';

import { ApiGuild } from '@ei/trpc/src/routes/guilds';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './ui/navigation-menu';

type GuildProps = {
  guild: ApiGuild;
};
const Guild = React.forwardRef<React.ElementRef<'a'>, GuildProps>(
  ({ guild }, ref) => {
    const fallbackText = guild.name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('');
    const icon =
      guild.icon &&
      `${RouteBases.cdn}/${CDNRoutes.guildIcon(
        guild.id,
        guild.icon,
        ImageFormat.PNG,
      )}`;

    return (
      <li>
        <Link passHref ref={ref} href={`/roles/${guild.id}`}>
          <NavigationMenuLink className="flex select-none items-center gap-2 space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-primary-900 hover:text-primary-100 focus:bg-primary-900 focus:text-primary-200">
            <Avatar>
              {icon && <AvatarImage src={icon} />}
              <AvatarFallback>{fallbackText}</AvatarFallback>
            </Avatar>
            <div className="text-md font-bold leading-none">{guild.name}</div>
          </NavigationMenuLink>
        </Link>
      </li>
    );
  },
);
Guild.displayName = 'Guild';

type Props = {
  guilds: ApiGuild[];
};
export function NavMenu({ guilds }: Props) {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Roles</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="flex min-w-[10em] flex-col gap-3 p-2">
              {guilds.map((guild) => (
                <Guild key={guild.id} guild={guild} />
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
