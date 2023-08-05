import { Pressable, PressableProps } from "react-native"
import { ClassNameValue, twMerge } from "tailwind-merge";
import Text from "./Text";

type ButtonProps = PressableProps & {
  children: React.ReactNode;
  textClassName?: ClassNameValue;
}

const Button = (props : ButtonProps) => {
  const children = typeof props.children === 'string' ? <Text className={twMerge(props.textClassName, "text-white font-bold text-center")}>{props.children}</Text> : props.children;

  return (
    <Pressable {...props} className={twMerge(props.className, "bg-primary rounded-md p-2")}>
      {children}
    </Pressable>
  )
}

export default Button;
