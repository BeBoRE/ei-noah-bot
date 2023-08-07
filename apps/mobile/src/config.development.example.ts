import { DevelopmentConfig } from "./config";

const developmentConfig : DevelopmentConfig = {
  pusher: {
    appId: process.env.EXPO_PUBLIC_PUSHER_APP_ID,
    appKey: process.env.EXPO_PUBLIC_PUSHER_KEY,
    cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER
  }, 
  api: {
    // Using null here will cause the app to use your local machine's IP address
    url: null
  },
  discord: {
    clientId: process.env.EXPO_PUBLIC_CLIENT_ID
  }
}

export default developmentConfig;
