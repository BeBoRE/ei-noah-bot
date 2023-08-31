import { forwardRef } from 'react';
import type { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ChannelType } from '@ei/lobby';

import ChannelTypeButton from './ChannelTypeButton';
import Options from './Options';

type Props = {
  currentType: ChannelType;
  onTypeChange: (type: ChannelType) => void;
  delay?: number;
};

const TypeSelector = forwardRef<View, Props>(
  ({ currentType, onTypeChange, delay }: Props, ref) => (
    <Options
      ref={ref}
      delay={delay}
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
    />
  ),
);

export const AnimatedTypeSelector =
  Animated.createAnimatedComponent(TypeSelector);

export default TypeSelector;
