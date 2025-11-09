import { Platform } from 'react-native';

class NotificationService {
  constructor() {
    this.configure();
  }

  configure = () => {
    // Simple configuration without Notifee for now
    console.log('Notification service configured');
  };

  showLocalNotification = async (title, message, data = {}) => {
    // Fallback to simple alert for now
    if (Platform.OS === 'android') {
      // Use React Native's built-in ToastAndroid for Android
      try {
        const { ToastAndroid } = require('react-native');
        ToastAndroid.showWithGravity(
          `${title}: ${message}`,
          ToastAndroid.LONG,
          ToastAndroid.TOP
        );
      } catch (error) {
        console.log('ToastAndroid not available:', error);
      }
    } else {
      // For iOS, use Alert
      const { Alert } = require('react-native');
      Alert.alert(title, message);
    }
    
    console.log('Notification:', title, message, data);
  };

  scheduleNotification = (title, message, date, data = {}) => {
    console.log('Scheduled notification:', title, message, date);
    // Fallback to immediate notification
    this.showLocalNotification(title, message, data);
  };

  cancelAllNotifications = () => {
    console.log('All notifications cancelled');
  };
}

export default new NotificationService();