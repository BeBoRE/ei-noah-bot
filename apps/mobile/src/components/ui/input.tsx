/* eslint-disable react/prop-types */
import * as React from 'react';
import { TextInput } from 'react-native';

import baseConfig from '@ei/tailwind-config';

import { cssInterop } from 'nativewind';
import { cn } from '../../utils/cn';

const Input = React.forwardRef<
  React.ElementRef<typeof TextInput>,
  React.ComponentPropsWithoutRef<typeof TextInput>
>(({ className, ...props }, ref) => (
  <TextInput
    ref={ref}
    placeholderTextColor={baseConfig.theme.colors.primary[700]}
    className={cn(
      'rounded-lg border border-primary-800 bg-transparent p-4 text-primary-200',
      props.editable === false && 'opacity-50',
      className,
    )}
    // eslint-disable-next-line react/jsx-props-no-spreading
    {...props}
  />
));

Input.displayName = 'Input';

cssInterop(Input, { className: 'style' });

export { Input };
