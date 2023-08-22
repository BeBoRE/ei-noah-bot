import { ChannelType } from '@ei/lobby';

import ChannelTypeButton from './ChannelTypeButton';
import Options from './Options';

type Props = {
  currentType: ChannelType;
  onTypeChange: (type: ChannelType) => void;
};

function TypeSelector({ currentType, onTypeChange }: Props) {
  return (
    <Options
      items={[
        {
          onPress: () => onTypeChange(ChannelType.Public),
          children: <ChannelTypeButton type={ChannelType.Public} />,
          active: currentType === ChannelType.Public,
          id: ChannelType.Public,
        },
        {
          onPress: () => onTypeChange(ChannelType.Mute),
          children: <ChannelTypeButton type={ChannelType.Mute} />,
          active: currentType === ChannelType.Mute,
          id: ChannelType.Mute,
        },
        {
          onPress: () => onTypeChange(ChannelType.Nojoin),
          children: <ChannelTypeButton type={ChannelType.Nojoin} />,
          active: currentType === ChannelType.Nojoin,
          id: ChannelType.Nojoin,
        },
      ]}
      className="mb-3"
    />
  );
}

export default TypeSelector;
