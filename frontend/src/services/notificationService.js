import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import axiosInstance from '../utils/axiosInstance';

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
    if (this.isConfigured) return { success: true };

    try {
      await this.configureNotifications();
      
      // Request permissions and get token
      const hasPermission = await this.requestPermissions();
      let token = null;
      
      if (hasPermission) {
        token = await this.getPushToken();
        if (token) {
          // Register token with backend
          await this.registerPushTokenWithBackend(token);
        }
      }
      
      this.isConfigured = true;
      return { success: true, token };
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return { success: false, error: error.message };
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

  // Register push token with backend
  registerPushTokenWithBackend = async (token) => {
    try {
      const response = await axiosInstance.post('/notifications/push-token', {
        pushToken: token
      });
      
      console.log('✅ Push token registered with backend');
      return true;
    } catch (error) {
      console.error('❌ Failed to register push token with backend:', error);
      return false;
    }
  };

  // Update notification preferences
  updateNotificationPreferences = async (preferences) => {
    try {
      const response = await axiosInstance.put('/notifications/preferences', preferences);
      console.log('✅ Notification preferences updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update notification preferences:', error);
      return false;
    }
  };

  // Show local notification
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