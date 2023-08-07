import { clientChangeLobby, lobbyChangeSchema, userIdToPusherChannel } from "@ei/lobby"
import { Pressable } from "react-native"
import Text from "./Text"
import { usePusher } from "src/context/pusher"
import { api } from "src/utils/api"

type Props = {
  limit : number
  lobby : NonNullable<Zod.infer<typeof lobbyChangeSchema>>["channel"]
}

const UserLimitButton = ({limit, lobby} : Props) => {
  const pusher = usePusher();
  const {data: user} = api.user.me.useQuery();

  const onPress = () => {
    if (!pusher) return;
    if (!user) return;

    const channel = pusher.channel(userIdToPusherChannel(user));

    channel.trigger('client-change-lobby', {limit} satisfies Zod.infer<typeof clientChangeLobby>);
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={lobby.limit === limit}
      className={`w-16 h-16 flex justify-center items-center rounded-full bg-primary-800 ${lobby.limit === limit ? 'border-2 border-primary' : ''}`}>
      <Text className="text-3xl font-bold">{limit === 0 ? '∞' : limit}</Text>
    </Pressable>
  )
}

export default UserLimitButton
