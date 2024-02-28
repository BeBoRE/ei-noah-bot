import rscApi from 'trpc/server';

import Settings from './Settings';

type Props = {
  params: {
    guildId: string;
  };
};

async function SettingsPage({ params: { guildId } }: Props) {
  const [guild, channels] = await Promise.all([
    await rscApi.guild.get({ guildId }),
    await rscApi.channel.all({ guildId }),
  ]);

  return (
    <div className="flex-1 rounded-md bg-primary-100 p-4 dark:bg-background">
      <h1 className="pb-4 text-3xl">Settings</h1>
      <Settings guildId={guildId} guildData={guild} channelData={channels} />
    </div>
  );
}

export default SettingsPage;
