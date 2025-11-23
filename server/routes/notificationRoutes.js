const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { Expo } = require('expo-server-sdk');
const mongoose = require('mongoose');

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

// Middleware to automatically delete notifications older than 30 days
const autoDeleteOldNotifications = async (userId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Permanently delete notifications marked for deletion that are older than 30 days
    const result = await Notification.deleteMany({
      user: userId,
      $or: [
        { 
          markedForDeletion: true,
          markedForDeletionAt: { $lte: thirtyDaysAgo }
        },
        {
          // Also delete very old notifications regardless of read status (optional)
          createdAt: { $lte: thirtyDaysAgo },
          read: true
        }
      ]
    });

    if (result.deletedCount > 0) {
      console.log(`🗑️ Auto-deleted ${result.deletedCount} old notifications for user ${userId}`);
    }

    return result.deletedCount;
  } catch (error) {
    console.error('Auto-delete notifications error:', error);
    return 0;
  }
};

// Get user notifications (excludes soft-deleted ones)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, includeDeleted = false } = req.query;
    
    // Auto-delete old notifications before fetching
    await autoDeleteOldNotifications(req.user.id);
    
    // Build query - exclude soft-deleted notifications by default
    let query = { user: req.user.id };
    if (!includeDeleted) {
      query.markedForDeletion = { $ne: true };
    }
    
    const notifications = await Notification.find(query)
      .populate('relatedReport')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    
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
      user: req.user.id,
      markedForDeletion: { $ne: true } // Don't allow marking soft-deleted notifications as read
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark notification for deletion (soft delete) - will be permanently deleted after 30 days
router.put('/:id/mark-for-deletion', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark for deletion instead of immediate delete
    notification.markedForDeletion = true;
    notification.markedForDeletionAt = new Date();
    await notification.save();

    res.json({ 
      success: true, 
      message: 'Notification marked for deletion. It will be permanently deleted after 30 days.',
      notification 
    });
  } catch (error) {
    console.error('Mark for deletion error:', error);
    res.status(500).json({ error: 'Failed to mark notification for deletion' });
  }
});

// Restore soft-deleted notification
router.put('/:id/restore', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.id,
      markedForDeletion: true
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or not marked for deletion' });
    }

    notification.markedForDeletion = false;
    notification.markedForDeletionAt = null;
    await notification.save();

    res.json({ 
      success: true, 
      message: 'Notification restored successfully',
      notification 
    });
  } catch (error) {
    console.error('Restore notification error:', error);
    res.status(500).json({ error: 'Failed to restore notification' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { 
        user: req.user.id, 
        read: false,
        markedForDeletion: { $ne: true } // Don't update soft-deleted notifications
      },
      { 
        $set: { 
          read: true,
          readAt: new Date()
        } 
      }
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
    // Auto-delete old notifications before getting stats
    await autoDeleteOldNotifications(req.user.id);
    
    const totalNotifications = await Notification.countDocuments({ 
      user: req.user.id,
      markedForDeletion: { $ne: true }
    });
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false,
      markedForDeletion: { $ne: true }
    });
    
    // Count notifications marked for deletion
    const markedForDeletionCount = await Notification.countDocuments({
      user: req.user.id,
      markedForDeletion: true
    });

    res.json({
      total: totalNotifications,
      unread: unreadCount,
      markedForDeletion: markedForDeletionCount
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

// Delete notification immediately (permanent delete - admin/force delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { force = false } = req.query;
    
    let notification;
    
    if (force) {
      // Immediate permanent delete (admin function)
      notification = await Notification.findOneAndDelete({
        _id: req.params.id,
        user: req.user.id
      });
    } else {
      // Soft delete - mark for deletion (normal user function)
      notification = await Notification.findOne({
        _id: req.params.id,
        user: req.user.id
      });
      
      if (notification) {
        notification.markedForDeletion = true;
        notification.markedForDeletionAt = new Date();
        await notification.save();
      }
    }

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const message = force 
      ? 'Notification permanently deleted successfully'
      : 'Notification marked for deletion. It will be permanently deleted after 30 days.';

    res.json({ success: true, message });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Clear all notifications (soft delete)
router.delete('/', auth, async (req, res) => {
  try {
    const { force = false } = req.query;
    
    if (force) {
      // Immediate permanent delete all
      await Notification.deleteMany({ user: req.user.id });
    } else {
      // Mark all for deletion (soft delete)
      await Notification.updateMany(
        { user: req.user.id, markedForDeletion: { $ne: true } },
        { 
          $set: { 
            markedForDeletion: true,
            markedForDeletionAt: new Date()
          } 
        }
      );
    }

    const message = force
      ? 'All notifications permanently deleted successfully'
      : 'All notifications marked for deletion. They will be permanently deleted after 30 days.';

    res.json({ success: true, message });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Get deleted notifications (for recovery purposes)
router.get('/deleted', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const notifications = await Notification.find({ 
      user: req.user.id,
      markedForDeletion: true
    })
      .populate('relatedReport')
      .sort({ markedForDeletionAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments({ 
      user: req.user.id,
      markedForDeletion: true 
    });
    
    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get deleted notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted notifications' });
  }
});

// Cleanup job endpoint (can be called by cron job)
router.post('/cleanup', async (req, res) => {
  try {
    const { secret } = req.body;
    
    // Simple security check - in production use proper authentication
    if (secret !== process.env.CLEANUP_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await Notification.deleteMany({
      markedForDeletion: true,
      markedForDeletionAt: { $lte: thirtyDaysAgo }
    });
    
    console.log(`🧹 Cleanup job: Deleted ${result.deletedCount} old notifications`);
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} old notifications`
    });
  } catch (error) {
    console.error('Cleanup job error:', error);
    res.status(500).json({ error: 'Cleanup job failed' });
  }
});

module.exports = router;