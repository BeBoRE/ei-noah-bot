'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/v10';
import { Plus, Settings2 } from 'lucide-react';
import { api } from 'utils/api';

function RolePage() {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const { data: member } = api.user.memberMe.useQuery({ guildId });
  const { data: customRoles } = api.roles.guildCustom.useQuery({ guildId });
  const { data: guild } = api.guild.get.useQuery({ guildId });

  const icon =
    guild?.icon &&
    `${RouteBases.cdn}/${CDNRoutes.guildIcon(
      guild.id,
      guild.icon,
      ImageFormat.PNG,
    )}`;

  return (
    <div className="container flex flex-1 flex-col p-4">
      <h1 className="flex items-center justify-center gap-3 p-3 text-center text-4xl text-primary-900 dark:text-primary-300">
        <span>
          {icon && (
            <Image
              src={icon}
              alt={`${guild.name} icon`}
              width={64}
              height={64}
              className="rounded-full"
            />
          )}
        </span>
        {guild?.name}
      </h1>
      <div className="relative flex min-h-[30em] flex-col rounded-xl dark:bg-primary-900 bg-primary-100 py-3">
        <div className='flex absolute right-3 top-3 gap-2'>
          <Button
            asChild
            className=" aspect-square rounded-full p-2"
          >
            <Link href={`/roles/${guildId}/create`}>
              <Plus className="h-6 w-6"/>
            </Link>
          </Button>
          <Button
            asChild
            className="aspect-square rounded-full p-2"
          >
            <Link href={`/roles/${guildId}/settings`}>
              <Settings2 className="h-6 w-6"/>
            </Link>
          </Button>
        </div>
        <h2 className="text-center text-2xl">Roles:</h2>
        <div className="flex flex-1 items-center justify-center">
          {customRoles?.length === 0 ? (
            <div className="text-center text-xl dark:text-primary-300 text-primary-500">
              No roles found.
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
