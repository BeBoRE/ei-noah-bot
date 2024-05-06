import * as React from 'react';
import { cn } from 'src/utils/cn';

import * as LabelPrimitive from './primitives/label/index';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Text>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Text>
>(
  (
    { className, onPress, onLongPress, onPressIn, onPressOut, ...props },
    ref,
  ) => (
    <LabelPrimitive.Root
      className="web:cursor-default"
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <LabelPrimitive.Text
        ref={ref}
        className={cn(
          'native:text-base web:peer-disabled:cursor-not-allowed web:peer-disabled:opacity-70 mb-1 pl-2 text-sm font-medium leading-none text-primary-300',
          className,
        )}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      />
    </LabelPrimitive.Root>
  ),
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
