'use client';

import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { api, RouterOutputs } from 'utils/api';

import baseConfig from '@ei/tailwind-config';

type Props = {
  role: RouterOutputs['roles']['guildCustom'][0];
  member: RouterOutputs['user']['memberMe'];
  guild: RouterOutputs['guild']['get'];
};

function RoleButton({ role, member, guild }: Props) {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const context = api.useContext();

  const { mutate: addRole, isLoading: isAdding } =
    api.roles.addRole.useMutation({
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
      onError: async (err, { roleId }) => {
        if (err.data?.code === 'NOT_FOUND') {
          await context.roles.guildCustom.cancel({ guildId });

          context.roles.guildCustom.setData(
            { guildId },
            (prev) => prev?.filter((r) => r.id !== roleId),
          );

          context.roles.guildCustom.invalidate({ guildId });
        }
      },
    });

  const { mutate: removeRole, isLoading: isRemoving } =
    api.roles.removeRole.useMutation({
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
      onError: async (err, { roleId }) => {
        if (err.data?.code === 'NOT_FOUND') {
          await context.roles.guildCustom.cancel({ guildId });

          context.roles.guildCustom.setData(
            { guildId },
            (prev) => prev?.filter((r) => r.id !== roleId),
          );

          context.roles.guildCustom.invalidate({ guildId });
        }
      },
    });

  const addable = !member?.roles?.find((id) => id === role.id);
  const discordRole = guild?.discord.roles?.find((r) => r.id === role.id);

  const color = discordRole?.color
    ? `#${discordRole.color.toString(16).padStart(6, '0')}`
    : baseConfig.theme.colors.primary[500];

  if (!discordRole) {
    return null;
  }

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
      disabled={isAdding || isRemoving}
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
        {discordRole?.name}
      </span>
    </Button>
  );
}

export default RoleButton;
