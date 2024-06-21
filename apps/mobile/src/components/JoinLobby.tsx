import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOutDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import { cssInterop } from 'nativewind';
import { Text } from './ui/text';

cssInterop(Animated.View, { className: 'style' });
cssInterop(Animated.Text, { className: 'style' });

function JoinLobby() {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      exiting={FadeOutDown.duration(400)}
      className="flex-1 flex-col items-center justify-center"
    >
      <ScrollView
        className="flex-1 px-2"
        style={{
          paddingTop: insets.top,
          paddingRight: insets.right,
          paddingLeft: insets.right,
        }}
      >
        <Animated.Text
          entering={FadeIn.duration(1500)}
          className="my-6 text-center text-5xl font-bold text-primary-300
        "
        >
          Please join a lobby create channel on{' '}
          <Text className="text-discord">Discord</Text>
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.duration(1000).delay(1500)}
          className="mb-2 text-center text-xl font-semibold text-primary-300"
        >
          They should look something like this:
        </Animated.Text>
        <Animated.View entering={FadeInDown.duration(600).delay(2500)}>
          <View className="rounded-md bg-[#2b2d31]">
            <Animated.View
              entering={FadeInLeft.duration(300).delay(3100)}
              className="flex-row items-center p-3"
            >
              <Image
                source={require('assets/discord-speaker.svg')}
                className="mr-3 h-8 w-8 text-[#7d818b]"
                alt=""
              />
              <Text
                className="text-2xl text-[#949ba4]"
                style={{ fontFamily: 'gg-sans' }}
              >
                🔊 Create Public Lobby
              </Text>
            </Animated.View>
            <Animated.View
              entering={FadeInRight.duration(300).delay(3400)}
              className="flex-row items-center p-3"
            >
              <Image
                source={require('assets/discord-speaker.svg')}
                className="mr-3 h-8 w-8 text-[#7d818b]"
                alt=""
              />
              <Text
                className="text-2xl text-[#949ba4]"
                style={{ fontFamily: 'gg-sans' }}
              >
                🙊 Create Mute Lobby
              </Text>
            </Animated.View>
            <Animated.View
              entering={FadeInLeft.duration(300).delay(3700)}
              className="flex-row items-center p-3"
            >
              <Image
                source={require('assets/discord-speaker.svg')}
                className="mr-3 h-8 w-8 text-[#7d818b]"
                alt=""
              />
              <Text
                className="text-2xl text-[#949ba4]"
                style={{ fontFamily: 'gg-sans' }}
              >
                🔐 Create Private Lobby
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.Text
          entering={FadeIn.duration(600).delay(4600)}
          className="mt-5 text-center text-xl font-semibold text-primary-300"
        >
          Once you have a lobby, you can manage it from here :)
        </Animated.Text>
      </ScrollView>
    </Animated.View>
  );
}

export default JoinLobby;
