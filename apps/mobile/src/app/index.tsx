import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "react-native"
import { api } from "../utils/api"

const Index = () => {
  const {data, isFetching} = api.lobby.all.useQuery();

  return (
    <SafeAreaView edges={["left", "right", "bottom"]}>
      {isFetching && <Text>Loading...</Text>}
      <Text>{data && data[0] && data[0].guild.success && data[0].guild.data.name}</Text>
    </SafeAreaView>
  )
}

export default Index;
