import _ from 'lodash';

export type Config = {
  api: {
    url?: string | null;
    wsUrl?: string | null;
  };
  discord: {
    clientId: string;
  };
};

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type DevelopmentConfig = DeepPartial<Config>;

let developmentConfig: DevelopmentConfig | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, import/extensions
  developmentConfig = require('./config.development.ts').default;
} catch (e) {
  developmentConfig = null;
}

if (developmentConfig) console.log('Using development config');

const config: Config = _.merge(
  {
    api: {
      url: process.env.EXPO_PUBLIC_VERCEL_URL || 'https://ei.sweaties.net',
      wsUrl: process.env.EXPO_PUBLIC_VERCEL_URL || 'wss://ei.sweaties.net/ws',
    },
    discord: {
      clientId: process.env.EXPO_PUBLIC_CLIENT_ID || '730913870805336195',
    },
  },
  developmentConfig,
);

export default config;
