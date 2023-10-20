import * as context from 'next/headers';
import rscApi from 'utils/rsc';

import Settings from './Settings';

type Props = {
  params: {
    guildId: string;
  };
};

async function SettingsPage({ params: { guildId } }: Props) {
  const api = await rscApi(context);

  const [guild, channels, member, customRoles] = await Promise.all([
    await api.guild.get({ guildId }),
    await api.channel.all({ guildId }),
    await api.user.memberMe({ guildId }),
    await api.roles.guildCustom({ guildId }),
  ]);

  return (
    <div className="flex-1 rounded-md bg-primary-100 p-4 dark:bg-primary-900">
      <h1 className="pb-4 text-3xl">Settings</h1>
      <Settings
        guildId={guildId}
        guildData={guild}
        channelData={channels}
        memberData={member}
        customRolesData={customRoles}
      />
    </div>
  );
}

export default SettingsPage;
