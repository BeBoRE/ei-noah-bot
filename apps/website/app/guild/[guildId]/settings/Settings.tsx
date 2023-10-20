'use client';

import React from 'react';

import { RouterOutputs } from '@ei/trpc';

import RoleChannelSelect from './RoleChannelSelect';
import RoleCreatorRoleSelect from './RoleCreatorRoleSelect';

type Props = {
  guildId: string;
  guildData: RouterOutputs['guild']['get'];
  channelData: RouterOutputs['channel']['all'];
  memberData: RouterOutputs['user']['memberMe'];
  customRolesData: RouterOutputs['roles']['guildCustom'];
};

function Settings({
  guildData,
  guildId,
  channelData,
  memberData,
  customRolesData,
}: Props) {
  return (
    <>
      <RoleChannelSelect
        channelData={channelData}
        guildData={guildData}
        guildId={guildId}
      />
      <RoleCreatorRoleSelect
        guildId={guildId}
        initialData={{
          member: memberData,
          guild: guildData,
          customRoles: customRolesData,
        }}
      />
    </>
  );
}

export default Settings;
