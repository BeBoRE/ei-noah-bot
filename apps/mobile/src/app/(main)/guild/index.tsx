import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Link, Stack } from 'expo-router';
import Button from 'src/components/Button';
import Text from 'src/components/Text';
import { getGuildImageUrl } from 'src/utils/cdn';
import { Skeleton } from 'moti/skeleton';

import { api } from '@ei/react-shared';
import type { RouterOutputs } from '@ei/trpc';
import { MotiView } from 'moti';
import baseConfig from '@ei/tailwind-config';

type GuildButtonProps = {
  guild: RouterOutputs['guild']['all'][number];
};

function GuildIcon({ guild }: GuildButtonProps) {
  const icon = getGuildImageUrl(guild);

  if (!icon) {
    return <View className="h-12 w-12 rounded-full bg-primary-800" />;
  }

  return <Image source={{ uri: icon }} className="h-12 w-12 rounded-full" />;
}

function GuildButton({ guild }: GuildButtonProps) {
  return (
    <Link
      href={{ pathname: `/guild/[guildId]/roles`, params: { guildId: guild.id } }}
      push
      asChild
    >
      <Button className="flex flex-1 flex-row items-center rounded bg-primary-900 p-2">
        <GuildIcon guild={guild} />
        <Text className="pl-2 text-2xl">{guild.name}</Text>
      </Button>
    </Link>
  );
}

function Spacer({ height = 0, width = 8 }) {
  return <MotiView style={{ height, width }} />
}

const colors = [
  baseConfig.theme.colors.primary['800'],
  baseConfig.theme.colors.primary['900'],
];

function GuildButtonSkeleton() {
  return (
    <MotiView className="flex flex-1 flex-row items-center rounded bg-primary-900 p-2 mb-2">
      <Skeleton width={48} height={48} radius="round" colors={colors}/>
      <Spacer />
      <Skeleton width="90%" colors={colors}/>
    </MotiView>
  );
}

function Page() {
  const { data: guilds, isLoading, isError } = api.guild.all.useQuery();

  if (isLoading) {
    return (
      <ScrollView className='p-2'>
        <GuildButtonSkeleton />
        <GuildButtonSkeleton />
        <GuildButtonSkeleton />
      </ScrollView>
    );
  }

  if (isError || !guilds) {
    return (
      <ScrollView className='p-2'>
        <Text>Error</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="p-2">
      {guilds.map((guild) => (
        <GuildButton key={guild.id} guild={guild} />
      ))}
    </ScrollView>
  );
}

function Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Select a server' }} />
      <Page />
    </>
  );
}

export default Screen;