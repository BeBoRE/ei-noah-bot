import * as React from 'react';
import { Pressable, Text as RNText } from 'react-native';

import * as Slot from '../slot';
import type {
  PressableRef,
  SlottablePressableProps,
  SlottableTextProps,
  TextRef,
} from '../types';
import type { LabelRootProps, LabelTextProps } from './types';

const Root = React.forwardRef<
  PressableRef,
  Omit<SlottablePressableProps, 'children' | 'hitSlop' | 'style'> &
    LabelRootProps
>(({ asChild, ...props }, ref) => {
  const Component = asChild ? Slot.Pressable : Pressable;
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Component ref={ref} {...props} />;
});

Root.displayName = 'RootNativeLabel';

const Text = React.forwardRef<TextRef, SlottableTextProps & LabelTextProps>(
  ({ asChild, ...props }, ref) => {
    const Component = asChild ? Slot.Text : RNText;
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <Component ref={ref} {...props} />;
  },
);

Text.displayName = 'TextNativeLabel';

export { Root, Text };
