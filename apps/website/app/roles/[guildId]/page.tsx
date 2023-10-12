'use client';

import { useParams } from 'next/navigation';
import { api } from 'utils/api';

function RolePage() {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const { data: member } = api.user.memberMe.useQuery({ guildId });
  const { data: roles } = api.roles.guild.useQuery({ guildId });
  const { data: guild } = api.guild.get.useQuery({ guildId });

  return (
    <div className="flex-1 p-4">
      <h1 className="text-center text-4xl text-primary-300">{guild?.name}</h1>
      <h2 className="text-2xl">Roles:</h2>
      {roles?.map((role) => (
        <div
          key={role.id}
          style={{
            color: `#${role.color.toString(16)}`,
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1">{role.name}</div>
          <button
            type="button"
            aria-label="Add role"
            className="rounded-md bg-primary-900 p-1 text-primary-100"
          />
        </div>
      ))}
    </div>
  );
}

export default RolePage;
