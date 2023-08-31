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
import { AntDesign } from '@expo/vector-icons';
import { CDNRoutes, ImageFormat, RouteBases } from 'discord-api-types/rest/v10';
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import JoinLobby from 'src/components/JoinLobby';
import { AnimatedLobbyName } from 'src/components/LobbyName';
import Text, { AnimatedText } from 'src/components/Text';
import { AnimatedTypeSelector } from 'src/components/TypeSelector';
import { AnimatedUserLimitSelector } from 'src/components/UserLimits';
import UsersSheet from 'src/components/UsersSheet';
import { useAuth } from 'src/context/auth';
import { LobbyProvider, useLobby } from 'src/context/lobby';
import { PusherProvider, usePusher } from 'src/context/pusher';
import useNotifications from 'src/hooks/useNotifications';
import { baseConfig } from 'tailwind.config';

import { api } from '../utils/api';

function Screen() {
  useNotifications();

  const { lobby, changeChannelType, changeUserLimit } = useLobby();
  const { connectionState } = usePusher();

  if (connectionState === 'unavailable' || connectionState === 'failed') {
    return (
      <Animated.View
        key="unavailable"
        className="flex flex-1"
        entering={FadeInDown.duration(200)}
        exiting={FadeOutUp.duration(200)}
      >
        <SafeAreaView edges={['bottom']} className="flex flex-1">
          <View className="flex flex-1 items-center justify-center">
            <View className="m-5 flex items-center justify-center rounded bg-primary-900 p-6">
              <AntDesign
                name="disconnect"
                size={32}
                color={baseConfig.theme.colors.reject}
              />
              <Text className="mt-3 text-center text-2xl font-bold text-primary-300">
                Cannot connect to server, please check your internet connection
                or try again later.
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    );
  }

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
          <LobbyProvider>
            <Screen />
          </LobbyProvider>
        </PusherProvider>
        <StatusBar style="dark" />
      </SafeAreaView>
    </>
  );
}

export default Index;
