import { lobbyChangeSchema } from "@ei/lobby"
import { Pressable } from "react-native"
import Text from "./Text"

type Props = {
  limit : number
  lobby : NonNullable<Zod.infer<typeof lobbyChangeSchema>>["channel"]
}

const UserLimitButton = ({limit, lobby} : Props) => {
  return (
    <Pressable className={`w-16 h-16 flex justify-center items-center rounded-full bg-secondary ${lobby.limit === limit ? 'border-2 border-primary' : ''}`}><Text className="text-3xl font-bold">{limit === 0 ? '∞' : limit}</Text></Pressable>
  )
}

export default UserLimitButton
