import { forwardRef, useState } from 'react';
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
  onMeasure: (ref: LayoutRectangle) => void;
  active?: boolean;
};

const Item = forwardRef<View, ItemProps>(
  ({ className, onMeasure, active, ...props }: ItemProps, ref) => (
    <View
      ref={ref}
      onLayout={(event) => {
        onMeasure(event.nativeEvent.layout);
      }}
    >
      <Pressable
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        disabled={active}
        className={twMerge(
          'flex h-16 w-16 items-center justify-center rounded-full',
          className,
        )}
      />
    </View>
  ),
);

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
    const activeIndex = items.findIndex((item) => item.active);
    const [measurements, setMeasurements] = useState<
      LayoutRectangle[] | null
    >();

    const activeLayout = measurements?.[activeIndex || 0];

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
            entering={FadeInRight.duration(200).delay(
              (delay || 0) + activeIndex * 100,
            )}
            className="absolute rounded-full bg-primary-800"
          />
        )}
        {items.map(({ id, onPress: onSelect, children, active }, index) => (
          <AnimatedItem
            key={id}
            onMeasure={(layout) => {
              setMeasurements((prev) => {
                const next = prev ? [...prev] : [];

                next[index] = layout;

                return next;
              });
            }}
            onPress={onSelect}
            active={active}
            entering={FadeInRight.duration(200).delay(
              (delay || 0) + index * 100,
            )}
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
