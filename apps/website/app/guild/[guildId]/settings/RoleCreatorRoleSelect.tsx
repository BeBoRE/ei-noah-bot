'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'app/_components/ui/select';
import { RouterOutputs, api } from 'utils/api';

import { highestRole } from '@ei/trpc/src/utils';

type Props = {
  guildId: string;
  initialData: {
    member: RouterOutputs['user']['memberMe'];
    guild: RouterOutputs['guild']['get'];
    customRoles: RouterOutputs['roles']['guildCustom'];
  }
};

function RoleCreatorRoleSelect({ guildId, initialData }: Props) {
  const { data: member } = api.user.memberMe.useQuery({ guildId }, {
    initialData: initialData.member,
  });
  const { data: guild } = api.guild.get.useQuery({ guildId }, {
    initialData: initialData.guild,
  });
  const { data: customRoles } = api.roles.guildCustom.useQuery({ guildId }, {
    initialData: initialData.customRoles,
  });

  const roles = guild?.discord?.roles;

  const context = api.useContext();

  const { mutate: setRoleCreatorRole, isLoading } =
    api.guild.setRoleCreatorRole.useMutation({
      onMutate: async ({ roleId }) => {
        await context.guild.get.cancel({ guildId });

        const prevGuild = context.guild.get.getData({ guildId });
        const newGuild = prevGuild && {
          ...prevGuild,
          db: {
            ...prevGuild.db,
            roleCreatorRoleId: roleId,
          },
        };

        context.guild.get.setData({ guildId }, newGuild);

        return { prevGuild };
      },
      onError(_1, _2, prev) {
        context.guild.get.setData({ guildId }, prev && prev.prevGuild);
      },
      onSettled: () => {
        context.guild.get.invalidate({ guildId });
      },
    });

  const highest = roles && member ? highestRole(roles, member) : null;
  const isOwner = !!(
    guild?.discord &&
    member &&
    guild.discord.ownerId === member.user.id
  );

  const rolesToDisplay = roles?.filter(
    (r) => r.id !== guildId && !customRoles?.some((cr) => cr.id === r.id),
  );

  return (
    <div>
      <h3 className="pl-3">Role creation role</h3>
      <Select
        disabled={isLoading}
        value={guild?.db?.roleCreatorRoleId || ''}
        onValueChange={(id) => {
          setRoleCreatorRole({ guildId, roleId: id });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {rolesToDisplay
              ?.sort((a, b) => a.position + b.position)
              ?.map((role) => {
                const color =
                  role.color !== 0
                    ? role.color.toString(16).padStart(6, '0')
                    : null;

                const canSelect =
                  isOwner ||
                  (highest !== null ? role.position < highest.position : true);

                return (
                  <SelectItem
                    style={{
                      color: color ? `#${color}` : undefined,
                    }}
                    value={role.id}
                    key={role.id}
                    disabled={!canSelect}
                  >
                    {role.name}
                  </SelectItem>
                );
              })}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export default RoleCreatorRoleSelect;
