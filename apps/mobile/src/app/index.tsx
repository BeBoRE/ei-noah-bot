import { SafeAreaView } from "react-native-safe-area-context"
import { api } from "../utils/api"
import Text from "src/components/Text";
import { Stack } from "expo-router";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { HeaderButtons, Item } from 'react-navigation-header-buttons'
import { baseConfig } from "tailwind.config";
import { useAuth } from "src/context/auth";
import { PusherProvider, usePusher } from "src/context/pusher";
import { useEffect } from "react";

const Screen = () => {
  const {data, isLoading, error, isRefetching, refetch} = api.lobby.all.useQuery();
  const {data: user} = api.user.me.useQuery();
  const {pusher} = usePusher();

  useEffect(() => {
    if(!pusher) return;

    pusher.user.bind('lobbyChange', () => {
      Alert.alert('Lobby created', 'A new lobby has been created', [{text: 'OK'}])
    });


    return () => {
      pusher.user.unbind('lobbyChange');
    }
  }, [pusher, refetch])

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
      <Text className="text-center text-3xl m-3">Please join a lobby {user?.username}</Text>
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
      <PusherProvider>
        <Screen />
      </PusherProvider>
    </SafeAreaView>
  </>
  )
}

export default Index;
