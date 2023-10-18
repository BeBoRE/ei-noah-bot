'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Plus, X } from 'lucide-react';
import { api } from 'utils/api';

function RolePage() {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const { data: member } = api.user.memberMe.useQuery({ guildId });
  const { data: customRoles } = api.roles.guildCustom.useQuery({ guildId });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-md dark:bg-primary-900 bg-primary-100 p-4">
        <div className='flex place-content-between'>
          <h1 className="text-3xl flex-1">Role selection</h1>
          <div className='flex gap-2'>
            <Button
              asChild
              className=" aspect-square rounded-full p-2"
            >
              <Link href={`/roles/${guildId}/create`}>
                <Plus className="h-6 w-6"/>
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          {customRoles?.length === 0 ? (
            <div className="text-xl font-bold dark:text-primary-300 text-primary-500 flex flex-col items-center bg-primary-50 dark:bg-primary-800 sm:p-10 p-2 rounded-xl aspect-square place-content-center">
              <X className="sm:h-24 sm:w-24 h-8 w-8" />
              <span>No roles found</span>
            </div>
          ) : (
            customRoles?.map((role) => (
              <div key={role.id} className="flex items-center gap-2">
                <div className="flex-1">{role.name}</div>
                <button
                  type="button"
                  aria-label="Add role"
                  className="rounded-md bg-primary-900 p-1 text-primary-100"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RolePage;
