import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOutUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useAppState } from '@react-native-community/hooks';
import { alert } from 'burnt';
import JoinLobby from 'src/components/JoinLobby';
import { AnimatedLobbyName } from 'src/components/LobbyName';
import { AnimatedText } from 'src/components/Text';
import { AnimatedTypeSelector } from 'src/components/TypeSelector';
import { AnimatedUserLimitSelector } from 'src/components/UserLimits';
import UsersSheet from 'src/components/UsersSheet';
import { useAuth } from 'src/context/auth';
import useNotifications from 'src/hooks/useNotifications';

import { LobbyProvider, useLobby } from '@ei/react-shared/context/lobby';

function Screen() {
  useNotifications();

  const { lobby, changeChannelType, changeUserLimit, changeName } = useLobby();
  const { top, left, right } = useSafeAreaInsets();

  if (!lobby) {
    return <JoinLobby />;
  }

  const style = 'w-24 h-24 bg-primary-900 rounded-full';

  return (
    <View className="flex flex-1">
      <ScrollView
        style={{ paddingTop: top, paddingLeft: left, paddingRight: right }}
        className="flex-1"
      >
        <Animated.View
          key={lobby.channel.id}
          className="flex flex-1 flex-col px-2 py-4"
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
        </Animated.View>
      </ScrollView>
      <UsersSheet users={lobby.users} channelType={lobby.channel.type} />
    </View>
  );
}

function Index() {
  const { authInfo } = useAuth();
  const appState = useAppState();

  const enabled =
    !!authInfo && (appState === 'active' || appState === 'inactive');

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: '',
        }}
      />
      <LobbyProvider enabled={enabled} token={authInfo} alert={alert}>
        <Screen />
      </LobbyProvider>
    </>
  );
}

export default Index;
