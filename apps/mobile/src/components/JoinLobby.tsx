import { View } from "react-native";
import Text from "./Text";
import { Image } from "expo-image"
import Animated, { FadeIn, FadeInDown, FadeInLeft, FadeInRight, FadeOutDown } from "react-native-reanimated";
import { ScrollView } from "react-native-gesture-handler";

const JoinLobby = () => {
  return (
    <Animated.View exiting={FadeOutDown.duration(400)} className="flex-1 flex-col justify-center items-center">
      <ScrollView className="flex-1 py-5 px-2">
        <Animated.Text entering={FadeIn.duration(1500)} className="text-center text-primary-300 font-bold text-5xl my-6
        ">Please join a lobby create channel on <Text className="text-discord">Discord</Text></Animated.Text>
        <Animated.Text entering={FadeIn.duration(1000).delay(1500)} className="text-center text-primary-300 font-semibold text-xl mb-2">
          They should look something like this:
        </Animated.Text>
        <Animated.View entering={FadeInDown.duration(600).delay(2500)}>
          <View className="rounded-md bg-[#2b2d31]">
            <Animated.View entering={FadeInLeft.duration(300).delay(3100)} className="flex-row items-center p-3">
              <Image source={require('assets/discord-speaker.svg')} className="w-8 h-8 text-[#7d818b] mr-3" alt=""/>
              <Text className="text-2xl text-[#949ba4]" style={{fontFamily: "gg-sans"}}>🔊 Create Public Lobby</Text>
            </Animated.View>
            <Animated.View entering={FadeInRight.duration(300).delay(3400)} className="flex-row items-center p-3">
              <Image source={require('assets/discord-speaker.svg')} className="w-8 h-8 text-[#7d818b] mr-3" alt=""/>
              <Text className="text-2xl text-[#949ba4]" style={{fontFamily: "gg-sans"}}>🙊 Create Mute Lobby</Text>
            </Animated.View>
            <Animated.View entering={FadeInLeft.duration(300).delay(3700)} className="flex-row items-center p-3">
              <Image source={require('assets/discord-speaker.svg')} className="w-8 h-8 text-[#7d818b] mr-3" alt=""/>
              <Text className="text-2xl text-[#949ba4]" style={{fontFamily: "gg-sans"}}>🔐 Create Private Lobby</Text>
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.Text entering={FadeIn.duration(600).delay(4600)} className="text-center text-primary-300 font-semibold text-xl mt-2">
          Once you have a lobby, you can manage it from here :)
        </Animated.Text>
      </ScrollView>
    </Animated.View>
  )
}

export default JoinLobby;
