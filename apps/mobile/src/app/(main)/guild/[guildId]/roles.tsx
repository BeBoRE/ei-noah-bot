import { View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { AnimatedButton } from 'src/components/ui/button';
import {Text} from 'src/components/ui/text';

import { api } from '@ei/react-shared';
import {
  Guild,
  NotApprovedRole,
  Role,
  useRoles,
  useRoleUtils,
} from '@ei/react-shared/roles';
import { MotiView } from 'moti';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

type CheckBoxProps = {
  checked: boolean;
  color: string;
};

function CheckBox({ checked, color }: CheckBoxProps) {
  return (
    <MotiView
      animate={{
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

  const svColor = useSharedValue(isAddable ? '#0000' : color);
  const svDisabled = useSharedValue(disabled ? 0.5 : 1);
  
  useEffect(() => {
    svColor.value = withTiming(isAddable ? '#0000' : color, { duration: 150 });
  }, [color, isAddable, svColor]);

  useEffect(() => {
    svDisabled.value = withTiming(disabled ? 0.5 : 1, { duration: 150 });
  }, [svDisabled, disabled])

  return (
    <AnimatedButton
      key={role.id}
      className="mb-2 flex-row rounded-full justify-start bg-primary-900"
      style={{
        borderColor: svColor,
        borderWidth: 2,
        opacity: svDisabled,
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
    </AnimatedButton>
  );
}

function AddButton() {
  const { guildId } = useLocalSearchParams();

  if (!guildId || typeof guildId !== 'string') {
    throw new Error('Invalid guildId');
  }

  return (
    <Link href={{ pathname: '/guild/[guildId]/create', params: { guildId } }}>
      <Plus size={32} />
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
        <Stack.Screen options={{ title: ' ' }} />
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
