'use client';

import Link from 'next/link';

import { Button } from './ui/button';

function HeaderUser() {
  return (
    <Button variant="outline" asChild>
      <Link href="/login/discord">Login</Link>
    </Button>
  );
}

export default HeaderUser;
