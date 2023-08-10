import {
  ChannelType, clientChangeLobby, lobbyChangeSchema, userIdToPusherChannel,
} from '@ei/lobby';
import { Pressable } from 'react-native';
import { Image } from 'expo-image';
import { usePusher } from 'src/context/pusher';
import { api } from 'src/utils/api';

type Props = {
  lobbyType : ChannelType
  lobby : NonNullable<Zod.infer<typeof lobbyChangeSchema>>['channel']
};

const className = 'w-10 h-10';

const images = {
  [ChannelType.Public]: () => <Image source={require('assets/speaker-high-volume.svg')} className={className} alt="" />,
  [ChannelType.Mute]: () => <Image source={require('assets/speak-no-evil-monkey.svg')} className={className} alt="" />,
  [ChannelType.Nojoin]: () => <Image source={require('assets/locked-with-key.svg')} className={className} alt="" />,
};

function ChannelTypeButton({ lobbyType, lobby } : Props) {
  const LobbyIcon = images[lobbyType];
  const pusher = usePusher();
  const { data: user } = api.user.me.useQuery();

  const onPress = () => {
    if (!pusher || !user) return;

    const channel = pusher.channel(userIdToPusherChannel(user));

    channel.trigger('client-change-lobby', { type: lobbyType } satisfies Zod.infer<typeof clientChangeLobby>);
  };

  return (
    <Pressable onPress={onPress} className={`w-16 h-16 flex justify-center items-center rounded-full bg-primary-800 ${lobby.type === lobbyType ? 'border-2 border-primary' : ''}`}><LobbyIcon /></Pressable>
  );
}

export default ChannelTypeButton;
