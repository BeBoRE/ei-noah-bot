import Image from 'next/image';
import Link from 'next/link';
import {
  CDNRoutes,
  DefaultUserAvatarAssets,
  ImageFormat,
  RouteBases,
} from 'discord-api-types/v10';
import { LogOut } from 'lucide-react';

import { RouterOutputs } from '@ei/trpc';

import Form from './Form';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

type Props = {
  user: RouterOutputs['user']['me'];
};

export const getUserImageUrl = (user: {
  avatar?: string | null;
  id: string;
}) => {
  // eslint-disable-next-line no-bitwise
  const index = Number((BigInt(user.id) >> BigInt(22)) % BigInt(6));

  if (!user.avatar)
    return `${RouteBases.cdn}${CDNRoutes.defaultUserAvatar(
      index as DefaultUserAvatarAssets,
    )}`;

  return `${RouteBases.cdn}${CDNRoutes.userAvatar(
    user.id,
    user.avatar,
    ImageFormat.PNG,
  )}`;
};

export const getMemberImageUrl = (
  member: {
    user: {
      avatar?: string | null;
      id: string;
    };
    avatar?: string | null;
  },
  guildId: string,
) => {
  if (!member.avatar) {
    return getUserImageUrl(member.user);
  }

  return `${RouteBases.cdn}${CDNRoutes.guildMemberAvatar(
    guildId,
    member.user.id,
    member.avatar,
    ImageFormat.PNG,
  )}`;
};

function HeaderUser({ user }: Props) {
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex aspect-square items-center gap-2 p-0 sm:aspect-auto sm:px-4 sm:py-2"
          >
            <Image
              className="rounded-full"
              src={getUserImageUrl(user)}
              alt={`${user.globalName}'s avatar`}
              width={32}
              height={32}
            />
            <span className="hidden sm:block">
              {user.globalName || user.username}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <Form action="/logout" className="flex flex-1">
            <DropdownMenuItem asChild>
              <button type="submit" className="flex-1">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </button>
            </DropdownMenuItem>
          </Form>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button variant="outline" asChild>
      <Link prefetch={false} href="/login/discord">
        Login
      </Link>
    </Button>
  );
}

export default HeaderUser;
