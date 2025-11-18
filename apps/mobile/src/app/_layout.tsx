import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { cssInterop } from 'nativewind';
import { HeaderButtonsProvider } from 'react-navigation-header-buttons';
import { AuthProvider } from 'src/context/auth';
import { TRPCProvider } from 'src/utils/api';

import baseConfig from '@ei/tailwind-config';

import '../../global.css';

cssInterop(Image, { className: 'style' });

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useFonts({
    'gg-sans': require('../../assets/fonts/ggsans-Medium.ttf'),
  });

  return (
    <AuthProvider>
      <TRPCProvider>
        <HeaderButtonsProvider stackType="native">
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
                  border: baseConfig.theme.colors.primary.DEFAULT,
                  background: baseConfig.theme.colors.background,
                  card: baseConfig.theme.colors.background,
                  notification: baseConfig.theme.colors.primary.DEFAULT,
                },
              }}
            >
              <GestureHandlerRootView className="flex flex-1">
                <Stack
                  screenOptions={{
                    headerShown: false,
                    statusBarColor: baseConfig.theme.colors.primary.DEFAULT,
                  }}
                />
              </GestureHandlerRootView>
            </ThemeProvider>
          </SafeAreaProvider>
        </HeaderButtonsProvider>
      </TRPCProvider>
    </AuthProvider>
  );
}
