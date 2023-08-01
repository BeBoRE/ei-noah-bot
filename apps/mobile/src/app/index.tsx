import { SafeAreaView } from "react-native-safe-area-context"
import { api } from "../utils/api"
import Text from "src/components/Text";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import Image from "next/image";

const Screen = () => {
  const {data, isLoading} = api.lobby.all.useQuery();

  if(isLoading) return (
    <View className="flex-1 align-middle justify-center">
      <ActivityIndicator size={"large"}></ActivityIndicator>
    </View>
  )

  const guild = data && data[0] && data[0].guild.success ? data[0].guild.data : null;

  if(!guild) return (
    <View className="flex-1 align-middle justify-center">
      <Text className="text-center text-3xl">Error contacting Discord</Text>
    </View>
  )

  return (
    <View className="p-5">
      <View>
        {guild.icon ? <Image src={guild.icon} className="h-8 w-8" alt=""/> : <View className="h-8 w-8 bg-secondary"/>}
      </View>
    </View>
  )
}

const Index = () => {
  return (
  <>
    <Stack.Screen options={{headerTitle: ""}} />
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
      <Screen />
    </SafeAreaView>
  </>
  )
}

export default Index;
