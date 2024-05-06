import baseConfig from '@ei/tailwind-config';
import { Stack } from 'expo-router';

function RolesLayout() {
  return <Stack screenOptions={{
    headerBackTitleVisible: false,
    headerTitleStyle: {color: baseConfig.theme.colors.primary['500']}
  }}/>;
}

export default RolesLayout;
