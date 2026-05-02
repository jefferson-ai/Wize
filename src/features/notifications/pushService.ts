import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});

export async function requestPushPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function scheduleReportNotifications() {
  const hasPermission = await requestPushPermissions();
  if (!hasPermission) return false;

  await cancelReportNotifications(); // Clear existing to prevent duplicates

  // Schedule Weekly Report (Every Sunday at 9:00 AM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Weekly Report Ready 📊',
      body: 'Your spending report for last week is ready to view. Tap to see your top categories and trends.',
      data: { route: 'Insights', tab: 'reports' },
    },
    trigger: {
      type: 'calendar',
      channelId: 'default',
      weekday: 1, // Sunday
      hour: 9,
      minute: 0,
      repeats: true,
    } as any,
  });

  // Schedule Monthly Report (1st of every month at 9:00 AM)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Monthly Report Ready 📈',
      body: 'Your spending report for last month is ready to view! Did you stay within budget?',
      data: { route: 'Insights', tab: 'reports' },
    },
    trigger: {
      type: 'calendar',
      channelId: 'default',
      day: 1,
      hour: 9,
      minute: 0,
      repeats: true,
    } as any,
  });

  return true;
}

export async function cancelReportNotifications() {
  // Cancel all scheduled notifications
  // (Assuming we only use push for reports right now)
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function sendTestNotification() {
  const hasPermission = await requestPushPermissions();
  if (!hasPermission) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification 🔔',
      body: 'This is a test notification from Wize! It works!',
      data: { test: true },
    },
    trigger: {
      type: 'timeInterval',
      seconds: 2,
      repeats: false,
    } as any,
  });
  return true;
}

