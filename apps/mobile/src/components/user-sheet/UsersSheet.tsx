import { View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { LobbyUser, RecentlyAddedUser } from '@ei/lobby';
import baseConfig from '@ei/tailwind-config';

import { FlatList } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import UserItem from './UserItem';

function UsersSheet({ users, recentlyAddedUsers }: { users: LobbyUser[], recentlyAddedUsers: RecentlyAddedUser[] }) {
  return (
    <BottomSheet
      backgroundStyle={{
        backgroundColor: baseConfig.theme.colors.primary[900],
      }}
      snapPoints={[100, 300, '90%']}
      index={1}
      handleIndicatorStyle={{
        backgroundColor: baseConfig.theme.colors.primary[700],
      }}
    >
      <BottomSheetView>
        <FlatList data={recentlyAddedUsers} renderItem={({ item }) => <Image source={item.avatar} />} horizontal />
        <View className="p-5">
          {users.map((user) => (
            <UserItem key={user.id} user={user} />
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

export default UsersSheet;
