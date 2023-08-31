import { forwardRef, useEffect, useState } from 'react';
import {
  LayoutRectangle,
  Pressable,
  PressableProps,
  View,
  ViewProps,
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { MotiView } from 'moti';
import { twMerge } from 'tailwind-merge';

type ItemProps = PressableProps & {
  onActive: (ref: LayoutRectangle) => void;
  active?: boolean;
};

const Item = forwardRef<View, ItemProps>(({ className, onActive, active, ...props }: ItemProps, ref) => {
  const [measurements, setMeasurements] = useState<LayoutRectangle>();

  useEffect(() => {
    if (active && measurements) {
      onActive(measurements);
    }
  }, [active, measurements, onActive]);

  return (
    <View
      ref={ref}
      onLayout={(event) => {
        setMeasurements(event.nativeEvent.layout);
      }}
    >
      <Pressable
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        className={twMerge(
          'flex h-16 w-16 items-center justify-center rounded-full',
          className,
        )}
      />
    </View>
  );
})

const AnimatedItem = Animated.createAnimatedComponent(Item);

type Props = ViewProps & {
  items: Array<{
    id: string;
    onPress: () => void;
    children: React.ReactNode;
    active?: boolean;
  }>;
  delay?: number;
};

const Options = forwardRef<View, Props>(
  ({ className, items, delay, ...props }: Props, ref) => {
    const [activeLayout, setActiveLayout] = useState<LayoutRectangle | null>();

    return (
      <View
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        ref={ref}
        className={twMerge(
          'relative flex-row items-center justify-around rounded-full bg-primary-900 p-2',
          className,
        )}
      >
        {activeLayout && (
          <MotiView
            animate={{
              left: activeLayout.x,
              top: activeLayout.y,
              width: activeLayout.width,
              height: activeLayout.height,
            }}
            transition={{
              type: 'spring',
              damping: 40,
              stiffness: 400,
            }}
            entering={FadeInRight.duration(200).delay((delay || 0) + ((items.length - 1) * 100))}
            className="absolute rounded-full bg-primary-800"
          />
        )}
        {items.map(({ id, onPress: onSelect, children, active }, index) => (
          <AnimatedItem
            key={id}
            onActive={(layout) => {
              setActiveLayout(layout);
            }}
            onPress={onSelect}
            active={active}
            entering={FadeInRight.duration(200).delay((delay || 0) + index * 100)}
          >
            {children}
          </AnimatedItem>
        ))}
      </View>
    );
  },
);

export const AnimatedOptions = Animated.createAnimatedComponent(Options);

export default Options;
