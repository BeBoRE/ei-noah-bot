'use client';

import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { api } from 'trpc/react';

import baseConfig from '@ei/tailwind-config';
import { RouterOutputs } from '@ei/trpc';
import { SearchCheck } from 'lucide-react';

type Props = ({
  role: RouterOutputs['roles']['guildCustom'][0];
} | {
  notApprovedRole: RouterOutputs['roles']['guildNotApproved'][0];
}) & {
  member: RouterOutputs['user']['memberMe'];
  guild: RouterOutputs['guild']['get'];
}

function RoleButton({ member, guild, ...props }: Props) {
  const params = useParams();
  const { guildId } = params;

  const isApproved = 'role' in props;

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

  const addable = isApproved ? !member?.roles?.find((id) => id === props.role.id) : true;
  const discordRole = isApproved ? guild?.discord.roles?.find((r) => r.id === props.role.id) : null;

  const color = discordRole?.color
    ? `#${discordRole.color.toString(16).padStart(6, '0')}`
    : baseConfig.theme.colors.primary[500];

  return (
    <Button
      variant="secondary"
      key={isApproved ? props.role.id : props.notApprovedRole.id}
      className={`flex aspect-square h-auto w-full flex-col items-center justify-center rounded-md transition relative ${
        addable ? '' : `outline outline-4`
      }`}
      style={{
        outlineColor: color,
      }}
      disabled={isAdding || isRemoving || !isApproved}
      onClick={() => {
        if (!isApproved) return;

        if (addable) {
          addRole({ guildId, roleId: props.role.id });
        } else {
          removeRole({ guildId, roleId: props.role.id });
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
        {isApproved ? discordRole?.name : props.notApprovedRole.name}
      </span>
      {!isApproved && <SearchCheck className="h-6 w-6 top-1 right-1 absolute text-primary-400" />}
    </Button>
  );
}

export default RoleButton;
