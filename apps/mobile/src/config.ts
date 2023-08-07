let developmentConfig : Config | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  developmentConfig = require("config.development").default;
} catch (e) {
  developmentConfig = null;
}

type Config = {
  pusher: {
    appId: string;
    appKey: string;
    cluster: string;
  };
  api: {
    url: string;
  };
  discord: {
    clientId: string;
  };
}

const config : Config = {
  pusher: {
    appId: process.env.EXPO_PUBLIC_PUSHER_APP_ID || "1645825",
    appKey: process.env.EXPO_PUBLIC_PUSHER_KEY || "e53b6fdba8cac687678b",
    cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "eu",
    ...developmentConfig?.pusher
  }, 
  api: {
    url: process.env.EXPO_PUBLIC_VERCEL_URL || "https://ei.sweaties.net",
    ...developmentConfig?.api
  },
  discord: {
    clientId: process.env.EXPO_PUBLIC_CLIENT_ID || "730913870805336195",
    ...developmentConfig?.discord
  }
}

export default config;
