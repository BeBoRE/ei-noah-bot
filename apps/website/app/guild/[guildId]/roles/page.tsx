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

  const { data: customRoles } = api.roles.guildCustom.useQuery({ guildId });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-md bg-primary-100 p-4 dark:bg-primary-900">
        <div className="flex place-content-between">
          <h1 className="flex-1 text-3xl">Role Selection</h1>
          <div className="flex gap-2">
            <Button asChild className=" aspect-square rounded-full p-2">
              <Link href={`/guild/${guildId}/roles/create`}>
                <Plus className="h-6 w-6" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          {customRoles?.length === 0 ? (
            <div className="flex aspect-square flex-col place-content-center items-center rounded-xl bg-primary-50 p-2 text-xl font-bold text-primary-500 dark:bg-primary-800 dark:text-primary-300 sm:p-10">
              <X className="h-8 w-8 sm:h-24 sm:w-24" />
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
