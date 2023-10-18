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

const getUserImageUrl = (user: { avatar?: string | null; id: string }) => {
  const index = Number(BigInt(user.id) % BigInt(5));

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

function HeaderUser({ user }: Props) {
  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Image
              className="rounded-full"
              src={getUserImageUrl(user)}
              alt={`${user.globalName}'s avatar`}
              width={32}
              height={32}
            />
            <span>{user.globalName || user.username}</span>
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
