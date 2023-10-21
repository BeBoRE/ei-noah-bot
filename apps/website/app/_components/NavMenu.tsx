import * as React from 'react';
import Link from 'next/link';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/v10';
import { Users } from 'lucide-react';
import cn from 'utils/utils';

import { ApiGuild } from '@ei/trpc/src/schemas';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './ui/navigation-menu';
import navigationMenuTriggerStyle from './ui/navigationMenuStyle';

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
      <li className="flex">
        <NavigationMenuLink
          asChild
          className={cn([
            navigationMenuTriggerStyle(),
            'flex flex-1 justify-start gap-2 py-7',
          ])}
        >
          <Link ref={ref} href={`/guild/${guild.id}/roles`}>
            <Avatar>
              {icon && (
                <AvatarImage
                  src={icon}
                  alt={`${guild.name} icon`}
                  width={32}
                  height={32}
                />
              )}
              <AvatarFallback>{fallbackText}</AvatarFallback>
            </Avatar>
            <div className="text-md font-bold leading-none">{guild.name}</div>
          </Link>
        </NavigationMenuLink>
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
          <NavigationMenuTrigger>
            <Users className="mr-2 h-4 w-4" />
            Roles
          </NavigationMenuTrigger>
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
