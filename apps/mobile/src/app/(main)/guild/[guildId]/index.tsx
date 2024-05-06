import { api } from '@ei/react-shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View, Pressable } from 'react-native';
import Text from 'src/components/Text';
import { Guild, NotApprovedRole, Role, useRoleUtils, useRoles } from '@ei/react-shared/roles';
import { FlatList } from 'react-native-gesture-handler';
import Button from 'src/components/Button';
import { Plus } from 'lucide-react-native';

type CheckBoxProps = {
  checked: boolean;
  color: string;
};  

function CheckBox({ checked, color }: CheckBoxProps) {
  return (
    <View
      style={{
        borderColor: color,
        backgroundColor: checked ? color : 'transparent',
      }}
      className="h-6 w-6 rounded-full border-2"
    />
  );
}

type RoleProps = {
  role: Role | NotApprovedRole;
  guild: Guild
}

function RoleButton({ role, guild }: RoleProps) {
  const {name, color, isAddable, isApproved, isPending, addRole, removeRole} = useRoleUtils(role, guild);
  const disabled = isPending || !isApproved;

  return (
    <View style={{
      borderColor: color,
    }}>
      <Button
        key={role.id}
        className="flex flex-row bg-primary-900 transition items-center disabled:opacity-50 rounded-full p-2 mb-2 border-4"
        style={{
          borderColor: isAddable ? 'transparent' : color,
          opacity: disabled ? 0.5 : 1,
        }}
        disabled={disabled}
        onPress={() => {
          if (!isApproved) return;

          if (isAddable) {
            addRole();
          } else {
            removeRole();
          }
        }}
      >
        <CheckBox checked={!isAddable} color={color} />
        <Text className='pl-2' style={{color}}>{name}</Text>
      </Button>
    </View>
  );
}

function AddButton() {
  const { guildId } = useLocalSearchParams();

  if (!guildId || typeof guildId !== 'string') {
    throw new Error('Invalid guildId');
  }

  return (
    <Pressable>
      <Plus />
    </Pressable>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addButton = () => (
      <AddButton />
  )

function RoleScreen() {
  const { guildId } = useLocalSearchParams();

  if (!guildId || typeof guildId !== 'string') {
    throw new Error('Invalid guildId');
  }

  const {data: guild} = api.guild.get.useQuery({ guildId });
  const {roles} = useRoles({ guildId });

  if (!guild) {
    return (
      <View>
        <Stack.Screen options={{ title: '' }} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: guild.discord.name, headerRight: addButton}} />
      <FlatList className='p-2' data={roles} renderItem={({item}) => <RoleButton role={item} guild={guild} />} />
    </>
  );
}

export default RoleScreen;
