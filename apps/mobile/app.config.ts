import type { ExpoConfig } from '@expo/config';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const defineConfig = (): ExpoConfig => {
  const appVarient = process.env.APP_VARIANT;

  const baseName = 'ei Noah';
  const baseIdentifier = 'net.sweaties.eiapp';

  const name = appVarient
    ? `${baseName} (${capitalize(appVarient)})`
    : baseName;
  const identifier = appVarient
    ? `${baseIdentifier}.${appVarient}`
    : baseIdentifier;

  return {
    name,
    slug: 'ei',
    scheme: 'ei',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/ei.png',
    userInterfaceStyle: 'dark',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0C0403',
    },
    web: {
      bundler: 'metro',
    },
    updates: {
      url: 'https://u.expo.dev/f01c56f4-e11b-41fd-a1bb-e70cca535c3c',
    },
    runtimeVersion: {
      policy: 'sdkVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: identifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
        UIStatusBarStyle: 'UIStatusBarStyleLightContent',
      },
      buildNumber: '10',
      icon: './assets/icon.png',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/ei.png',
        backgroundColor: '#fbefd5',
      },
      package: identifier,
      googleServicesFile: './google-services.json',
      icon: './assets/adaptive-icon.png',
    },
    extra: {
      eas: {
        projectId: 'f01c56f4-e11b-41fd-a1bb-e70cca535c3c',
      },
    },
    experiments: {
      tsconfigPaths: true,
    },
    plugins: [
      'expo-font',
      'expo-router',
      './expo-plugins/with-modify-gradle.js',
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '13.4',
          },
          android: {
            // these values were tested with Expo SDK 48
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 23,
            buildToolsVersion: '33.0.0',
            kotlinVersion: '1.6.20',
          },
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          organization: 'bebore',
          project: 'ei',
        },
      ],
    ],
  } satisfies ExpoConfig;
};

export default defineConfig;
