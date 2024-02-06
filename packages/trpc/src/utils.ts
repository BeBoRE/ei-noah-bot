import { camelCase, isArray, isObject, transform } from 'lodash';

import { Role } from '@ei/drizzle/tables/schema';

import { ApiGuild, ApiRole, DiscordMember } from './schemas';

/* eslint-disable import/prefer-default-export */
export const camelize = (obj: unknown) => {
  if (!isObject(obj)) return obj;

  return transform(
    obj,
    (result: Record<string, unknown>, value: unknown, key: string, target) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      // eslint-disable-next-line no-param-reassign
      result[camelKey] = isObject(value)
        ? camelize(value as Record<string, unknown>)
        : value;
    },
  );
};

export const highestRole = (roles: ApiRole[], member: DiscordMember) => {
  const role = roles.reduce((prev, curr) => {
    if (curr.position > prev.position && member.roles.includes(curr.id)) {
      return curr;
    }

    return prev;
  });

  return role;
};

export const userIsAdmin = (member: DiscordMember, guild: ApiGuild) => {
  if (guild.ownerId === member.user.id) return true;

  const adminRoles = guild.roles.filter(
    // eslint-disable-next-line no-bitwise
    (role) => BigInt(role.permissions) & BigInt(8),
  );

  return member.roles.some((role) =>
    adminRoles.some((adminRole) => adminRole.id === role),
  );
};

export const canCreateRoles = (member: DiscordMember, guild: ApiGuild) => {
  const isAdmin = userIsAdmin(member, guild);

  return isAdmin;
};

export const generateRoleMenuContent = (roles: Role[]) => {
  const roleText =
    roles.length > 0
      ? roles.map((r) => `<@&${r.id}>`).join('\n')
      : '*No roles found*';

  return `**Roles Available:**\n${roleText}`;
};
