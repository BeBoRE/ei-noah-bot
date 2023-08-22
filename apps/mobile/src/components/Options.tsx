import { useEffect, useState } from 'react';
import {
  LayoutRectangle,
  Pressable,
  PressableProps,
  View,
  ViewProps,
} from 'react-native';
import { twMerge } from 'tailwind-merge';
import { MotiView } from 'moti';

type ItemProps = PressableProps & {
  onActive: (ref: LayoutRectangle) => void;
  active?: boolean;
};

function Item({ className, onActive, active, ...props }: ItemProps) {
  const [measurements, setMeasurements] = useState<LayoutRectangle>();

  useEffect(() => {
    if (active && measurements) {
      onActive(measurements);
    }
  }, [active, measurements, onActive]);

  return (
    <View
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
}

type Props = ViewProps & {
  items: Array<{
    id: string;
    onPress: () => void;
    children: React.ReactNode;
    active?: boolean;
  }>;
};

function Options({ className, items, ...props }: Props) {
  const [activeLayout, setActiveLayout] = useState<LayoutRectangle | null>();

  return (
    <View
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
      className={twMerge(
        'flex-row items-center justify-around rounded-full bg-primary-900 p-2 relative',
        className,
      )}
    >
      {activeLayout && <MotiView
        animate={{
          left: (activeLayout.x),
          top: (activeLayout.y),
          width: activeLayout.width,
          height: activeLayout.height,
        }}
        transition={{
          type: 'spring',
          damping: 40,
          stiffness: 400
        }}
        className="absolute rounded-full bg-primary-800"
      />}
      {items.map(({ id, onPress: onSelect, children, active }) => (
        <Item
          key={id}
          onActive={(layout) => {
            setActiveLayout(layout);
          }}
          onPress={onSelect}
          active={active}
        >
          {children}
        </Item>
      ))}
    </View>
  );
}

export default Options;
