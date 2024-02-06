import rscApi from 'trpc/server';

import Settings from './Settings';

type Props = {
  params: {
    guildId: string;
  };
};

async function SettingsPage({ params: { guildId } }: Props) {
  const api = await rscApi();

  const [guild, channels] = await Promise.all([
    await api.guild.get({ guildId }),
    await api.channel.all({ guildId }),
  ]);

  return (
    <div className="flex-1 rounded-md bg-primary-100 p-4 dark:bg-background">
      <h1 className="pb-4 text-3xl">Settings</h1>
      <Settings guildId={guildId} guildData={guild} channelData={channels} />
    </div>
  );
}

export default SettingsPage;
