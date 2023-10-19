'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Minus, Plus, X } from 'lucide-react';
import { api } from 'utils/api';

function RolePage() {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const { data: customRoles } = api.roles.guildCustom.useQuery({ guildId });
  const { data: member } = api.user.memberMe.useQuery({guildId})

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
        <div className="grid grid-cols-4 justify-items-start items-start place-content-start gap-2 p-2">
          {customRoles?.length === 0 ? (
            <div className="flex w-full aspect-square flex-col place-content-center items-center rounded-xl bg-primary-50 text-xl font-bold text-primary-500 dark:bg-primary-800 dark:text-primary-300">
              <X className="h-8 w-8 sm:h-24 sm:w-24" />
              <span>No roles found</span>
            </div>
          ) : (
            customRoles?.map((role) => {
              const addable = !member?.roles?.find((id) => id === role.id);

              const buttonStyle = "w-full aspect-square flex flex-col bg-primary-800 rounded-md min-h-[10em] justify-center items-center"

              return (
              <Button variant='secondary' key={role.id} className={`${buttonStyle} ${addable ? '' : 'ring-primary-500'}`}>
                {addable ? <Plus className="h-8 w-8" /> : <Minus className="h-8 w-8" />}
                <span className='text-xl'>{role.name}</span>
              </Button>
            )})
          )}
        </div>
      </div>
    </div>
  );
}

export default RolePage;
