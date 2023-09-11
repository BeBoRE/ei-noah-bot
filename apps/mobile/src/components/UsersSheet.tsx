import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { ChannelType, userSchema } from '@ei/lobby';
import baseConfig from '@ei/tailwind-config';

import UserItem from './UserItem';

function UsersSheet({
  users,
  channelType,
}: {
  users: Zod.infer<typeof userSchema>[];
  channelType: ChannelType;
}) {
  const sheetRef = useRef<BottomSheet>(null);
  const [prevUserLength, setPrevUserLenght] = useState(users.length);

  useEffect(() => {
    if (prevUserLength === 0 && users.length) sheetRef.current?.snapToIndex(0);
    else if (!users.length) sheetRef.current?.close();

    setPrevUserLenght(users.length);
  }, [users.length, prevUserLength]);

  return (
    <BottomSheet
      ref={sheetRef}
      backgroundStyle={{
        backgroundColor: baseConfig.theme.colors.primary[900],
      }}
      snapPoints={[100, 300, '90%']}
      index={users.length ? 1 : -1}
      handleStyle={{
        backgroundColor: baseConfig.theme.colors.primary[700],
      }}
    >
      <BottomSheetView>
        <View className="px-5">
          {users.map((user) => (
            <UserItem key={user.id} user={user} channelType={channelType} />
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

export default UsersSheet;
