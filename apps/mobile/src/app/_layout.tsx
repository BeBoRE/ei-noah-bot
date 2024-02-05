import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Stack, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { UpdateEventType, useUpdateEvents } from 'expo-updates';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { toast } from 'burnt';
import { HeaderButtonsProvider } from 'react-navigation-header-buttons';
import type { SFSymbol } from 'sf-symbols-typescript';
import { AuthProvider } from 'src/context/auth';
import { routingInstrumentation } from 'src/utils/sentry';

import baseConfig from '@ei/tailwind-config';

import { TRPCProvider } from '../utils/api';

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

  const navigationContainerRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationContainerRef) {
      routingInstrumentation.registerNavigationContainer(
        navigationContainerRef,
      );
    }
  }, [navigationContainerRef]);

  return (
    <>
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
                  },
                }}
              >
                <GestureHandlerRootView className="flex-1">
                  <Stack
                    screenOptions={{
                      headerStyle: {
                        backgroundColor:
                          baseConfig.theme.colors.primary.DEFAULT,
                      },
                    }}
                  />
                </GestureHandlerRootView>
              </ThemeProvider>
            </SafeAreaProvider>
          </HeaderButtonsProvider>
        </TRPCProvider>
      </AuthProvider>
      <StatusBar style="dark" />
    </>
  );
}

export default Sentry.wrap(RootLayout);
