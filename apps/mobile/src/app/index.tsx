import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/rest/v10';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import ChannelTypeButton from 'src/components/ChannelTypeButton';
import JoinLobby from 'src/components/JoinLobby';
import Text from 'src/components/Text';
import UserLimitButton from 'src/components/UserLimitButton';
import UsersSheet from 'src/components/UsersSheet';
import { useAuth } from 'src/context/auth';
import { PusherProvider, usePusher } from 'src/context/pusher';
import useNotifications from 'src/hooks/useNotifications';
import { baseConfig } from 'tailwind.config';

import {
  ChannelType,
  generateLobbyName,
  lobbyChangeSchema,
  userIdToPusherChannel,
} from '@ei/lobby';

import { api } from '../utils/api';

function Screen() {
  const [lobby, setLobby] = useState<Zod.infer<
    typeof lobbyChangeSchema
  > | null>(null);
  const { data: user } = api.user.me.useQuery();
  const pusher = usePusher();

  useNotifications();

  useEffect(() => {
    if (!pusher) return undefined;

    pusher.user.bind('lobbyChange', (newData: unknown) => {
      const result = lobbyChangeSchema.safeParse(newData);
      if (!result.success) {
        Alert.alert(
          'Error',
          `Failed to parse lobby data\n${result.error.message}`,
        );
        return;
      }

      setLobby(result.data);
    });

    return () => {
      pusher.user.unbind('lobbyChange');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pusher?.sessionID]);

  useEffect(() => {
    if (!pusher || !user?.id) return undefined;
    const channelName = userIdToPusherChannel({ id: user.id });

    console.log('Subscribing to channel', channelName);
    pusher.subscribe(channelName).bind('pusher:subscription_succeeded', () => {
      pusher.channel(channelName).trigger('client-refresh', null);
    })

    return () => {
      console.log('Unsubscribing from channel', channelName);
      pusher.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pusher?.sessionID, user?.id]);

  if (!lobby) {
    return <JoinLobby />;
  }

  const { guild } = lobby;

  if (!guild) {
    return (
      <View className="flex-1 justify-center align-middle">
        <Text className="text-center text-3xl">Error contacting Discord</Text>
      </View>
    );
  }

  const style = 'w-40 h-40 bg-primary-900 rounded-full';

  const limits = new Set([0, 2, 5, 10, lobby.channel.limit || 0]);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      exiting={FadeOutDown.duration(400)}
      className="flex-1 p-5 pb-0"
    >
      <View className="items-center">
        {guild.icon ? (
          <Image
            source={guild.icon}
            className={[style, 'ring-4'].join(' ')}
            alt=""
          />
        ) : (
          <View className={`${style} bg-secondary`} />
        )}
        <Text className="mb-[-25px] p-3 text-center text-3xl font-bold">
          {generateLobbyName(
            lobby.channel.type,
            lobby.user,
            lobby.channel.name || undefined,
          )}
        </Text>
        <Text className="text-1xl p-3 text-center font-medium opacity-60">
          {guild.name}
        </Text>
      </View>
      <View className="mb-3 h-20 flex-row items-center justify-around rounded-full bg-primary-900 px-10">
        <ChannelTypeButton
          lobbyType={ChannelType.Public}
          lobby={lobby.channel}
        />
        <ChannelTypeButton lobbyType={ChannelType.Mute} lobby={lobby.channel} />
        <ChannelTypeButton
          lobbyType={ChannelType.Nojoin}
          lobby={lobby.channel}
        />
      </View>
      <View className="h-20 flex-row items-center justify-around rounded-full bg-primary-900 px-2">
        {Array.from(limits)
          .sort((a, b) => a - b)
          .map((limit) => (
            <UserLimitButton limit={limit} key={limit} lobby={lobby.channel} />
          ))}
      </View>
      <UsersSheet users={lobby.users} channelType={lobby.channel.type} />
    </Animated.View>
  );
}

const getUserImageUrl = (user: { avatar: string; id: string }) =>
  `${RouteBases.cdn}${CDNRoutes.userAvatar(
    user.id,
    user.avatar,
    ImageFormat.PNG,
  )}?size=${128}`;

function Index() {
  const { signOut } = useAuth();
  const { data: user } = api.user.me.useQuery();

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: '',
          // eslint-disable-next-line react/no-unstable-nested-components
          headerRight: () => (
            <HeaderButtons>
              <Item
                title="Logout"
                onPress={() => {
                  signOut();
                }}
                color={baseConfig.theme.colors.background}
              />
            </HeaderButtons>
          ),
          headerLeft:
            user &&
            // eslint-disable-next-line react/no-unstable-nested-components
            (() => (
              <View className="flex flex-row items-center">
                {user.avatar && (
                  <Image
                    source={getUserImageUrl({
                      id: user.id,
                      avatar: user.avatar,
                    })}
                    className="mr-2 h-10 w-10 rounded-full"
                    alt=""
                  />
                )}
                <Text className="text-2xl font-bold text-primary-950">
                  {user?.globalName}
                </Text>
              </View>
            )),
        }}
      />
      <SafeAreaView edges={['left', 'right']} className="flex-1 to-primary-950">
        <PusherProvider>
          <Screen />
        </PusherProvider>
      </SafeAreaView>
    </>
  );
}

export default Index;
