import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { navigateNested } from '../navigation/navigationRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useAppNotifications() {
  useEffect(() => {
    let isMounted = true;

    const setupNotifications = async () => {
      if (Platform.OS === 'web') return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      // Schedule reminders
      await scheduleReminders();
    };

    setupNotifications();

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'AddTransaction') {
        navigateNested('Main', 'AddTransaction', { initialType: 'expense' });
      }
    });

    return () => {
      isMounted = false;
      responseListener.remove();
    };
  }, []);

  const scheduleReminders = async () => {
    // Clear any existing scheduled notifications to avoid duplicates if we change the schedule
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 12 PM Reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Midday Check-in ☀️',
        body: 'Have you tracked your lunch or coffee expenses yet? Tap to log them!',
        data: { screen: 'AddTransaction' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 0,
      },
    });

    // 8 PM Reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Wrap-up 🌙',
        body: 'Log your expenses for today to keep your streak going!',
        data: { screen: 'AddTransaction' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });

    // 8 PM Reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Wrap-up 🌙',
        body: 'Log your expenses for today to keep your streak going!',
        data: { screen: 'AddTransaction' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  };
}
