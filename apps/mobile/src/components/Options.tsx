import { useEffect } from 'react';
import { Pressable, PressableProps, View, ViewProps } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { twMerge } from 'tailwind-merge';

import baseConfig from '@ei/tailwind-config';

type Props = ViewProps;

type ItemProps = PressableProps & {
  active?: boolean;
};

function Item({ className, active, ...props }: ItemProps) {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const baseBorderColor = baseConfig.theme.colors.primary[500];

    return {
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [baseBorderColor, `${baseBorderColor}00`],
      ),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [
          baseConfig.theme.colors.primary[700],
          baseConfig.theme.colors.primary[800],
        ],
      ),
    };
  });

  useEffect(() => {
    progress.value = withTiming(active ? 0 : 1, { duration: 200 });
  }, [active, progress]);

  return (
    <Animated.View
      className={twMerge(
        'flex h-16 w-16 items-center justify-center rounded-full border-2 bg-primary-800',
        className,
      )}
      style={[animatedStyle]}
    >
      <Pressable
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
    </Animated.View>
  );
}

function Options({ className, ...props }: Props) {
  return (
    <View
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
      className={twMerge(
        'flex-row items-center justify-around rounded-full bg-primary-900 p-2',
        className,
      )}
    />
  );
}

Options.Item = Item;

export default Options;
