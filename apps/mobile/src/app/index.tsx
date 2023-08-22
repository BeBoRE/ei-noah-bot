import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useNetInfo } from '@react-native-community/netinfo';
import { toast } from 'burnt';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/rest/v10';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import type { SFSymbol } from 'sf-symbols-typescript';
import JoinLobby from 'src/components/JoinLobby';
import LobbyName from 'src/components/LobbyName';
import Text from 'src/components/Text';
import TypeSelector from 'src/components/TypeSelector';
import UserLimitSelector from 'src/components/UserLimits';
import UsersSheet from 'src/components/UsersSheet';
import { useAuth } from 'src/context/auth';
import { PusherProvider, usePusher } from 'src/context/pusher';
import useNotifications from 'src/hooks/useNotifications';
import { baseConfig } from 'tailwind.config';

import {
  ChannelType,
  clientChangeLobby,
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
  const [firstConnection, setFirstConnection] = useState(true);

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

  const { isInternetReachable } = useNetInfo();

  useEffect(() => {
    if (!pusher || !user?.id) return undefined;
    const channelName = userIdToPusherChannel({ id: user.id });

    if (isInternetReachable) {
      console.log('Connecting to channel', channelName);
      pusher
        .subscribe(channelName)
        .bind('pusher:subscription_succeeded', () => {
          pusher.send_event('client-refresh', {}, channelName);

          if (firstConnection) {
            setFirstConnection(false);
            return;
          }

          toast({
            duration: 1,
            title: 'Reconnected',
            preset: 'custom',
            icon: {
              ios: {
                name: 'wifi' satisfies SFSymbol,
                color: baseConfig.theme.colors.accept,
              },
            },
          });
        });
    } else if (isInternetReachable === false) {
      console.log(
        'Not connecting to channel',
        channelName,
        'because the internet is not reachable',
      );

      toast({
        title: 'Lost connection',
        message: 'Please connect to the internet',
        preset: 'custom',
        icon: {
          ios: {
            name: 'wifi.slash' satisfies SFSymbol,
            color: baseConfig.theme.colors.reject,
          },
        },
      });
    }

    return () => {
      console.log('Unsubscribing from channel', channelName);
      pusher.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pusher?.sessionID, user?.id, isInternetReachable]);

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

  const changedChannelType = (type: ChannelType) => {
    if (!pusher || !user) return;

    const channel = pusher.channel(userIdToPusherChannel(user));

    channel.trigger('client-change-lobby', {
      type,
    } satisfies Zod.infer<typeof clientChangeLobby>);
  };

  const changeLimit = (limit: number) => {
    if (!pusher) return;
    if (!user) return;

    const channel = pusher.channel(userIdToPusherChannel(user));

    channel.trigger('client-change-lobby', { limit } satisfies Zod.infer<
      typeof clientChangeLobby
    >);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(200)}
      exiting={FadeOutDown.duration(400)}
      className="flex-1 p-5 pb-0"
    >
      <View className="mb-2 items-center">
        {guild.icon ? (
          <Image
            source={guild.icon}
            className={[style, 'ring-4'].join(' ')}
            alt=""
          />
        ) : (
          <View className={`${style} bg-secondary`} />
        )}
      </View>
      <Text className="mb-2 text-center text-2xl font-medium">
        {lobby.guild.name}
      </Text>
      <LobbyName lobby={lobby} />
      <TypeSelector
        currentType={lobby.channel.type}
        onTypeChange={changedChannelType}
      />
      <UserLimitSelector
        currentLimit={lobby.channel.limit}
        onLimitChange={changeLimit}
      />
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
        <StatusBar style="dark" />
      </SafeAreaView>
    </>
  );
}

export default Index;
