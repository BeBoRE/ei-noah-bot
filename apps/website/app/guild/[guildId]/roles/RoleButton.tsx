'use client';

import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { api } from 'trpc/react';

import baseConfig from '@ei/tailwind-config';
import { RouterOutputs } from '@ei/trpc';
import { Check, SearchCheck, X } from 'lucide-react';
import { canCreateRoles } from '@ei/trpc/src/utils';

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

  
  if (!guildId || typeof guildId !== 'string') {
    return null;
  }
  
  const context = api.useContext();
  
  const isApproved = 'role' in props;

  const discordRole = isApproved ? guild?.discord.roles?.find((r) => r.id === props.role.id) : null;
  const name = isApproved ? discordRole?.name : props.notApprovedRole.name;

  const { mutate: approveRole, isLoading: isApproving } =
    api.roles.approveRole.useMutation({
      onMutate: async ({ roleId }) => {
        await context.roles.guildCustom.cancel({ guildId });
        await context.roles.guildNotApproved.cancel({ guildId });
        await context.guild.get.cancel({ guildId });

        const prevGuildNotApproved = context.roles.guildNotApproved.getData({ guildId });
        const prevGuildCustom = context.roles.guildCustom.getData({ guildId });
        const prevGuild = context.guild.get.getData({ guildId });

        context.roles.guildNotApproved.setData(
          { guildId },
          (prev) => prev?.filter((r) => r.id !== roleId),
        );

        const newRole : RouterOutputs['roles']['guildCustom'][0] = {
          id: roleId.toString(),
          createdByUserId: member.user.id,
          guildId,
        }

        context.roles.guildCustom.setData(
          { guildId },
          (prev) => prev ? [...prev, newRole] : [newRole],
        );

        const newDiscordRole : RouterOutputs['guild']['get']['discord']['roles'][0] = {
          id: roleId.toString(),
          color: 0,
          name: name ?? 'Role',
          permissions: '0',
          hoist: false,
          position: 0,
        }

        context.guild.get.setData(
          { guildId },
          (prev) => prev ? {...prev, discord: {...prev.discord, roles: [...prev.discord.roles, newDiscordRole]}} : prev,
        );

        return { prevGuildNotApproved, prevGuildCustom, prevGuild };
      },
      onError: (_1, _2, prev) => {
        context.roles.guildNotApproved.setData({ guildId }, prev?.prevGuildNotApproved);
        context.roles.guildCustom.setData({ guildId }, prev?.prevGuildCustom);
        context.guild.get.setData({ guildId }, prev?.prevGuild);
      },
      onSettled: async () => {
        await context.roles.guildNotApproved.invalidate({ guildId });
        await context.roles.guildCustom.invalidate({ guildId });
        await context.guild.get.invalidate({ guildId });
      },
    })

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

  const showRejectOrApprove = canCreateRoles(member, guild.discord, guild.db);

  const color = discordRole?.color
    ? `#${discordRole.color.toString(16).padStart(6, '0')}`
    : baseConfig.theme.colors.primary[500];

  return (
    <div className="aspect-square h-auto w-full relative rounded-md overflow-hidden">
      <Button
        variant="secondary"
        key={isApproved ? props.role.id : props.notApprovedRole.id}
        className={`flex aspect-square h-full w-full flex-col items-center justify-center transition ${
          addable ? '' : `outline outline-4`
        }`}
        style={{
          outlineColor: color,
        }}
        disabled={isAdding || isRemoving || !isApproved || isApproving}
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
      </Button>
      {!isApproved && <SearchCheck className="h-6 w-6 top-1 right-1 absolute text-primary-400" />}
      {showRejectOrApprove && !isApproved && (
          <div className='absolute bottom-0 w-full flex'>
            <Button className="rounded-none w-full p-1 bg-accept dark:bg-accept hover:bg-accept/75 dark:hover:bg-accept/75 h-auto py-2" variant="secondary" aria-label='Approve'
              onClick={() => approveRole({guildId, roleId: props.notApprovedRole.id})}>
              <Check className='w-4 h-4'/>
            </Button>
            <Button className="rounded-none w-full p-1 bg-reject dark:bg-reject hover:bg-reject/75 dark:hover:bg-reject/75 h-auto py-2" variant="secondary" aria-label='Reject'>
              <X className='w-4 h-4'/>
            </Button>
          </div>
        )
      }
    </div>
  );
}

export default RoleButton;
