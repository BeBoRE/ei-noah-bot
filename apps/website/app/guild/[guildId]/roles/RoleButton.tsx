'use client';

import { useParams } from 'next/navigation';
import { Button } from 'app/_components/ui/button';
import { Check, SearchCheck, X } from 'lucide-react';
import { api } from 'trpc/react';

import baseConfig from '@ei/tailwind-config';
import { RouterOutputs } from '@ei/trpc';
import { canCreateRoles } from '@ei/trpc/src/utils';
import { Tooltip, TooltipContent, TooltipProvider } from 'app/_components/ui/tooltip';
import { TooltipTrigger } from '@radix-ui/react-tooltip';

type Props = (
  | {
      role: RouterOutputs['roles']['guildCustom'][0];
    }
  | {
      notApprovedRole: RouterOutputs['roles']['guildNotApproved'][0];
    }
) & {
  member: RouterOutputs['user']['memberMe'];
  guild: RouterOutputs['guild']['get'];
};

function RoleButton({ member, guild, ...props }: Props) {
  const params = useParams();
  const { guildId } = params;

  if (!guildId || typeof guildId !== 'string') {
    return null;
  }

  const context = api.useContext();

  const isApproved = 'role' in props;

  const discordRole = isApproved
    ? guild?.discord.roles?.find((r) => r.id === props.role.id)
    : null;
  const name = isApproved ? discordRole?.name : props.notApprovedRole.name;

  const { mutate: approveRole, isLoading: isApproving } =
    api.roles.approveRole.useMutation({
      onMutate: async ({ roleId }) => {
        await context.roles.guildCustom.cancel({ guildId });
        await context.roles.guildNotApproved.cancel({ guildId });
        await context.guild.get.cancel({ guildId });

        const prevGuildNotApproved = context.roles.guildNotApproved.getData({
          guildId,
        });
        const prevGuildCustom = context.roles.guildCustom.getData({ guildId });
        const prevGuild = context.guild.get.getData({ guildId });

        context.roles.guildNotApproved.setData(
          { guildId },
          (prev) => prev?.filter((r) => r.id !== roleId),
        );

        const fakeRole: RouterOutputs['roles']['guildCustom'][0] = {
          id: roleId.toString(), // Made up ID
          createdAt: new Date().toISOString(),
          createdBy: 0,
          guildId,
        };

        context.roles.guildCustom.setData({ guildId }, (prev) =>
          prev ? [...prev, fakeRole] : [fakeRole],
        );

        const fakeDiscordRole: RouterOutputs['guild']['get']['discord']['roles'][0] =
          {
            id: roleId.toString(), // Made up ID
            color: 0,
            name: name ?? 'Role',
            permissions: '0',
            hoist: false,
            position: 0,
          };

        context.guild.get.setData({ guildId }, (prev) =>
          prev
            ? {
                ...prev,
                discord: {
                  ...prev.discord,
                  roles: [...prev.discord.roles, fakeDiscordRole],
                },
              }
            : prev,
        );

        return {
          prevGuildNotApproved,
          prevGuildCustom,
          prevGuild,
          fakeDiscordRole,
          fakeRole,
        };
      },
      onSuccess: ({ dbRole, discordRole: newDiscordRole }, _, beforeMutate) => {
        context.roles.guildCustom.setData({ guildId }, () =>
          beforeMutate?.prevGuildCustom
            ? [...beforeMutate.prevGuildCustom, dbRole]
            : [dbRole],
        );

        context.guild.get.setData({ guildId }, () =>
          beforeMutate?.prevGuild
            ? {
                ...beforeMutate.prevGuild,
                discord: {
                  ...beforeMutate.prevGuild.discord,
                  roles: [
                    ...beforeMutate.prevGuild.discord.roles,
                    newDiscordRole,
                  ],
                },
              }
            : beforeMutate?.prevGuild,
        );
      },
      onError: (_1, _2, prev) => {
        context.roles.guildNotApproved.setData(
          { guildId },
          prev?.prevGuildNotApproved,
        );
        context.roles.guildCustom.setData({ guildId }, prev?.prevGuildCustom);
        context.guild.get.setData({ guildId }, prev?.prevGuild);
      },
      onSettled: async () => {
        await context.roles.guildNotApproved.invalidate({ guildId });
        await context.roles.guildCustom.invalidate({ guildId });
        await context.guild.get.invalidate({ guildId });
      },
    });

  const { mutate: rejectRole } = api.roles.rejectRole.useMutation({
    onMutate: async ({ roleId }) => {
      await context.roles.guildNotApproved.cancel({ guildId });

      const prevGuildNotApproved = context.roles.guildNotApproved.getData({
        guildId,
      });

      context.roles.guildNotApproved.setData(
        { guildId },
        (prev) => prev?.filter((r) => r.id !== roleId),
      );

      return { prevGuildNotApproved };
    },
    onError: (_1, _2, prev) => {
      context.roles.guildNotApproved.setData(
        { guildId },
        prev?.prevGuildNotApproved,
      );
    },
    onSettled: async () => {
      await context.roles.guildNotApproved.invalidate({ guildId });
    },
  });

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

  const addable = isApproved
    ? !member.roles.some((id) => id === props.role.id)
    : true;

  const showRejectOrApprove = canCreateRoles(member, guild.discord, guild.db);

  const color = discordRole?.color
    ? `#${discordRole.color.toString(16).padStart(6, '0')}`
    : baseConfig.theme.colors.primary[500];

  return (
    <div className="relative aspect-square h-auto w-full rounded-md">
      <Button
        variant="secondary"
        key={isApproved ? props.role.id : props.notApprovedRole.id}
        className={`flex aspect-square h-full w-full flex-col items-center justify-center transition ${
          addable ? '' : `outline outline-4`
        }`}
        style={{
          outlineColor: color,
        }}
        disabled={isAdding || isRemoving || isApproving || !isApproved}
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
      {!isApproved && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SearchCheck className="absolute right-1 top-1 h-6 w-6 text-primary-400" />
            </TooltipTrigger>
            <TooltipContent>
              This role is awaiting approval by a moderator.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {showRejectOrApprove && !isApproved && (
        <div className="absolute bottom-0 flex w-full overflow-hidden rounded-b">
          <Button
            className="h-auto w-full rounded-none bg-accept p-1 py-2 hover:bg-accept/75 dark:bg-accept dark:hover:bg-accept/75"
            variant="secondary"
            aria-label="Approve"
            onClick={() =>
              approveRole({ guildId, roleId: props.notApprovedRole.id })
            }
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            className="h-auto w-full rounded-none bg-reject p-1 py-2 hover:bg-reject/75 dark:bg-reject dark:hover:bg-reject/75"
            variant="secondary"
            aria-label="Reject"
            onClick={() =>
              rejectRole({ guildId, roleId: props.notApprovedRole.id })
            }
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default RoleButton;
