import { Stack } from 'expo-router';

import baseConfig from '@ei/tailwind-config';

function RolesLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitleVisible: false,
        headerTitleStyle: { color: baseConfig.theme.colors.primary['500'] },
        title: ' ',
      }}
    />
  );
}

export default RolesLayout;
