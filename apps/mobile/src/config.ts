import _ from "lodash";

export type Config = {
  pusher: {
    appId: string;
    appKey: string;
    cluster: string;
  };
  api: {
    url?: string | null;
  };
  discord: {
    clientId: string;
  };
}

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type DevelopmentConfig = DeepPartial<Config>;

let developmentConfig : DevelopmentConfig | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  developmentConfig = require("./config.development.ts").default;
} catch (e) {
  developmentConfig = null;
}

if (developmentConfig) console.log("Using development config");

const config : Config = _.merge({
  pusher: {
    appId: process.env.EXPO_PUBLIC_PUSHER_APP_ID || "1645825",
    appKey: process.env.EXPO_PUBLIC_PUSHER_KEY || "e53b6fdba8cac687678b",
    cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "eu",
  }, 
  api: {
    url: process.env.EXPO_PUBLIC_VERCEL_URL || "https://ei.sweaties.net"
  },
  discord: {
    clientId: process.env.EXPO_PUBLIC_CLIENT_ID || "730913870805336195"
  }
}, developmentConfig)

export default config;
