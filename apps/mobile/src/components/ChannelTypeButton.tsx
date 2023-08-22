import { Image } from 'expo-image';

import { ChannelType } from '@ei/lobby';

type Props = {
  type: ChannelType;
};

const className = 'w-10 h-10';

const images = {
  [ChannelType.Public]: () => (
    <Image
      source={require('assets/speaker-high-volume.svg')}
      className={className}
      alt=""
    />
  ),
  [ChannelType.Mute]: () => (
    <Image
      source={require('assets/speak-no-evil-monkey.svg')}
      className={className}
      alt=""
    />
  ),
  [ChannelType.Nojoin]: () => (
    <Image
      source={require('assets/locked-with-key.svg')}
      className={className}
      alt=""
    />
  ),
};

function ChannelTypeButton({ type }: Props) {
  const LobbyIcon = images[type];

  return <LobbyIcon />;
}

export default ChannelTypeButton;
