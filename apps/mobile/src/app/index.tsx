import { SafeAreaView } from "react-native-safe-area-context"
import { api } from "../utils/api"
import Text from "src/components/Text";
import { Stack } from "expo-router";

const Index = () => {
  const {data, isLoading} = api.lobby.all.useQuery();

  return (
  <>
    <Stack.Screen options={{headerTitle: ""}} />
    <SafeAreaView edges={["left", "right", "bottom"]}>
      {isLoading && <Text>Loading...</Text>}
      <Text>{data && data[0] && data[0].guild.success && data[0].guild.data.name}</Text>
    </SafeAreaView>
  </>
  )
}

export default Index;
