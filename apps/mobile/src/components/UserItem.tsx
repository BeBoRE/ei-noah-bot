import type { userSchema } from "@ei/lobby";
import { View } from "react-native";
import Text from "./Text";
import { Image } from "expo-image";
import Animated, { FadeInUp, FadeOutDown, Layout } from "react-native-reanimated";

const UserItem = ({ user }: { user: Zod.infer<typeof userSchema> }) => {
  return (
    
    <Animated.View entering={FadeInUp} exiting={FadeOutDown} layout={Layout.duration(200).delay(100)} className="flex-row justify-between bg-primary-800 p-3 rounded-full mb-3">
      <View className="flex-row items-center">
        {user.avatar ? <Image source={user.avatar} alt="" className="w-16 h-16 rounded-full bg-primary-900 mr-3"></Image> : <View className="w-16 h-16 rounded-full bg-primary-900 mr-3"></View>}
        <Text className="text-2xl">{user.username}</Text>
      </View>
      {user.isKickable && <View className={`w-16 h-16 rounded-full justify-self-end ${user.isAllowed ? 'bg-reject' : 'bg-accept'}`}></View>}
    </Animated.View>
  )
}

export default UserItem;
