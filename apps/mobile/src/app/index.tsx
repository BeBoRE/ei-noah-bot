import { SafeAreaView } from "react-native-safe-area-context"
import { api } from "../utils/api"
import Text from "src/components/Text";
import { Stack } from "expo-router";
import { ActivityIndicator, Pressable, TouchableWithoutFeedback, View } from "react-native";
import { Image } from "expo-image";
import { HeaderButton, HeaderButtons, defaultRenderVisibleButton, Item } from 'react-navigation-header-buttons'
import tailwindConfig, { baseConfig } from "tailwind.config";
import { useAuth } from "src/context/auth";

const Screen = () => {
  const {data, isLoading, error, isRefetching, refetch} = api.lobby.all.useQuery();

  if(isLoading) return (
    <View className="flex-1 align-middle justify-center">
      <ActivityIndicator size={"large"}></ActivityIndicator>
    </View>
  )

  if(!data && error) return (
    <View className="flex-1 align-middle justify-center">
      <Text className="text-center text-3xl">Error loading lobbies</Text>
    </View>
  )

  if(data && data.length === 0) return (
    <Pressable className="flex-1 align-middle justify-center" onPress={() => {refetch()}}>
      <Text className="text-center text-3xl m-3">Please join a lobby</Text>
      <ActivityIndicator className={isRefetching ? 'opacity-100' : 'opacity-0 transition-opacity'} size={"large"}></ActivityIndicator>
    </Pressable>
  )

  const guild = data && data[0] && data[0].guild.success ? data[0].guild.data : null;

  if(!guild) return (
    <View className="flex-1 align-middle justify-center">
      <Text className="text-center text-3xl">Error contacting Discord</Text>
    </View>
  )

  const style = "w-32 h-32 bg-primary-900 rounded-full ring-4 outline-primary";

  return (
    <View className="p-5">
      <View className="items-center">
        {guild.icon ? <Image source={guild.icon} className={[style, 'ring-4'].join(' ')} alt=""/> : <View className={`${style} bg-secondary`}/>}
        <Text className="text-center text-2xl p-3 font-bold">{guild.name}</Text>
      </View>
    </View>
  )
}

const Index = () => {
  const {signOut} = useAuth();

  return (
  <>
    <Stack.Screen options={{headerTitle: "", headerRight: () => (
      <HeaderButtons>
        <Item
          title="Logout"
          onPress={() => {signOut()}}
          color={baseConfig.theme.colors.background}
        />
      </HeaderButtons>
    )}}/>
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
      <Screen />
    </SafeAreaView>
  </>
  )
}

export default Index;
