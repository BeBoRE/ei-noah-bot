import { clientChangeLobby, lobbyChangeSchema, voiceIdToPusherChannel } from "@ei/lobby"
import { Pressable } from "react-native"
import Text from "./Text"
import { usePusher } from "src/context/pusher"

type Props = {
  limit : number
  lobby : NonNullable<Zod.infer<typeof lobbyChangeSchema>>["channel"]
}

const UserLimitButton = ({limit, lobby} : Props) => {
  const pusher = usePusher();

  const onPress = () => {
    if(!pusher) return;

    const channel = pusher.channel(voiceIdToPusherChannel(lobby))

    channel.trigger('client-change-lobby', {limit} satisfies Zod.infer<typeof clientChangeLobby>)
  }

  return (
    <Pressable onPress={onPress} disabled={lobby.limit === limit} className={`w-16 h-16 flex justify-center items-center rounded-full bg-secondary ${lobby.limit === limit ? 'border-2 border-primary' : ''}`}><Text className="text-3xl font-bold">{limit === 0 ? '∞' : limit}</Text></Pressable>
  )
}

export default UserLimitButton
