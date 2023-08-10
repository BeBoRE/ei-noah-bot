import type { ExpoConfig } from '@expo/config';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const defineConfig = (): ExpoConfig => {
  const appVarient = process.env.APP_VARIANT;

  const baseName = 'ei Noah';
  const baseIdentifier = 'net.sweaties.eiapp';

  const name = appVarient ? `${baseName} (${capitalize(appVarient)})` : baseName;
  const identifier = appVarient ? `${baseIdentifier}.${appVarient}` : baseIdentifier;

  return {
    name,
    slug: 'ei',
    scheme: 'ei',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/ei.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/ei.png',
      resizeMode: 'contain',
      backgroundColor: '#fbefd5',
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
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/ei.png',
        backgroundColor: '#fbefd5',
      },
      package: identifier,
      googleServicesFile: './google-services.json',
    },
    extra: {
      eas: {
        projectId: 'f01c56f4-e11b-41fd-a1bb-e70cca535c3c',
      },
    },
    experiments: {
      tsconfigPaths: true,
    },
    plugins: ['./expo-plugins/with-modify-gradle.js'],
  };
};

export default defineConfig;
