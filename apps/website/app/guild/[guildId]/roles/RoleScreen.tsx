'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Plus } from 'lucide-react';
import { api } from 'trpc/react';

import { useRoles } from '@ei/react-shared/roles';

import RoleButton from './RoleButton';

function RoleScreen() {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    throw new Error('Invalid guildId');
  }

  const [guild] = api.guild.get.useSuspenseQuery({ guildId });
  const { roles } = useRoles({ guildId });

  return (
    <>
      {roles.map((role) => (
        <RoleButton key={role.id} role={role} guild={guild} />
      ))}
      <Button
        asChild
        className="flex aspect-square h-auto w-full flex-col items-center justify-center gap-1 rounded-md transition"
      >
        <Link href={`/guild/${guildId}/roles/create`}>
          <span className="text-center text-lg">Create New Role</span>
          <Plus className="h-6 w-6" />
        </Link>
      </Button>
    </>
  );
}

export default RoleScreen;
