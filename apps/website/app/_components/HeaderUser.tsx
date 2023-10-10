'use client';

import Link from 'next/link';

import { RouterOutputs } from '@ei/trpc';

import { Button } from './ui/button';

type Props = {
  user: RouterOutputs['user']['me'];
};

function HeaderUser({ user }: Props) {
  if (user) {
    return (
      <Button variant="outline" asChild>
        <Link href="/user">{user.globalName || user.username}</Link>
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild>
      <Link href="/login/discord">Login</Link>
    </Button>
  );
}

export default HeaderUser;
