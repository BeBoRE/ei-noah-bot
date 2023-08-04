import {View} from "react-native";
import { api } from "src/utils/api";
import Text from "./Text";

const JoinLobby = () => {
  const {data: user} = api.user.me.useQuery();

  return (
    <View className="flex-1 align-middle justify-center">
      <Text className="text-center text-3xl m-3">Please join a lobby {user?.globalName}</Text>
    </View>
  )
}

export default JoinLobby;
