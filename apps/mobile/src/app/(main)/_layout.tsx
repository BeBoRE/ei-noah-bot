import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { Volume2 } from 'lucide-react-native';
import { getUserImageUrl } from 'src/utils/cdn';

import { api } from '@ei/react-shared';
import baseConfig from '@ei/tailwind-config';

function UserIcon() {
  const { data: user } = api.user.me.useQuery();

  if (!user || !user.avatar) {
    return null;
  }

  return (
    <Image
      source={{ uri: getUserImageUrl(user) }}
      className="h-6 w-6 rounded-full"
    />
  );
}

function LobbyIcon({ color }: { color: string }) {
  return <Volume2 color={color} size={20} className="h-1 w-1" />;
}

function TabRoot() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: baseConfig.theme.colors.primary[700],
        tabBarActiveTintColor: baseConfig.theme.colors.primary[50],
        tabBarStyle: {
          backgroundColor: baseConfig.theme.colors.primary[900],
          borderTopColor: baseConfig.theme.colors.primary[900],
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lobby',
          tabBarIcon: LobbyIcon,
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          title: 'You',
          tabBarIcon: UserIcon,
        }}
      />
    </Tabs>
  );
}

export default TabRoot;
