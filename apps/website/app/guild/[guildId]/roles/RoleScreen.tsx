'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Plus, X } from 'lucide-react';
import { api, RouterOutputs } from 'utils/api';

import { canCreateRoles } from '@ei/trpc/src/utils';

import RoleButton from './RoleButton';

type Props = {
  initialData: {
    customRoles: RouterOutputs['roles']['guildCustom'];
    member: RouterOutputs['user']['memberMe'];
    guild: RouterOutputs['guild']['get'];
  };
};

function RoleScreen({ initialData }: Props) {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const { data: customRoles } = api.roles.guildCustom.useQuery(
    { guildId },
    { initialData: initialData.customRoles },
  );
  const { data: member } = api.user.memberMe.useQuery(
    { guildId },
    { initialData: initialData.member },
  );
  const { data: guild } = api.guild.get.useQuery(
    { guildId },
    {
      initialData: initialData.guild,
    },
  );

  const allowedToCreateRoles =
    member && guild ? canCreateRoles(member, guild?.discord, guild?.db) : false;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-md p-4 bg-primary-100 dark:bg-background">
        <div className="flex place-content-between">
          <h1 className="flex-1 text-3xl">Role Selection</h1>
        </div>
        <div className="grid grid-cols-2 place-content-start items-start justify-items-start gap-4 py-2 md:grid-cols-4 xl:grid-cols-5">
          {!allowedToCreateRoles && !customRoles.length && (
            <div className="flex aspect-square w-full flex-col place-content-center items-center rounded-xl bg-primary-50 text-xl font-bold text-primary-500 dark:bg-primary-800 dark:text-primary-300">
              <X className="h-8 w-8 sm:h-24 sm:w-24" />
              <span>No roles found</span>
            </div>
          )}
          {customRoles?.map((role) => (
            <RoleButton
              key={role.id}
              role={role}
              member={member}
              guild={guild}
            />
          ))}
          {allowedToCreateRoles && (
            <Button
              asChild
              className="flex aspect-square h-auto w-full flex-col items-center justify-center gap-1 rounded-md transition"
            >
              <Link href={`/guild/${guildId}/roles/create`}>
                <span className="text-center text-lg">Create New Role</span>
                <Plus className="h-6 w-6" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoleScreen;
