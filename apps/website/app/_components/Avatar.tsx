'use client';

import Image from 'next/image';
import { api } from 'trpc/react';
import cn from 'utils/utils';

type Props = {
  userId: string;
  guildId: string;
  className?: string;
};

function MemberAvatar({ userId, guildId, className }: Props) {
  const { data: avatar } = api.guild.getAvatar.useQuery(
    { guildId, userId },
    { suspense: false },
  );

  if (!avatar) return null;

  return (
    <Image
      src={avatar}
      width={32}
      height={32}
      alt="avatar"
      className={cn('rounded-full', className)}
    />
  );
}

export default MemberAvatar;
