import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { getLastNotificationResponseAsync } from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UpdateEventType, useUpdateEvents } from 'expo-updates';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { toast } from 'burnt';
import type { SFSymbol } from 'sf-symbols-typescript';
import { AuthProvider } from 'src/context/auth';
import { onAcceptResponse } from 'src/hooks/useNotifications';

import baseConfig from '@ei/tailwind-config';

import { TRPCProvider } from '../utils/api';

(async () => {
  const response = await getLastNotificationResponseAsync();
  onAcceptResponse(response);
})();

// This is the main layout of the app
// It wraps your pages with the providers they need
function RootLayout() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useFonts({
    'gg-sans': require('../../assets/fonts/ggsans-Medium.ttf'),
  });

  useUpdateEvents(({ type }) => {
    if (type === UpdateEventType.UPDATE_AVAILABLE) {
      toast({
        title: 'Update available',
        message: 'Restart the app to update',
        preset: 'custom',
        icon: {
          ios: {
            name: 'arrow.down.app' satisfies SFSymbol,
            color: baseConfig.theme.colors.primary.DEFAULT,
          },
        },
        haptic: 'success',
      });
    }
  });

  return (
    <>
      <AuthProvider>
        <TRPCProvider>
          <SafeAreaProvider>
            {/*
            The Stack component displays the current page.
            It also allows you to configure your screens
          */}
            <ThemeProvider
              value={{
                ...DarkTheme,
                colors: {
                  ...DarkTheme.colors,
                  ...baseConfig.theme.colors,
                  text: baseConfig.theme.colors.background,
                  primary: baseConfig.theme.colors.primary.DEFAULT,
                },
              }}
            >
              <Stack
                screenOptions={{
                  headerStyle: {
                    backgroundColor: baseConfig.theme.colors.primary.DEFAULT,
                  },
                }}
              />
            </ThemeProvider>
          </SafeAreaProvider>
        </TRPCProvider>
      </AuthProvider>
      <StatusBar style="dark" />
    </>
  );
}

export default RootLayout;
