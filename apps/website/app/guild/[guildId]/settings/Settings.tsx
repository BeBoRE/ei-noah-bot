'use client';

import React from 'react';

import { RouterOutputs } from '@ei/trpc';

import RoleChannelSelect from './RoleChannelSelect';

type Props = {
  guildId: string;
  guildData: RouterOutputs['guild']['get'];
  channelData: RouterOutputs['channel']['all'];
};

function Settings({ guildData, guildId, channelData }: Props) {
  return (
    <RoleChannelSelect
      channelData={channelData}
      guildData={guildData}
      guildId={guildId}
    />
  );
}

export default Settings;
