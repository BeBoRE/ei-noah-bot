import { View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { LobbyUser } from '@ei/lobby';
import baseConfig from '@ei/tailwind-config';

import UserItem from './UserItem';

function UsersSheet({
  users
}: {
  users: LobbyUser[];
}) {
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
