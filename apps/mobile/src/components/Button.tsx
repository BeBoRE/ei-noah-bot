import { Pressable, PressableProps } from 'react-native';
import { ClassNameValue, twMerge } from 'tailwind-merge';

import Text from './Text';

type ButtonProps = PressableProps & {
  children: React.ReactNode;
  textClassName?: ClassNameValue;
  className?: ClassNameValue;
};

function Button({ children, textClassName, className, ...props }: ButtonProps) {
  const renderedChildren =
    typeof children === 'string' ? (
      <Text
        className={twMerge(
          'text-center font-bold text-primary-100',
          textClassName,
        )}
      >
        {children}
      </Text>
    ) : (
      children
    );

  return (
    <Pressable
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
      className={twMerge(className, 'rounded-md bg-primary p-2')}
    >
      {renderedChildren}
    </Pressable>
  );
}

export default Button;
