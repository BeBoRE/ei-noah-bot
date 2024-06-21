import * as React from 'react';
import { Pressable } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'src/utils/cn';

import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';
import { TextClassContext } from './text';

const buttonVariants = cva(
  'group flex items-center justify-center rounded-md web:ring-offset-background transition-opacity web:focus-visible:outline-none web:focus-visible:ring-2 web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary web:hover:opacity-90 active:opacity-90',
        destructive:
          'border border-reject web:hover:opacity-90 active:opacity-90',
        outline:
          'border border-primary-800 bg-background web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
        secondary: 'bg-primary-200 web:hover:opacity-80 active:opacity-80',
        ghost:
          'web:hover:bg-accent web:hover:text-accent-foreground active:bg-accent',
        link: 'web:underline-offset-4 web:hover:underline web:focus:underline ',
      },
      size: {
        default: 'h-10 px-4 py-2 native:h-12 native:px-5 native:py-3',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8 native:h-14',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const buttonTextVariants = cva(
  'web:whitespace-nowrap text-sm native:text-base font-medium text-foreground web:transition-colors',
  {
    variants: {
      variant: {
        default: 'text-primary-100',
        destructive: 'text-reject',
        outline: 'text-primary-100',
        secondary: 'text-background',
        ghost: 'text-primary',
        link: 'text-primary group-active:underline',
      },
      size: {
        default: '',
        sm: '',
        lg: 'native:text-lg',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  ButtonProps
>(({ className, variant, size, ...props }, ref) => (
  <TextClassContext.Provider
    value={cn(
      props.disabled && 'web:pointer-events-none',
      buttonTextVariants({ variant, size }),
    )}
  >
    <Pressable
      className={cn(
        props.disabled && 'web:pointer-events-none opacity-50',
        buttonVariants({ variant, size, className }),
      )}
      ref={ref}
      role="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  </TextClassContext.Provider>
));
Button.displayName = 'Button';

cssInterop(Button, { className: 'style' });

const AnimatedButton = Animated.createAnimatedComponent(Button);

export { Button, AnimatedButton, buttonTextVariants, buttonVariants };
export type { ButtonProps };
