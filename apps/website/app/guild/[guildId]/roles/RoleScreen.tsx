'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Plus } from 'lucide-react';
import { api } from 'trpc/react';

import { canCreateRoles } from '@ei/trpc/src/utils';

import RoleButton from './RoleButton';

function RoleScreen() {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const [customRoles] = api.roles.guildCustom.useSuspenseQuery({ guildId });
  const [notApprovedRoles] = api.roles.guildNotApproved.useSuspenseQuery({
    guildId,
  });
  const [member] = api.user.memberMe.useSuspenseQuery({ guildId });
  const [guild] = api.guild.get.useSuspenseQuery({ guildId });

  const allowedToCreateRoles =
    member && guild ? canCreateRoles(member, guild?.discord, guild?.db) : false;

  const combinedRoles = [...customRoles.sort(
    (a, b) => {
      const realA = guild.discord.roles.find((r) => r.id === a.id);
      const realB = guild.discord.roles.find((r) => r.id === b.id);

      if (!realA || !realB) return 0;

      return realA.position - realB.position;
    }
  ), ...notApprovedRoles];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-md bg-primary-100 p-4 dark:bg-background">
        <div className="flex place-content-between">
          <h1 className="flex-1 text-3xl">Role Selection</h1>
        </div>
        <div className="grid grid-cols-2 place-content-start items-start justify-items-start gap-4 py-2 md:grid-cols-4 xl:grid-cols-5">
          {combinedRoles
            .filter((role) => {
              if (!('name' in role)) return true;

              if (customRoles.find((r) => r.id === role.id.toString()))
                return false;

              if (allowedToCreateRoles) return true;
              if (role.createdByUserId === member.user.id) return true;

              return false;
            })
            .map((role) => {
              if ('name' in role) {
                return (
                  <RoleButton
                    key={role.id.toString()}
                    notApprovedRole={role}
                    member={member}
                    guild={guild}
                  />
                );
              }

              return (
                <RoleButton
                  key={role.id}
                  role={role}
                  member={member}
                  guild={guild}
                />
              );
            })}
          <Button
            asChild
            className="flex aspect-square h-auto w-full flex-col items-center justify-center gap-1 rounded-md transition"
          >
            <Link href={`/guild/${guildId}/roles/create`}>
              <span className="text-center text-lg">Create New Role</span>
              <Plus className="h-6 w-6" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RoleScreen;
