import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class ExpoNotificationService {
  constructor() {
    this.isConfigured = false;
  }

  // Initialize notifications
  initialize = async () => {
    if (this.isConfigured) return true;

    try {
      await this.configureNotifications();
      this.isConfigured = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  };

  // Configure notification settings
  configureNotifications = async () => {
    // Set notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }
  };

  // Check if device can receive notifications
  canReceiveNotifications = async () => {
    if (!Device.isDevice) {
      console.warn('Must use physical device for Push Notifications');
      return false;
    }

    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  };

  // Request notification permissions
  requestPermissions = async () => {
    if (!Device.isDevice) {
      Alert.alert('Warning', 'Must use physical device for Push Notifications');
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notification Permission Required',
          'Please enable notifications in settings to receive updates about your waste reports',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Notifications.getPermissionsAsync() }
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  // Get push token
  getPushToken = async () => {
    try {
      if (!(await this.canReceiveNotifications())) {
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      console.log('📱 Push token obtained:', token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  // Show local notification (lumalabas sa TOP ng phone)
  showLocalNotification = async (title, message, data = {}) => {
    try {
      console.log('🔔 Scheduling notification:', title, message);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: message,
          data: data,
          sound: true,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });

      console.log('✅ Notification scheduled successfully');
      return true;
    } catch (error) {
      console.error('❌ Error showing notification:', error);
      
      // Fallback to alert if notification fails
      Alert.alert(title, message);
      return false;
    }
  };

  // Test notification
  testNotification = () => {
    this.showLocalNotification(
      '🔔 WasteWise Test', 
      'This is a test notification from WasteWise!',
      { type: 'test', screen: 'Notifications' }
    );
  };

  // Different notification types with different sounds/vibrations
  showSuccessNotification = (title, message) => {
    return this.showLocalNotification(`✅ ${title}`, message, { type: 'success' });
  };

  showWarningNotification = (title, message) => {
    return this.showLocalNotification(`⚠️ ${title}`, message, { type: 'warning' });
  };

  showErrorNotification = (title, message) => {
    return this.showLocalNotification(`❌ ${title}`, message, { type: 'error' });
  };

  // Schedule notification for later
  scheduleNotification = (title, message, date, data = {}) => {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data,
        sound: true,
      },
      trigger: date,
    });
  };

  // Cancel all scheduled notifications
  cancelAllNotifications = () => {
    return Notifications.cancelAllScheduledNotificationsAsync();
  };

  // Get all scheduled notifications
  getScheduledNotifications = () => {
    return Notifications.getAllScheduledNotificationsAsync();
  };

  // Set badge count (iOS)
  setBadgeCount = (count) => {
    return Notifications.setBadgeCountAsync(count);
  };
}

export default new ExpoNotificationService();