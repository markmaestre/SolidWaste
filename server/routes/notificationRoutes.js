const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { Expo } = require('expo-server-sdk');

// Create Expo instance
const expo = new Expo();

// Push notification service
const sendPushNotification = async (pushToken, title, message, data = {}) => {
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
};

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const notifications = await Notification.find({ user: req.user.id })
      .populate('relatedReport')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments({ user: req.user.id });
    
    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get notification preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationsEnabled notificationPreferences pushToken');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      notificationsEnabled: user.notificationsEnabled,
      reportUpdates: user.notificationPreferences?.reportUpdates ?? true,
      recyclingTips: user.notificationPreferences?.recyclingTips ?? true,
      systemNotifications: user.notificationPreferences?.systemNotifications ?? true,
      pushToken: user.pushToken
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Create new notification (for internal use)
router.post('/', auth, async (req, res) => {
  try {
    const { title, message, type, relatedReport } = req.body;

    const notification = new Notification({
      user: req.user.id,
      title,
      message,
      type: type || 'system',
      relatedReport: relatedReport || null
    });

    await notification.save();
    
    await notification.populate('relatedReport');

    // Send push notification if user has push token and notifications are enabled
    const user = await User.findById(req.user.id);
    if (user && user.pushToken && user.notificationsEnabled) {
      console.log('📱 Sending push notification to:', user.pushToken);
      await sendPushNotification(user.pushToken, title, message, {
        notificationId: notification._id,
        type: type || 'system',
        screen: 'Notifications'
      });
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Update user's push token
router.post('/push-token', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ error: 'Push token is required' });
    }

    // Update user's push token
    await User.findByIdAndUpdate(req.user.id, { 
      pushToken: pushToken 
    });

    console.log('✅ Push token updated for user:', req.user.id);
    res.json({ success: true, message: 'Push token updated successfully' });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({ error: 'Failed to update push token' });
  }
});

// Update user's notification preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { notificationsEnabled, reportUpdates, recyclingTips, systemNotifications } = req.body;

    const updateData = {};
    
    if (typeof notificationsEnabled !== 'undefined') {
      updateData.notificationsEnabled = notificationsEnabled;
    }
    
    if (typeof reportUpdates !== 'undefined' || typeof recyclingTips !== 'undefined' || typeof systemNotifications !== 'undefined') {
      updateData.notificationPreferences = {};
      
      if (typeof reportUpdates !== 'undefined') {
        updateData.notificationPreferences.reportUpdates = reportUpdates;
      }
      if (typeof recyclingTips !== 'undefined') {
        updateData.notificationPreferences.recyclingTips = recyclingTips;
      }
      if (typeof systemNotifications !== 'undefined') {
        updateData.notificationPreferences.systemNotifications = systemNotifications;
      }
    }

    await User.findByIdAndUpdate(req.user.id, updateData);

    res.json({ 
      success: true, 
      message: 'Notification preferences updated successfully',
      notificationsEnabled: updateData.notificationsEnabled !== undefined ? updateData.notificationsEnabled : undefined,
      reportUpdates: updateData.notificationPreferences?.reportUpdates,
      recyclingTips: updateData.notificationPreferences?.recyclingTips,
      systemNotifications: updateData.notificationPreferences?.systemNotifications
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Get notification statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments({ user: req.user.id });
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });

    res.json({
      total: totalNotifications,
      unread: unreadCount
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Clear all notifications
router.delete('/', auth, async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });

    res.json({ success: true, message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

module.exports = router;