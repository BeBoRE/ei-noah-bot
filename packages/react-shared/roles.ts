import baseConfig from '@ei/tailwind-config';
import { RouterOutputs } from '@ei/trpc';
import { canCreateRoles } from '@ei/trpc/src/utils';

import { api } from './api';

export type Role = RouterOutputs['roles']['guildCustom'][0];
export type NotApprovedRole = RouterOutputs['roles']['guildNotApproved'][0];
export type Guild = RouterOutputs['guild']['get'];

export const useRoles = ({ guildId }: { guildId: string }) => {
  const [customRoles] = api.roles.guildCustom.useSuspenseQuery({ guildId });
  const [notApprovedRoles] = api.roles.guildNotApproved.useSuspenseQuery({
    guildId,
  });
  const [member] = api.user.memberMe.useSuspenseQuery({ guildId });
  const [guild] = api.guild.get.useSuspenseQuery({ guildId });

  const allowedToCreateRoles =
    member && guild ? canCreateRoles(member, guild?.discord) : false;

  const combinedRoles = [
    ...customRoles
      .sort((a, b) => {
        const realA = guild.discord.roles.find((r) => r.id === a.id);
        const realB = guild.discord.roles.find((r) => r.id === b.id);

        if (!realA || !realB) return 0;

        return realA.position - realB.position;
      })
      .reverse(),
    ...notApprovedRoles,
  ];

  const roles = combinedRoles.filter((role) => {
    if (!('name' in role)) return true;

    if (customRoles.find((r) => r.id === role.id.toString())) return false;

    if (allowedToCreateRoles) return true;
    if (role.createdByUserId === member.user.id) return true;

    return false;
  });

  return {
    roles,
  };
};

const useApproveRole = (role: NotApprovedRole | Role) => {
  const utils = api.useUtils();
  const { guildId } = role;

  const name = 'name' in role ? role.name : undefined;

  const {
    mutate: approveRole,
    isPending: isApproving,
    ...rest
  } = api.roles.approveRole.useMutation({
    onMutate: async ({ roleId }) => {
      await utils.roles.guildCustom.cancel({ guildId });
      await utils.roles.guildNotApproved.cancel({ guildId });
      await utils.guild.get.cancel({ guildId });

      const prevGuildNotApproved = utils.roles.guildNotApproved.getData({
        guildId,
      });
      const prevGuildCustom = utils.roles.guildCustom.getData({ guildId });
      const prevGuild = utils.guild.get.getData({ guildId });

      utils.roles.guildNotApproved.setData(
        { guildId },
        (prev) => prev?.filter((r) => r.id !== roleId),
      );

      const fakeRole: RouterOutputs['roles']['guildCustom'][0] = {
        id: roleId.toString(), // Made up ID
        createdAt: new Date().toISOString(),
        createdBy: 0,
        createdByUserId: role.createdByUserId || undefined,
        guildId,
      };

      utils.roles.guildCustom.setData({ guildId }, (prev) =>
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

      utils.guild.get.setData({ guildId }, (prev) =>
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
      utils.roles.guildCustom.setData({ guildId }, () =>
        beforeMutate?.prevGuildCustom
          ? [...beforeMutate.prevGuildCustom, dbRole]
          : [dbRole],
      );

      utils.guild.get.setData({ guildId }, () =>
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
      utils.roles.guildNotApproved.setData(
        { guildId },
        prev?.prevGuildNotApproved,
      );
      utils.roles.guildCustom.setData({ guildId }, prev?.prevGuildCustom);
      utils.guild.get.setData({ guildId }, prev?.prevGuild);
    },
    onSettled: async () => {
      await utils.roles.guildNotApproved.invalidate({ guildId });
      await utils.roles.guildCustom.invalidate({ guildId });
      await utils.guild.get.invalidate({ guildId });
    },
  });

  return {
    approveRole: () => {
      if (!('name' in role)) return;

      approveRole({ roleId: role.id, guildId });
    },
    isApproving,
    ...rest,
  };
};

const useRejectRole = (role: NotApprovedRole | Role) => {
  const utils = api.useUtils();
  const { guildId } = role;

  const { mutate: rejectRole, ...rest } = api.roles.rejectRole.useMutation({
    onMutate: async ({ roleId }) => {
      await utils.roles.guildNotApproved.cancel({ guildId });

      const prevGuildNotApproved = utils.roles.guildNotApproved.getData({
        guildId,
      });

      utils.roles.guildNotApproved.setData(
        { guildId },
        (prev) => prev?.filter((r) => r.id !== roleId),
      );

      return { prevGuildNotApproved };
    },
    onError: (_1, _2, prev) => {
      utils.roles.guildNotApproved.setData(
        { guildId },
        prev?.prevGuildNotApproved,
      );
    },
    onSettled: async () => {
      await utils.roles.guildNotApproved.invalidate({ guildId });
    },
  });

  return {
    rejectRole: () => {
      if (!('name' in role)) return;

      rejectRole({ roleId: role.id, guildId: role.guildId });
    },
    ...rest,
  };
};

const useAddRole = (role: Role | NotApprovedRole) => {
  const utils = api.useUtils();
  const { guildId } = role;

  const {
    mutate: addRole,
    isPending: isAdding,
    ...rest
  } = api.roles.addRole.useMutation({
    onMutate: async ({ roleId }) => {
      await utils.user.memberMe.cancel({ guildId });

      const prevMember = utils.user.memberMe.getData({ guildId });
      const newMember = prevMember && {
        ...prevMember,
        roles: [...prevMember.roles, roleId],
      };

      utils.user.memberMe.setData({ guildId }, newMember);

      return { prevMember };
    },
    onSettled: () => {
      utils.user.memberMe.invalidate({ guildId });
    },
    onError: async (err, { roleId }) => {
      if (err.data?.code === 'NOT_FOUND') {
        await utils.roles.guildCustom.cancel({ guildId });

        utils.roles.guildCustom.setData(
          { guildId },
          (prev) => prev?.filter((r) => r.id !== roleId),
        );

        utils.roles.guildCustom.invalidate({ guildId });
      }
    },
  });

  return {
    addRole: () => {
      if ('name' in role) return;

      addRole({ guildId, roleId: role.id });
    },
    isAdding,
    ...rest,
  };
};

const useRemoveRole = (role: Role | NotApprovedRole) => {
  const utils = api.useUtils();
  const { guildId } = role;

  const {
    mutate: removeRole,
    isPending: isRemoving,
    ...rest
  } = api.roles.removeRole.useMutation({
    onMutate: async ({ roleId }) => {
      await utils.user.memberMe.cancel({ guildId });

      const prevMember = utils.user.memberMe.getData({ guildId });
      const newMember = prevMember && {
        ...prevMember,
        roles: prevMember.roles.filter((id) => id !== roleId),
      };

      utils.user.memberMe.setData({ guildId }, newMember);

      return { prevMember };
    },
    onSettled: () => {
      utils.user.memberMe.invalidate({ guildId });
    },
    onError: async (err, { roleId }) => {
      if (err.data?.code === 'NOT_FOUND') {
        await utils.roles.guildCustom.cancel({ guildId });

        utils.roles.guildCustom.setData(
          { guildId },
          (prev) => prev?.filter((r) => r.id !== roleId),
        );

        utils.roles.guildCustom.invalidate({ guildId });
      }
    },
  });

  return {
    removeRole: () => {
      if ('name' in role) return;

      removeRole({ guildId, roleId: role.id });
    },
    isRemoving,
    ...rest,
  };
};

export const useRoleUtils = (role: Role | NotApprovedRole, guild: Guild) => {
  const { approveRole, isApproving } = useApproveRole(role);
  const { rejectRole } = useRejectRole(role);
  const { addRole, isAdding } = useAddRole(role);
  const { removeRole, isRemoving } = useRemoveRole(role);

  const [member] = api.user.memberMe.useSuspenseQuery({
    guildId: role.guildId,
  });

  const isPending = isApproving || isAdding || isRemoving;

  const isApproved = !('name' in role);

  const isAddable = isApproved
    ? !member.roles.some((id) => id === role.id)
    : true;

  const discordRole = isApproved
    ? guild?.discord.roles?.find((r) => r.id === role.id)
    : null;

  const name = 'name' in role ? role.name : discordRole?.name || '';
  const color = discordRole?.color
    ? `#${discordRole.color.toString(16).padStart(6, '0')}`
    : baseConfig.theme.colors.primary[500];

  const canRejectOrApprove = canCreateRoles(member, guild.discord);

  return {
    approveRole,
    rejectRole,
    addRole,
    removeRole,
    isPending,
    isApproved,
    isAddable,
    name,
    color,
    canRejectOrApprove,
  };
};

export const useCreateRole = (
  guildId: string,
  name: string | null,
  onSuccess?: () => void,
) => {
  const utils = api.useUtils();
  const [me] = api.user.me.useSuspenseQuery();

  const { mutate: createRole, ...rest } = api.roles.createRole.useMutation({
    onMutate: async () => {
      await utils.roles.guildCustom.cancel({ guildId });
      await utils.guild.get.cancel({ guildId });
    },
    onSuccess: async ({ dbRole, discordRole, notApprovedRole }) => {
      const promises = [];

      if (notApprovedRole) {
        utils.roles.guildNotApproved.setData({ guildId }, (prev) => [
          ...(prev || []),
          { ...notApprovedRole, createdByUserId: me?.id || '' },
        ]);

        promises.push(utils.roles.guildNotApproved.invalidate({ guildId }));
      }

      if (dbRole) {
        utils.roles.guildCustom.setData({ guildId }, (prev) => [
          ...(prev || []),
          { ...dbRole, createdByUserId: me?.id || '' },
        ]);

        promises.push(utils.roles.guildCustom.invalidate({ guildId }));
      }

      if (discordRole) {
        utils.guild.get.setData({ guildId }, (prev) => {
          if (!prev) return prev;

          const guild = { ...prev };
          guild.discord.roles = [...guild.discord.roles, discordRole];

          return guild;
        });

        promises.push(await utils.guild.get.invalidate({ guildId }));
      }

      await Promise.all(promises);
      onSuccess?.();
    },
  });

  return {
    createRole: () => {
      if (!name || rest.isPending) return;
      createRole({ guildId, name });
    },
    ...rest,
  };
};
