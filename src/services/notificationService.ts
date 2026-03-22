import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use a more defensive way to import expo-notifications to avoid crashes if native module is missing
let Notifications: any;
try {
  Notifications = require('expo-notifications');
  
  // Configure how notifications are handled when the app is in the foreground
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e) {
  console.warn('Notifications module failed to load:', e);
}

export const NOTIFICATION_CHANNEL_ID = 'estimator-notifications';

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return;
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Estimator Notifications',
      importance: Notifications.AndroidImportance.MAX, // Leads to "Large" prominent notification
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Learn more about projectId in app.json at https://docs.expo.dev/versions/latest/config/app/#projectid
    try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
            throw new Error('Project ID not found in app config');
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Push Token:', token);
    } catch (e) {
        console.error('Error getting push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendLocalTestNotification() {
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Notification 🔔",
      body: 'This is how your notifications will appear. High importance ensures they are prominent!',
      data: { data: 'test data' },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null, // send immediately
  });
}
