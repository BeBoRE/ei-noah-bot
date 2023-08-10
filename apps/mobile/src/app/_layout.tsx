import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, DarkTheme } from '@react-navigation/native';

import baseConfig from '@ei/tailwind-config';
import { AuthProvider } from 'src/context/auth';
import { useFonts } from 'expo-font';
import { TRPCProvider } from '../utils/api';

// This is the main layout of the app
// It wraps your pages with the providers they need
function RootLayout() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useFonts({
    'gg-sans': require('../../assets/fonts/ggsans-Medium.ttf'),
  });

  return (
    <AuthProvider>
      <TRPCProvider>
        <SafeAreaProvider>
          {/*
            The Stack component displays the current page.
            It also allows you to configure your screens
          */}
          <ThemeProvider value={{
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors, ...baseConfig.theme.colors, text: baseConfig.theme.colors.background, primary: baseConfig.theme.colors.primary.DEFAULT,
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
          <StatusBar />
        </SafeAreaProvider>
      </TRPCProvider>
    </AuthProvider>
  );
}

export default RootLayout;
