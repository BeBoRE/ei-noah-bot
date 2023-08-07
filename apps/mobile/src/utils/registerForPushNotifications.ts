import { setNotificationChannelAsync, AndroidImportance, getPermissionsAsync, requestPermissionsAsync, getExpoPushTokenAsync } from "expo-notifications";
import { Platform } from "react-native";
import { isDevice } from 'expo-device'
import baseConfig from "@ei/tailwind-config";

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await setNotificationChannelAsync('default', {
      name: 'default',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: `${baseConfig.theme.colors.primary.DEFAULT}CA`,
    });
  }

  if (isDevice) {
    const { status: existingStatus } = await getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = (await getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export default registerForPushNotificationsAsync;
