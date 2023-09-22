import { DevelopmentConfig } from './config';

const developmentConfig: DevelopmentConfig = {
  api: {
    // Using null here will cause the app to use your local machine's IP address
    url: null,
  },
  discord: {
    clientId: process.env.EXPO_PUBLIC_CLIENT_ID,
  },
};

export default developmentConfig;
