'use client';

import Link from 'next/link';

import { RouterOutputs } from '@ei/trpc';

import { Button } from './ui/button';

import { RouteBases, CDNRoutes, ImageFormat, DefaultUserAvatarAssets } from 'discord-api-types/v10'
import Image from 'next/image';

type Props = {
  user: RouterOutputs['user']['me'];
};

const getUserImageUrl = (user: { avatar?: string | null; id: string }) =>{
  const index = Number(BigInt(user.id) % BigInt(5));

  if (!user.avatar) return `${RouteBases.cdn}${CDNRoutes.defaultUserAvatar(index as DefaultUserAvatarAssets)}`

  return `${RouteBases.cdn}${CDNRoutes.userAvatar(
    user.id,
    user.avatar,
    ImageFormat.PNG,
  )}`};

function HeaderUser({ user }: Props) {
  if (user) {
    return (
      <div className='flex items-center gap-2'>
        <Image className='rounded-full' src={getUserImageUrl(user)} alt={`${user.globalName}'s avatar`} width={32} height={32} />
        <span>{user.globalName || user.username}</span>
      </div>
    );
  }

  return (
    <Button variant="outline" asChild>
      <Link href="/login/discord">Login</Link>
    </Button>
  );
}

export default HeaderUser;
