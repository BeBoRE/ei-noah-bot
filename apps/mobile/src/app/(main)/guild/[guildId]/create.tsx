import { useState } from 'react';
import { NativeSyntheticEvent, TextInputChangeEventData } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Text } from 'src/components/ui/text';

import { useCreateRole } from '@ei/react-shared/roles';
import baseConfig from '@ei/tailwind-config';

function AddScreen() {
  const [name, setName] = useState<string | null>(null);
  const router = useRouter();

  const { guildId } = useLocalSearchParams();

  if (!guildId || typeof guildId !== 'string') {
    throw new Error('Invalid guildId');
  }

  const changeName = (e: NativeSyntheticEvent<TextInputChangeEventData>) => {
    setName(e.nativeEvent.text.trimStart());
  };

  const { createRole, error, isPending } = useCreateRole(guildId, name, () => {
    router.dismiss();
  });

  return (
    <>
      <Stack.Screen options={{ headerTitle: 'Create Role' }} />
      <ScrollView className="flex flex-1 p-2">
        <Label nativeID="role-name">Role Name:</Label>
        <Input
          nativeID="role-name"
          placeholder="Name"
          className="mb-2"
          onChange={changeName}
        />
        <Text className="text-reject">{error?.message}</Text>
        <Button
          className="flex-row self-end"
          variant="secondary"
          disabled={isPending || !name}
          onPress={() => createRole()}
        >
          <Plus
            className="mr-2"
            size={18}
            color={baseConfig.theme.colors.background}
          />
          <Text>Create</Text>
        </Button>
      </ScrollView>
    </>
  );
}

export default AddScreen;
