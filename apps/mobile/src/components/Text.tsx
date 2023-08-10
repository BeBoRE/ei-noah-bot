import { Text as NativeText, TextProps } from 'react-native';
import { twMerge } from 'tailwind-merge';

function Text({ className, ...props } : TextProps) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <NativeText {...props} className={twMerge(className, 'text-text')} />;
}

export default Text;
