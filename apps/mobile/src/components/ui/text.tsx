import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cn } from 'src/utils/cn';

import * as Slot from './primitives/slot';
import { SlottableTextProps, TextRef } from './primitives/types';

const TextClassContext = React.createContext<string | undefined>(undefined);

const Text = React.forwardRef<TextRef, SlottableTextProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const textClass = React.useContext(TextClassContext);
    const Component = asChild ? Slot.Text : RNText;
    return (
      <Component
        className={cn(
          'text-foreground web:select-text text-base',
          textClass,
          className,
        )}
        ref={ref}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
    );
  },
);
Text.displayName = 'Text';

export { Text, TextClassContext };
