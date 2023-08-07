import { View } from "react-native";
import Text from "./Text";
import { Image } from "expo-image"

const JoinLobby = () => {
  return (
    <View className="flex-1 justify-center">
      <Text className="text-center text-primary-300 font-bold text-5xl m-3 mb-8
      ">Please join a lobby</Text>
      <View className="px-5">
        <View className="rounded-md bg-[#2b2d31]">
          <View className="flex-row items-center p-3">
            <Image source={require('assets/discord-speaker.svg')} className="w-8 h-8 text-[#7d818b] mr-3" alt=""/>
            <Text className="text-2xl text-[#949ba4]" style={{fontFamily: "gg-sans"}}>🔊 Create Public Lobby</Text>
          </View>
          <View className="flex-row items-center p-3">
            <Image source={require('assets/discord-speaker.svg')} className="w-8 h-8 text-[#7d818b] mr-3" alt=""/>
            <Text className="text-2xl text-[#949ba4]" style={{fontFamily: "gg-sans"}}>🙊 Create Mute Lobby</Text>
          </View>
          <View className="flex-row items-center p-3">
            <Image source={require('assets/discord-speaker.svg')} className="w-8 h-8 text-[#7d818b] mr-3" alt=""/>
            <Text className="text-2xl text-[#949ba4]" style={{fontFamily: "gg-sans"}}>🔐 Create Private Lobby</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default JoinLobby;
