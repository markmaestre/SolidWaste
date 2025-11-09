import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';  
import notificationService from '../../services/notificationService';

export const getNotifications = createAsyncThunk(
  'notification/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/notifications');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark all as read');
    }
  }
);

// Initialize notifications
export const initializeNotifications = createAsyncThunk(
  'notification/initialize',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🚀 Initializing notifications in slice...');
      const result = await notificationService.initialize();
      console.log('✅ Notification initialization result:', result);
      
      // Get user preferences from backend
      try {
        const preferencesResponse = await axiosInstance.get('/notifications/preferences');
        result.preferences = preferencesResponse.data;
        console.log('✅ User preferences loaded:', result.preferences);
      } catch (prefError) {
        console.log('⚠️ Could not load preferences, using defaults');
        result.preferences = {
          notificationsEnabled: true,
          reportUpdates: true,
          recyclingTips: true,
          systemNotifications: true
        };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Notification initialization failed:', error);
      return rejectWithValue(error.message || 'Failed to initialize notifications');
    }
  }
);

// Update notification preferences
export const updateNotificationPreferences = createAsyncThunk(
  'notification/updatePreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to update preferences');
    }
  }
);

// Register push token with backend
export const registerPushToken = createAsyncThunk(
  'notification/registerPushToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = getState().notification.pushToken;
      if (!token) {
        throw new Error('No push token available');
      }
      
      const response = await axiosInstance.post('/notifications/push-token', {
        pushToken: token
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to register push token');
    }
  }
);

// Get notification statistics
export const getNotificationStats = createAsyncThunk(
  'notification/getStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/notifications/stats');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch notification stats');
    }
  }
);

// Delete notification
export const deleteNotification = createAsyncThunk(
  'notification/delete',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/notifications/${notificationId}`);
      return { notificationId, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete notification');
    }
  }
);

// Clear all notifications
export const clearAllNotifications = createAsyncThunk(
  'notification/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete('/notifications');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to clear notifications');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    pushToken: null,
    notificationEnabled: false,
    lastNotification: null,
    notificationPreferences: {
      notificationsEnabled: true,
      reportUpdates: true,
      recyclingTips: true,
      systemNotifications: true
    },
    stats: {
      total: 0,
      unread: 0
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action) => {
      const newNotification = {
        ...action.payload,
        _id: action.payload._id || Date.now().toString(),
        createdAt: action.payload.createdAt || new Date().toISOString()
      };
      
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
      state.lastNotification = newNotification;
      state.stats.unread += 1;
      state.stats.total += 1;
      
      // Show local notification when new one is added
      const { title, message, type } = newNotification;
      console.log('🔄 Dispatching Expo notification:', title, message);
      
      // Check if user wants to receive this type of notification
      if (!state.notificationPreferences.notificationsEnabled) {
        console.log('🔕 Notifications disabled, skipping local notification');
        return;
      }
      
      let shouldShowNotification = true;
      
      switch (type) {
        case 'report_processed':
        case 'report_created':
          shouldShowNotification = state.notificationPreferences.reportUpdates;
          break;
        case 'recycling_tips':
          shouldShowNotification = state.notificationPreferences.recyclingTips;
          break;
        case 'system':
          shouldShowNotification = state.notificationPreferences.systemNotifications;
          break;
      }
      
      if (shouldShowNotification) {
        // Use Expo Notifications service
        switch (type) {
          case 'report_processed':
            notificationService.showSuccessNotification(title, message);
            break;
          case 'report_created':
            notificationService.showWarningNotification(title, message);
            break;
          case 'recycling_tips':
            notificationService.showLocalNotification('🌱 ' + title, message);
            break;
          default:
            notificationService.showLocalNotification(title, message);
        }
      } else {
        console.log(`🔕 Notification type "${type}" disabled by user preferences`);
      }
    },
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    setPushToken: (state, action) => {
      state.pushToken = action.payload;
    },
    setNotificationEnabled: (state, action) => {
      state.notificationEnabled = action.payload;
    },
    updatePreferences: (state, action) => {
      state.notificationPreferences = {
        ...state.notificationPreferences,
        ...action.payload
      };
    },
    // Test functions using Expo Notifications
    testExpoNotification: (state) => {
      console.log('🧪 Testing Expo notification from slice...');
      if (state.notificationPreferences.notificationsEnabled) {
        notificationService.testNotification();
      } else {
        console.log('🔕 Notifications disabled, skipping test');
      }
    },
    simulateReportCreated: (state) => {
      if (!state.notificationPreferences.notificationsEnabled || !state.notificationPreferences.reportUpdates) {
        console.log('🔕 Report notifications disabled, skipping simulation');
        return;
      }
      
      console.log('📝 Simulating report created notification...');
      const newNotification = {
        _id: Date.now().toString(),
        title: '📝 New Waste Report Created',
        message: 'Your waste report has been submitted successfully!',
        type: 'report_created',
        read: false,
        createdAt: new Date().toISOString()
      };
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
      state.lastNotification = newNotification;
      state.stats.unread += 1;
      state.stats.total += 1;
      notificationService.showWarningNotification(newNotification.title, newNotification.message);
    },
    simulateReportProcessed: (state) => {
      if (!state.notificationPreferences.notificationsEnabled || !state.notificationPreferences.reportUpdates) {
        console.log('🔕 Report notifications disabled, skipping simulation');
        return;
      }
      
      console.log('✅ Simulating report processed notification...');
      const newNotification = {
        _id: Date.now().toString(),
        title: '✅ Report Processed',
        message: 'Your waste report has been processed by our team!',
        type: 'report_processed',
        read: false,
        createdAt: new Date().toISOString()
      };
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
      state.lastNotification = newNotification;
      state.stats.unread += 1;
      state.stats.total += 1;
      notificationService.showSuccessNotification(newNotification.title, newNotification.message);
    },
    simulateRecyclingTip: (state) => {
      if (!state.notificationPreferences.notificationsEnabled || !state.notificationPreferences.recyclingTips) {
        console.log('🔕 Recycling tip notifications disabled, skipping simulation');
        return;
      }
      
      console.log('🌱 Simulating recycling tip notification...');
      const newNotification = {
        _id: Date.now().toString(),
        title: '🌱 Recycling Tip',
        message: 'Did you know? Plastic bottles can be recycled into new products!',
        type: 'recycling_tips',
        read: false,
        createdAt: new Date().toISOString()
      };
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
      state.lastNotification = newNotification;
      state.stats.unread += 1;
      state.stats.total += 1;
      notificationService.showLocalNotification(newNotification.title, newNotification.message);
    },
    clearLastNotification: (state) => {
      state.lastNotification = null;
    },
    updateStats: (state, action) => {
      state.stats = {
        ...state.stats,
        ...action.payload
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Get notifications
      .addCase(getNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications || action.payload;
        state.unreadCount = (action.payload.notifications || action.payload).filter(n => !n.read).length;
        
        // Update stats if available
        if (action.payload.total !== undefined) {
          state.stats.total = action.payload.total;
          state.stats.unread = state.unreadCount;
        }
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n._id === action.payload.notification._id);
        if (index !== -1) {
          state.notifications[index].read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          state.stats.unread = state.unreadCount;
        }
      })
      
      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
        state.stats.unread = 0;
      })
      
      // Initialize notifications
      .addCase(initializeNotifications.fulfilled, (state, action) => {
        state.notificationEnabled = action.payload.success;
        state.pushToken = action.payload.token;
        
        // Update preferences if available
        if (action.payload.preferences) {
          state.notificationPreferences = {
            ...state.notificationPreferences,
            ...action.payload.preferences
          };
        }
        
        console.log('✅ Notifications state updated:', {
          enabled: state.notificationEnabled,
          token: state.pushToken ? `${state.pushToken.substring(0, 20)}...` : 'null',
          preferences: state.notificationPreferences
        });
      })
      .addCase(initializeNotifications.rejected, (state, action) => {
        state.notificationEnabled = false;
        state.pushToken = null;
        state.error = action.payload;
        console.log('❌ Notifications initialization failed:', action.payload);
      })
      
      // Update notification preferences
      .addCase(updateNotificationPreferences.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.notificationPreferences = {
          ...state.notificationPreferences,
          ...action.payload
        };
        console.log('✅ Notification preferences updated:', state.notificationPreferences);
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.log('❌ Failed to update preferences:', action.payload);
      })
      
      // Register push token
      .addCase(registerPushToken.fulfilled, (state) => {
        console.log('✅ Push token registered with backend');
      })
      .addCase(registerPushToken.rejected, (state, action) => {
        state.error = action.payload;
        console.log('❌ Failed to register push token:', action.payload);
      })
      
      // Get notification stats
      .addCase(getNotificationStats.fulfilled, (state, action) => {
        state.stats = {
          ...state.stats,
          ...action.payload
        };
      })
      
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const { notificationId } = action.payload;
        state.notifications = state.notifications.filter(n => n._id !== notificationId);
        state.unreadCount = state.notifications.filter(n => !n.read).length;
        state.stats.total = state.notifications.length;
        state.stats.unread = state.unreadCount;
      })
      
      // Clear all notifications
      .addCase(clearAllNotifications.fulfilled, (state) => {
        state.notifications = [];
        state.unreadCount = 0;
        state.stats.total = 0;
        state.stats.unread = 0;
      });
  }
});

export const { 
  clearError, 
  addNotification, 
  updateUnreadCount, 
  setPushToken,
  setNotificationEnabled,
  updatePreferences,
  testExpoNotification,
  simulateReportCreated,
  simulateReportProcessed,
  simulateRecyclingTip,
  clearLastNotification,
  updateStats
} = notificationSlice.actions;
export default notificationSlice.reducer;