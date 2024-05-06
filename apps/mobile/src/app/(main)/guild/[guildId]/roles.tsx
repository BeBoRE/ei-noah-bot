import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import Button from 'src/components/Button';
import Text from 'src/components/Text';

import { api } from '@ei/react-shared';
import {
  Guild,
  NotApprovedRole,
  Role,
  useRoles,
  useRoleUtils,
} from '@ei/react-shared/roles';

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
  guild: Guild;
};

function RoleButton({ role, guild }: RoleProps) {
  const { name, color, isAddable, isApproved, isPending, addRole, removeRole } =
    useRoleUtils(role, guild);
  const disabled = isPending || !isApproved;

  return (
    <View
      className="mb-2"
      style={{
        borderColor: color,
      }}
    >
      <Button
        key={role.id}
        className="flex flex-row items-center rounded-full border-4 bg-primary-900 p-2 transition disabled:opacity-50"
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
        <Text className="pl-2" style={{ color }}>
          {name}
        </Text>
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
    <Link href={{ pathname: '/guild/[guildId]/create', params: { guildId } }} >
      <Plus size={32}/>
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addButton = () => <AddButton />;

function RoleScreen() {
  const { guildId } = useLocalSearchParams();

  if (!guildId || typeof guildId !== 'string') {
    throw new Error('Invalid guildId');
  }

  const { data: guild } = api.guild.get.useQuery({ guildId });
  const { roles } = useRoles({ guildId });

  if (!guild) {
    return (
      <View>
        <Stack.Screen options={{ title: '' }} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: guild.discord.name, headerRight: addButton }}
      />
      <FlatList
        className="p-2"
        data={roles}
        renderItem={({ item }) => <RoleButton role={item} guild={guild} />}
      />
    </>
  );
}

export default RoleScreen;
