import { ChannelType } from '@ei/lobby';

import ChannelTypeButton from './ChannelTypeButton';
import Options from './Options';

type Props = {
  currentType: ChannelType;
  onTypeChange: (type: ChannelType) => void;
};

function TypeSelector({ currentType, onTypeChange }: Props) {
  return (
    <Options className="mb-3">
      <Options.Item
        onPress={() => onTypeChange(ChannelType.Public)}
        active={currentType === ChannelType.Public}
      >
        <ChannelTypeButton type={ChannelType.Public} />
      </Options.Item>
      <Options.Item
        onPress={() => onTypeChange(ChannelType.Mute)}
        active={currentType === ChannelType.Mute}
      >
        <ChannelTypeButton type={ChannelType.Mute} />
      </Options.Item>
      <Options.Item
        onPress={() => onTypeChange(ChannelType.Nojoin)}
        active={currentType === ChannelType.Nojoin}
      >
        <ChannelTypeButton type={ChannelType.Nojoin} />
      </Options.Item>
    </Options>
  );
}

export default TypeSelector;
