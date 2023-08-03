import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import UserItem from './UserItem'
import baseConfig from '@ei/tailwind-config'
import { View } from 'react-native'
import { userSchema } from '@ei/lobby'
import { useEffect, useRef, useState } from 'react'
import Animated, { FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated'

const UsersSheet = ({users} : {users : Zod.infer<typeof userSchema>[]}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const [prevUserLength, setPrevUserLenght] = useState(users.length);

  useEffect(() => {
    if(prevUserLength === 0 && users.length) sheetRef.current?.snapToIndex(0);
    else if(!users.length) sheetRef.current?.close();

    setPrevUserLenght(users.length);
  }, [users.length, prevUserLength])

  return (
    <BottomSheet ref={sheetRef} backgroundStyle={{backgroundColor: baseConfig.theme.colors.secondary}} snapPoints={[300, '90%']} index={users.length ? 0 : -1}>
      <BottomSheetView>
        <View className='px-5'>
          {users.map((user) => <UserItem key={user.id} user={user} />)}
        </View>
      </BottomSheetView>
    </BottomSheet>
  )
}

export default UsersSheet
