import type { ExpoConfig } from "@expo/config";

const defineConfig = (): ExpoConfig => ({
  name: "ei Noah",
  slug: "ei",
  scheme: "ei",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/ei.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/ei.png",
    resizeMode: "contain",
    backgroundColor: "#fbefd5",
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "net.sweaties.eiapp",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/ei.png",
      backgroundColor: "#fbefd5",
    },
  },
  extra: {
    eas: {
      projectId: "f01c56f4-e11b-41fd-a1bb-e70cca535c3c"
    }
  },
  experiments: {
    tsconfigPaths: true,
  },
  plugins: ["./expo-plugins/with-modify-gradle.js"],
});

export default defineConfig;
