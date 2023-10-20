'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'app/_components/ui/select';
import { api } from 'utils/api';

import { highestRole } from '@ei/trpc/src/utils';

type Props = {
  guildId: string;
};

function RoleCreatorRoleSelect({ guildId }: Props) {
  const { data: roles } = api.roles.guildAll.useQuery({ guildId });
  const { data: member } = api.user.memberMe.useQuery({ guildId });
  const { data: guild } = api.guild.get.useQuery({ guildId });
  const { data: customRoles } = api.roles.guildCustom.useQuery({ guildId });

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
      <Select>
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
