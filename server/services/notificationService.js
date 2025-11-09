const Notification = require('../models/Notification');
const User = require('../models/User');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

class NotificationService {
  // Send push notification
  async sendPushNotification(pushToken, title, message, data = {}) {
    try {
      if (!Expo.isExpoPushToken(pushToken)) {
        console.log(`Invalid Expo push token: ${pushToken}`);
        return false;
      }

      const notification = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: message,
        data: data,
        channelId: 'default'
      };

      const receipt = await expo.sendPushNotificationsAsync([notification]);
      
      if (receipt[0]?.status === 'ok') {
        console.log('✅ Push notification sent successfully');
        return true;
      } else {
        console.log('❌ Failed to send push notification:', receipt);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  // Create notification for report creation
  async createReportCreatedNotification(userId, reportId, reportDetails) {
    const title = '📝 Waste Report Submitted';
    const message = `Your ${reportDetails.type} report has been submitted successfully. We'll process it soon!`;
    
    return await this._createNotification(
      userId, 
      title, 
      message, 
      'report_created', 
      reportId
    );
  }

  // Create notification for report processing
  async createReportProcessedNotification(userId, reportId, result) {
    const title = '✅ Report Processed';
    const message = `Your waste report has been processed. Result: ${result}`;
    
    return await this._createNotification(
      userId, 
      title, 
      message, 
      'report_processed', 
      reportId
    );
  }

  // Create recycling tip notification
  async createRecyclingTipNotification(userId, tip) {
    const title = '🌱 Recycling Tip';
    const message = tip;
    
    return await this._createNotification(
      userId, 
      title, 
      message, 
      'recycling_tips'
    );
  }

  // Create system notification
  async createSystemNotification(userId, title, message) {
    return await this._createNotification(
      userId, 
      title, 
      message, 
      'system'
    );
  }

  // Generic notification creation method
  async _createNotification(userId, title, message, type, relatedReport = null) {
    try {
      // Check if user exists and has notifications enabled
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user wants this type of notification
      if (!this._shouldSendNotification(user, type)) {
        console.log(`Notification type ${type} disabled for user ${userId}`);
        return null;
      }

      // Create the notification in database
      const notification = new Notification({
        user: userId,
        title,
        message,
        type,
        relatedReport
      });

      await notification.save();

      // Send push notification if user has push token and notifications are enabled
      if (user.pushToken && user.notificationsEnabled) {
        await this.sendPushNotification(user.pushToken, title, message, {
          notificationId: notification._id,
          type: type,
          screen: 'Notifications',
          relatedReport: relatedReport
        });
      }

      console.log(`✅ Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Check user preferences for notification types
  _shouldSendNotification(user, type) {
    // If global notifications are disabled, don't send any
    if (user.notificationsEnabled === false) {
      return false;
    }

    const { notificationPreferences } = user;
    
    switch (type) {
      case 'report_created':
      case 'report_processed':
        return notificationPreferences?.reportUpdates !== false;
      case 'recycling_tips':
        return notificationPreferences?.recyclingTips !== false;
      case 'system':
        return notificationPreferences?.systemNotifications !== false;
      default:
        return true;
    }
  }

  // Get user's unread notification count
  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      user: userId,
      read: false
    });
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true } }
    );
  }

  // Get user's notification preferences
  async getUserPreferences(userId) {
    const user = await User.findById(userId).select('notificationsEnabled notificationPreferences');
    return {
      notificationsEnabled: user.notificationsEnabled,
      preferences: user.notificationPreferences
    };
  }

  // Send notification to multiple users (for admin/broadcast)
  async broadcastNotification(userIds, title, message, type = 'system') {
    try {
      const results = [];
      
      for (const userId of userIds) {
        try {
          const notification = await this._createNotification(userId, title, message, type);
          if (notification) {
            results.push({ userId, success: true, notificationId: notification._id });
          } else {
            results.push({ userId, success: false, error: 'Notification not created' });
          }
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();