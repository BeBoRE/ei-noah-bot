import { Pressable, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { LobbyUser, RecentlyAddedUser } from '@ei/lobby';
import { api } from '@ei/react-shared';
import baseConfig from '@ei/tailwind-config';

import { Text } from '../ui/text';
import UserItem from './UserItem';

function UsersSheet({
  users,
  recentlyAddedUsers,
}: {
  users: LobbyUser[];
  recentlyAddedUsers: RecentlyAddedUser[];
}) {
  const { mutate: addUser } = api.lobby.addUser.useMutation();

  return (
    <BottomSheet
      backgroundStyle={{
        backgroundColor: baseConfig.theme.colors.primary[900],
      }}
      snapPoints={[100, 400, '90%']}
      index={1}
      handleIndicatorStyle={{
        backgroundColor: baseConfig.theme.colors.primary[700],
      }}
    >
      <BottomSheetScrollView>
        {recentlyAddedUsers.length ? (
          <View>
            <Text className="px-4 py-3 pb-2 text-lg font-bold text-primary-50">
              Quick Add
            </Text>
            <FlatList
              horizontal
              data={recentlyAddedUsers.length ? recentlyAddedUsers : [null]}
              ListFooterComponent={<View className="w-4" />}
              ListHeaderComponent={<View className="w-4" />}
              renderItem={({ item }) =>
                item !== null ? (
                  <Pressable onPress={() => addUser({ user: item })}>
                    <Image
                      className="h-16 w-16 rounded-full"
                      source={item.avatar}
                    />
                  </Pressable>
                ) : (
                  <View className="h-16 w-16 rounded-full bg-primary-800" />
                )
              }
            />
          </View>
        ) : null}
        <View className="p-3">
          {users.map((user) => (
            <UserItem key={user.id} user={user} />
          ))}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

export default UsersSheet;
