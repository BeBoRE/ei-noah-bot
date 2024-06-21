import { View } from 'react-native';
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { Link, Stack } from 'expo-router';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { Button } from 'src/components/ui/button';
import { Text } from 'src/components/ui/text';
import { getGuildImageUrl } from 'src/utils/cdn';

import { api } from '@ei/react-shared';
import baseConfig from '@ei/tailwind-config';
import type { RouterOutputs } from '@ei/trpc';

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
      href={{
        pathname: `/guild/[guildId]/roles`,
        params: { guildId: guild.id },
      }}
      push
      asChild
    >
      <Button
        size="lg"
        className="mb-2 flex flex-1 flex-row justify-start gap-2 rounded bg-primary-900"
      >
        <GuildIcon guild={guild} />
        <Text className="text-2xl">{guild.name}</Text>
      </Button>
    </Link>
  );
}

function Spacer({ height = 0, width = 8 }) {
  return <MotiView style={{ height, width }} />;
}

const colors = [
  baseConfig.theme.colors.primary['800'],
  baseConfig.theme.colors.primary['900'],
];

function GuildButtonSkeleton() {
  return (
    <MotiView className="mb-2 flex flex-1 flex-row rounded bg-primary-900 p-2">
      <Skeleton width={48} height={48} radius="round" colors={colors} />
      <Spacer />
      <Skeleton width="90%" colors={colors} />
    </MotiView>
  );
}

function Page() {
  const { data: guilds, isLoading, isError } = api.guild.all.useQuery();

  if (isLoading) {
    return (
      <ScrollView className="p-2">
        <GuildButtonSkeleton />
        <GuildButtonSkeleton />
        <GuildButtonSkeleton />
      </ScrollView>
    );
  }

  if (isError || !guilds) {
    return (
      <ScrollView className="p-2">
        <Text>Error</Text>
      </ScrollView>
    );
  }

  return (
    <FlatList
      className="p-2"
      data={guilds}
      renderItem={({ item }) => <GuildButton guild={item} />}
    />
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
