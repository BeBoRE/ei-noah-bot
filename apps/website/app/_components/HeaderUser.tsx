import { PropsWithChildren, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import rscApi from 'trpc/server';
import { getUserImageUrl } from 'utils/userImage';

import Form from './Form';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Skeleton } from './ui/skeleton';

type Props = PropsWithChildren;

function Dropdown({ children }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex aspect-square items-center gap-2 p-0 sm:aspect-auto sm:px-4 sm:py-2"
        >
          {children}
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

async function HeaderUser() {
  const user = await rscApi.user.me().catch(() => null);

  if (user) {
    return (
      <Dropdown>
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
      </Dropdown>
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

export function SuspenseHeaderUser() {
  return (
    <Suspense
      fallback={
        <Dropdown>
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-6 w-20" />
        </Dropdown>
      }
    >
      <HeaderUser />
    </Suspense>
  );
}

export default HeaderUser;
