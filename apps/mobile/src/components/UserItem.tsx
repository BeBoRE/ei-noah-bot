import { type userSchema, userIdToPusherChannel } from "@ei/lobby";
import { View } from "react-native";
import Text from "./Text";
import { Image } from "expo-image";
import Animated, { FadeInUp, FadeOutDown, Layout } from "react-native-reanimated";
import { Pressable } from "react-native";
import { usePusher } from "src/context/pusher";
import { api } from "src/utils/api";

type ButtonProps = {
  onPress: () => void;
}

const AcceptButton = ({onPress} : ButtonProps) => {
  return (
    <Pressable onPress={onPress} className="w-16 h-16 rounded-full bg-accept"></Pressable>
  )
}

const RejectButton = ({onPress} : ButtonProps) => {
  return (
    <Pressable onPress={onPress} className="w-16 h-16 rounded-full bg-reject"></Pressable>
  )
}

const UserItem = ({ user }: { user: Zod.infer<typeof userSchema> }) => {
  const pusher = usePusher();
  const {data: me} = api.user.me.useQuery();

  const onReject = () => {
    if (!pusher || !me) return;

    pusher.channel(userIdToPusherChannel(me)).trigger('client-remove-user', { user: {id: user.id} })
  }

  const onAccept = () => {
    if (!pusher || !me) return;

    pusher.channel(userIdToPusherChannel(me)).trigger('client-add-user', { user: {id: user.id} })
  }

  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutDown} layout={Layout.duration(200).delay(100)} className="flex-row justify-between bg-primary-800 p-3 rounded-full mb-3">
      <View className="flex-row items-center">
        {user.avatar ? <Image source={user.avatar} alt="" className="w-16 h-16 rounded-full bg-primary-900 mr-3"></Image> : <View className="w-16 h-16 rounded-full bg-primary-900 mr-3"></View>}
        <Text className="text-2xl">{user.username}</Text>
      </View>
      {user.isKickable && user.isAllowed ? <RejectButton onPress={onReject} /> : <AcceptButton onPress={onAccept} />}
    </Animated.View>
  )
}

export default UserItem;
