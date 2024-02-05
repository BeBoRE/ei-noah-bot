import { View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOutUp,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppState } from '@react-native-community/hooks';
import { alert, toast } from 'burnt';
import {
  defaultOnOverflowMenuPress,
  HeaderButtons,
  HiddenItem,
  OverflowMenu,
} from 'react-navigation-header-buttons';
import type { SFSymbol } from 'sf-symbols-typescript';
import JoinLobby from 'src/components/JoinLobby';
import { AnimatedLobbyName } from 'src/components/LobbyName';
import Text, { AnimatedText } from 'src/components/Text';
import { AnimatedTypeSelector } from 'src/components/TypeSelector';
import { AnimatedUserLimitSelector } from 'src/components/UserLimits';
import UsersSheet from 'src/components/UsersSheet';
import { useAuth } from 'src/context/auth';
import useNotifications from 'src/hooks/useNotifications';
import { baseConfig } from 'tailwind.config';

import { LobbyProvider, useLobby } from '@ei/react-shared/context/lobby';

import { api, RouterOutputs } from '../utils/api';

function Screen() {
  useNotifications();

  const { lobby, changeChannelType, changeUserLimit, changeName } = useLobby();

  if (!lobby) {
    return <JoinLobby />;
  }

  const style = 'w-24 h-24 bg-primary-900 rounded-full';

  return (
    <Animated.View
      key={lobby.channel.id}
      className="flex flex-1 flex-col p-5"
      exiting={FadeOutUp.duration(200)}
      style={{
        gap: 10,
      }}
    >
      <Animated.View
        className="flex flex-row items-center justify-center gap-4"
        entering={FadeInDown.duration(200).delay(200)}
      >
        <Animated.View entering={FadeInLeft.duration(200).delay(200)}>
          {lobby.guild.icon ? (
            <Image
              source={lobby.guild.icon}
              className={[style, 'ring-4'].join(' ')}
              alt=""
            />
          ) : (
            <View className={`${style} bg-secondary`} />
          )}
        </Animated.View>
        <AnimatedText
          entering={FadeInRight.duration(200).delay(200)}
          className="text-4xl font-bold"
        >
          {lobby.guild.name}
        </AnimatedText>
      </Animated.View>
      <AnimatedLobbyName
        onNameChange={changeName}
        lobby={lobby}
        entering={FadeInDown.duration(200).delay(400)}
      />
      <AnimatedTypeSelector
        delay={600}
        currentType={lobby.channel.type}
        onTypeChange={changeChannelType}
        entering={FadeInDown.duration(200).delay(600)}
      />
      <AnimatedUserLimitSelector
        delay={800}
        currentLimit={lobby.channel.limit}
        onLimitChange={changeUserLimit}
        entering={FadeInDown.duration(200).delay(800)}
      />
      <UsersSheet users={lobby.users} channelType={lobby.channel.type} />
    </Animated.View>
  );
}

const discordCDN = 'https://cdn.discordapp.com/';
const userAvatar = (id: string, avatar: string, format: string) =>
  `avatars/${id}/${avatar}.${format}`;

const getUserImageUrl = (user: { avatar: string; id: string }) =>
  `${discordCDN}${userAvatar(user.id, user.avatar, 'png')}?size=${128}`;

function OverflowButton({
  user,
}: {
  user?: RouterOutputs['user']['me'] | null;
}) {
  return user ? (
    <View className="flex flex-row items-center">
      {user.avatar && (
        <Image
          source={getUserImageUrl({
            id: user.id,
            avatar: user.avatar,
          })}
          className="ml-2 h-10 w-10 rounded-full"
          alt=""
        />
      )}
    </View>
  ) : (
    <Text>Logout</Text>
  );
}

function Index() {
  const { signOut } = useAuth();
  const { data: user } = api.user.me.useQuery();
  const context = api.useContext();

  const logout = api.user.logout.useMutation({
    onSuccess: () => {
      signOut();

      context.invalidate(undefined);
    },
    onError: (err) => {
      toast({
        title: 'Failed to log out',
        message: err.message,
        preset: 'custom',
        icon: {
          ios: {
            name: 'exclamationmark.triangle' satisfies SFSymbol,
            color: baseConfig.theme.colors.primary.DEFAULT,
          },
        },
        haptic: 'error',
      });
    },
  });

  const { authInfo } = useAuth();
  const appState = useAppState();

  const enabled =
    !!authInfo && (appState === 'active' || appState === 'inactive');

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: '',
          // eslint-disable-next-line react/no-unstable-nested-components
          headerRight: () => (
            <HeaderButtons>
              <OverflowMenu
                disabled={logout.isLoading}
                color={baseConfig.theme.colors.background}
                onPress={defaultOnOverflowMenuPress}
                OverflowIcon={<OverflowButton user={user} />}
              >
                <HiddenItem
                  title="Logout"
                  destructive
                  onPress={() => {
                    if (!logout.isLoading) {
                      logout.mutate();
                    }
                  }}
                />
              </OverflowMenu>
            </HeaderButtons>
          ),
        }}
      />
      <SafeAreaView edges={['left', 'right']} className="flex-1 to-primary-950">
        <LobbyProvider
          api={api}
          enabled={enabled}
          token={authInfo}
          alert={alert}
        >
          <Screen />
        </LobbyProvider>
        <StatusBar style="dark" />
      </SafeAreaView>
    </>
  );
}

export default Index;
