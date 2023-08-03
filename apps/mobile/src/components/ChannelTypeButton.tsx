import { ChannelType, lobbyChangeSchema } from "@ei/lobby"
import { Pressable } from "react-native"
import { Image } from "expo-image"

type Props = {
  lobbyType : ChannelType
  lobby : NonNullable<Zod.infer<typeof lobbyChangeSchema>>["channel"]
}

const className = 'w-10 h-10'

const images = {
  [ChannelType.Public]: () => <Image source={require('assets/speaker-high-volume.svg')} className={className} alt=""/>,
  [ChannelType.Mute]: () => <Image source={require('assets/speak-no-evil-monkey.svg')} className={className} alt=""/>,
  [ChannelType.Nojoin]: () => <Image source={require('assets/locked-with-key.svg')} className={className} alt=""/>,
}

const ChannelTypeButton = ({lobbyType, lobby} : Props) => {
  const LobbyIcon = images[lobbyType];

  return (
    <Pressable className={`w-16 h-16 flex justify-center items-center rounded-full bg-secondary ${lobby.type === lobbyType ? 'border-2 border-primary' : ''}`}><LobbyIcon/></Pressable>
  )
}

export default ChannelTypeButton
