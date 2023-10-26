import rscApi from 'trpc/server';

import Settings from './Settings';

type Props = {
  params: {
    guildId: string;
  };
};

async function SettingsPage({ params: { guildId } }: Props) {
  const api = await rscApi();

  const [guild, channels, member, customRoles] = await Promise.all([
    await api.guild.get({ guildId }),
    await api.channel.all({ guildId }),
    await api.user.memberMe({ guildId }),
    await api.roles.guildCustom({ guildId }),
  ]);

  return (
    <div className="flex-1 rounded-md p-4 bg-primary-100 dark:bg-background">
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
