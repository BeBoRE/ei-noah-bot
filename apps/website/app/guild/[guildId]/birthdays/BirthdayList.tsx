'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getMemberImageUrl } from 'utils/userImage';

import { api } from '@ei/react-shared';
import { type RouterOutputs } from '@ei/trpc';

function getYearsSince(date: Date) {
  const now = new Date();
  const pastDate = new Date(date);

  // Calculate the difference in milliseconds
  const diffInMs = now.getTime() - pastDate.getTime();

  // Convert milliseconds into years (1000 ms/s * 60 s/min * 60 min/h * 24 h/day * 365.25 days/year)
  const msInYear = 1000 * 60 * 60 * 24 * 365.25;

  const years = diffInMs / msInYear;

  return Math.floor(years); // Use Math.floor to get the whole number of years
}

function UserBirthday({
  user,
  guildId,
}: {
  user: RouterOutputs['birthday']['allGuild'][number];
  guildId: string;
}) {
  if (user.birthday === null) {
    return null;
  }

  const age = getYearsSince(user.birthday);

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-1 flex-row place-items-center gap-4 rounded bg-primary-900 p-2">
      <Image
        className="h-12 w-12 rounded-full"
        src={getMemberImageUrl(user.member, guildId)}
        alt="User avatar"
        width={64}
        height={64}
      />
      <p className="text-lg font-bold">
        {user.member.nick ||
          user.member.user.globalName ||
          user.member.user.username}
      </p>
      <p>{age}</p>
      <p className="text-primary-400">{formatter.format(user.birthday)}</p>
    </div>
  );
}

export default function UserBirthdayList() {
  const params = useParams();
  const { guildId } = params;

  if (typeof guildId !== 'string') {
    return 'Something went wrong with the params';
  }

  const [memberData] = api.birthday.allGuild.useSuspenseQuery({
    guildId,
  });

  return (
    <>
      {memberData.map((md) => (
        <UserBirthday key={md.member.user.id} user={md} guildId={guildId} />
      ))}
    </>
  );
}
