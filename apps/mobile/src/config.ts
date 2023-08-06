const config = {
  pusher: {
    appId: process.env.EXPO_PUBLIC_PUSHER_APP_ID || "1645825",
    appKey: process.env.EXPO_PUBLIC_PUSHER_KEY || "e53b6fdba8cac687678b",
    cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER || "eu",
  }, 
  api: {
    url: process.env.EXPO_PUBLIC_VERCEL_URL,
  },
  discord: {
    clientId: process.env.EXPO_PUBLIC_CLIENT_ID || "730913870805336195",
  }
}

export default config;
