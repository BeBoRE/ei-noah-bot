import { camelCase, isArray, isObject, transform } from 'lodash';

import type { ApiGuild } from './routes/guilds';
import type { ApiRole } from './routes/roles';
import type { DiscordMember } from './routes/users';

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

export const userIsAdmin = (
  roles: ApiRole[],
  member: DiscordMember,
  guild: ApiGuild,
) => {
  if (guild.ownerId === member.user.id) return true;

  // eslint-disable-next-line no-bitwise
  const adminRoles = roles.filter(
    (role) => BigInt(role.permissions) & BigInt(8),
  );

  return member.roles.some((role) =>
    adminRoles.some((adminRole) => adminRole.id === role),
  );
};
