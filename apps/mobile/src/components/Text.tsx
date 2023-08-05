import { Text as NativeText, TextProps } from "react-native";
import { twMerge } from 'tailwind-merge'

const Text = (props : TextProps) => {
  return <NativeText {...props} className={twMerge(props.className, "text-text")} />;
}

export default Text;
