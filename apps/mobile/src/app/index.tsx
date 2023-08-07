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
import { ChannelType, generateLobbyName, lobbyChangeSchema, userIdToPusherChannel } from "@ei/lobby";
import { CDNRoutes, ImageFormat, RouteBases } from "discord-api-types/rest/v10";
import ChannelTypeButton from "src/components/ChannelTypeButton";
import UserLimitButton from "src/components/UserLimitButton";
import UsersSheet from "src/components/UsersSheet";
import JoinLobby from "src/components/JoinLobby";

const Screen = () => {
  const [lobby, setLobby] = useState<Zod.infer<typeof lobbyChangeSchema> | null>(null)
  const {data: user} = api.user.me.useQuery();
  const pusher = usePusher();

  useEffect(() => {
    if(!pusher) return;

    pusher.user.bind('lobbyChange', (newData : unknown) => {
      const result = lobbyChangeSchema.safeParse(newData);
      if(!result.success) {
        Alert.alert("Error", `Failed to parse lobby data\n${result.error.message}`);
        return;
      }

      setLobby(result.data);
    });

    return () => {
      pusher.user.unbind('lobbyChange');
    }
  }, [pusher?.sessionID])

  useEffect(() => {
    if (!pusher || !user?.id) return;
    const channelName = userIdToPusherChannel({id: user.id})

    console.log('Subscribing to channel', channelName)
    pusher.subscribe(channelName);

    return () => {
      console.log('Unsubscribing from channel', channelName)
      pusher.unsubscribe(channelName)
    }
  }, [pusher?.sessionID, user?.id])

  if(!lobby) return (
    <JoinLobby />
  )

  const guild = lobby.guild;

  if(!guild) return (
    <View className="flex-1 align-middle justify-center">
      <Text className="text-center text-3xl">Error contacting Discord</Text>
    </View>
  )

  const style = "w-40 h-40 bg-primary-900 rounded-full";

  const limits = new Set([0, 2, 5, 10, lobby.channel.limit || 0])

  return (
    <View className="p-5 pb-0 flex-1">
      <View className="items-center">
        {guild.icon ? <Image source={guild.icon} className={[style, 'ring-4'].join(' ')} alt=""/> : <View className={`${style} bg-secondary`}/>}
        <Text className="text-center text-3xl p-3 font-bold mb-[-25px]">{generateLobbyName(lobby.channel.type, lobby.user, lobby.channel.name || undefined)}</Text>
        <Text className="text-center text-1xl p-3 font-medium opacity-60">{guild.name}</Text>
      </View>
      <View className="bg-primary-900 h-20 rounded-full flex-row justify-around items-center px-10 mb-3">
        <ChannelTypeButton lobbyType={ChannelType.Public} lobby={lobby.channel}/>
        <ChannelTypeButton lobbyType={ChannelType.Mute} lobby={lobby.channel}/>
        <ChannelTypeButton lobbyType={ChannelType.Nojoin} lobby={lobby.channel}/>
      </View>
      <View className="bg-primary-900 h-20 rounded-full flex-row justify-around items-center px-2">
        {Array.from(limits).sort((a, b) => a - b).map(limit => <UserLimitButton limit={limit} key={limit} lobby={lobby.channel}/>)}
      </View>
      <UsersSheet users={lobby.users} channelType={lobby.channel.type} />
    </View>
  )
}

const getUserImageUrl = (user : {avatar : string, id : string}) => {
 return  `${RouteBases.cdn}${CDNRoutes.userAvatar(user.id, user.avatar, ImageFormat.PNG)}?size=${128}`;
}

const Index = () => {
  const {signOut} = useAuth();
  const {data: user} = api.user.me.useQuery();

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
    ), headerLeft: user && (() => (
      <View className="flex flex-row items-center">
        {user.avatar && <Image source={getUserImageUrl({id: user.id, avatar: user.avatar})} className="w-10 h-10 rounded-full mr-2" alt=""/>}
        <Text className="text-2xl text-primary-950 font-bold">{user?.globalName}</Text>
      </View>
    ))}}/>
    <SafeAreaView edges={["left", "right"]} className="flex-1 to-primary-950">
      <PusherProvider>
        <Screen />
      </PusherProvider>
    </SafeAreaView>
  </>
  )
}

export default Index;
