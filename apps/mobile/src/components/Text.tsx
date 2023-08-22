import { forwardRef } from 'react';
import { Text as NativeText, TextProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { twMerge } from 'tailwind-merge';

const Text = forwardRef<NativeText, TextProps>(
  ({ className, ...props }: TextProps, ref) => (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <NativeText
      ref={ref}
      {...props}
      className={twMerge(className, 'text-text')}
    />
  ),
);

export const AnimatedText = Animated.createAnimatedComponent(Text);

export default Text;
