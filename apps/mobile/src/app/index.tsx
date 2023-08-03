import { SafeAreaView } from "react-native-safe-area-context"
import { api } from "../utils/api"
import Text from "src/components/Text";
import { Stack } from "expo-router";
import { Alert, View } from "react-native";
import { Image } from "expo-image";
import { HeaderButtons, Item } from 'react-navigation-header-buttons'
import { baseConfig } from "tailwind.config";
import { useAuth } from "src/context/auth";
import { PusherProvider, usePusher } from "src/context/pusher";
import { useEffect, useState } from "react";
import { lobbyChangeSchema } from "@ei/lobby";

const Screen = () => {
  const [lobby, setLobby] = useState<Zod.infer<typeof lobbyChangeSchema> | null>(null)
  const {data: user} = api.user.me.useQuery();
  const {pusher} = usePusher();

  useEffect(() => {
    if(!pusher) return;

    pusher.user.bind('lobbyChange', (newData : unknown) => {
      const result = lobbyChangeSchema.safeParse(newData);
      if(!result.success) {
        Alert.alert("Error", "Failed to parse lobby data");
        return;
      }

      setLobby(result.data);
    });

    return () => {
      pusher.user.unbind('lobbyChange');
    }
  }, [pusher])

  if(!lobby) return (
    <View className="flex-1 align-middle justify-center">
      <Text className="text-center text-3xl m-3">Please join a lobby {user?.username}</Text>
    </View>
  )

  const guild = lobby.guild;

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

// const getUserImageUrl = (user : {avatar : string, id : string}) => {


 //return  cdn.avatar(user.id, user.avatar, {extension: "png", size: 128});
// }

const Index = () => {
  const {signOut} = useAuth();
  const {data: user} = api.user.me.useQuery();

  return (
  <>
    <Stack.Screen options={{headerTitle: user ? () => (
        <View className="flex flex-row">
          {/* {user.avatar && <Image source={getUserImageUrl({id: user.id, avatar: user.avatar})} className="w-10 h-10 rounded-full ring-4 outline-primary" alt=""/>} */}
          <Text className="text-2xl text-background font-bold">{user?.globalName}</Text>
        </View>
      ) : "", headerRight: () => (
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
