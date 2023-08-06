import { type userSchema, userIdToPusherChannel, ChannelType } from "@ei/lobby";
import { View } from "react-native";
import Text from "./Text";
import { Image } from "expo-image";
import Animated, { FadeInUp, FadeOutDown, Layout } from "react-native-reanimated";
import { Pressable } from "react-native";
import { usePusher } from "src/context/pusher";
import { api } from "src/utils/api";
import { MaterialCommunityIcons } from '@expo/vector-icons'
import baseConfig from "@ei/tailwind-config";

type ButtonProps = {
  onPress: () => void;
}

const AcceptButton = ({onPress} : ButtonProps) => {
  return (
    <Pressable onPress={onPress} className="w-16 h-16 justify-center items-center rounded-full bg-accept">
      <MaterialCommunityIcons name="check" size={48} color={baseConfig.theme.colors.text} />
    </Pressable>
  )
}

const RejectButton = ({onPress} : ButtonProps) => {
  return (
    <Pressable onPress={onPress} style={{transform: [{ scaleX: -1 }, {rotate: '30deg'}]}} className="w-16 h-16 justify-center items-center rounded-full bg-reject">
      <MaterialCommunityIcons  name="shoe-cleat" size={42} color={baseConfig.theme.colors.text} />
    </Pressable>
  )
}

const UserItem = ({ user, channelType }: { user: Zod.infer<typeof userSchema>, channelType : ChannelType }) => {
  const pusher = usePusher();
  const {data: me} = api.user.me.useQuery();

  const showButtons = channelType !== ChannelType.Public;

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

      {showButtons && (user.isAllowed ? <RejectButton onPress={onReject} /> : <AcceptButton onPress={onAccept} />)}
    </Animated.View>
  )
}

export default UserItem;
