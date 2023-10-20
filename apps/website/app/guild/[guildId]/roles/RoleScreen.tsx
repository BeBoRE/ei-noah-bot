'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Plus, X } from 'lucide-react';
import { api, RouterOutputs } from 'utils/api';

import baseConfig from '@ei/tailwind-config';

type Props = {
  initialData: {
    customRoles: RouterOutputs['roles']['guildCustom'];
    member: RouterOutputs['user']['memberMe'];
    dbRoles: RouterOutputs['roles']['guildAll'];
  };
};

function RoleScreen({ initialData }: Props) {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const context = api.useContext();

  const { mutate: addRole } = api.roles.addRole.useMutation({
    onMutate: async ({ roleId }) => {
      await context.user.memberMe.cancel({ guildId });

      const prevMember = context.user.memberMe.getData({ guildId });
      const newMember = prevMember && {
        ...prevMember,
        roles: [...prevMember.roles, roleId],
      };

      context.user.memberMe.setData({ guildId }, newMember);

      return { prevMember };
    },
    onSettled: () => {
      context.user.memberMe.invalidate({ guildId });
    },
  });

  const { mutate: removeRole } = api.roles.removeRole.useMutation({
    onMutate: async ({ roleId }) => {
      await context.user.memberMe.cancel({ guildId });

      const prevMember = context.user.memberMe.getData({ guildId });
      const newMember = prevMember && {
        ...prevMember,
        roles: prevMember.roles.filter((id) => id !== roleId),
      };

      context.user.memberMe.setData({ guildId }, newMember);

      return { prevMember };
    },
    onSettled: () => {
      context.user.memberMe.invalidate({ guildId });
    },
  });

  const { data: customRoles } = api.roles.guildCustom.useQuery(
    { guildId },
    { initialData: initialData.customRoles },
  );
  const { data: member } = api.user.memberMe.useQuery(
    { guildId },
    { initialData: initialData.member },
  );
  const { data: dbRoles } = api.roles.guildAll.useQuery(
    { guildId },
    { initialData: initialData.dbRoles },
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col rounded-md bg-primary-100 p-4 dark:bg-primary-900">
        <div className="flex place-content-between">
          <h1 className="flex-1 text-3xl">Role Selection</h1>
        </div>
        <div className="grid grid-cols-2 place-content-start items-start justify-items-start gap-4 py-2 md:grid-cols-4 xl:grid-cols-5">
          {customRoles?.length === 0 ? (
            <div className="flex aspect-square w-full flex-col place-content-center items-center rounded-xl bg-primary-50 text-xl font-bold text-primary-500 dark:bg-primary-800 dark:text-primary-300">
              <X className="h-8 w-8 sm:h-24 sm:w-24" />
              <span>No roles found</span>
            </div>
          ) : (
            customRoles?.map((role) => {
              const addable = !member?.roles?.find((id) => id === role.id);
              const discordRole = dbRoles?.find((r) => r.id === role.id);

              const color = discordRole?.color
                ? `#${discordRole.color.toString(16).padStart(6, '0')}`
                : baseConfig.theme.colors.primary[500];

              return (
                <Button
                  variant="secondary"
                  key={role.id}
                  className={`flex aspect-square h-auto w-full flex-col items-center justify-center rounded-md transition ${
                    addable ? '' : `outline outline-4`
                  }`}
                  style={{
                    outlineColor: color,
                  }}
                  onClick={() => {
                    if (addable) {
                      addRole({ guildId, roleId: role.id });
                    } else {
                      removeRole({ guildId, roleId: role.id });
                    }
                  }}
                >
                  <span
                    className="text-xl"
                    style={{
                      color,
                      textShadow: `0 0 0.2rem #000`,
                    }}
                  >
                    {role.name}
                  </span>
                </Button>
              );
            })
          )}
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
