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
      return result;
    } catch (error) {
      console.error('❌ Notification initialization failed:', error);
      return rejectWithValue(error.message || 'Failed to initialize notifications');
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
    lastNotification: null
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
      
      // Show local notification when new one is added
      const { title, message, type } = newNotification;
      console.log('🔄 Dispatching Expo notification:', title, message);
      
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
    // Test functions using Expo Notifications
    testExpoNotification: (state) => {
      console.log('🧪 Testing Expo notification from slice...');
      notificationService.testNotification();
    },
    simulateReportCreated: (state) => {
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
      notificationService.showWarningNotification(newNotification.title, newNotification.message);
    },
    simulateReportProcessed: (state) => {
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
      notificationService.showSuccessNotification(newNotification.title, newNotification.message);
    },
    simulateRecyclingTip: (state) => {
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
      notificationService.showLocalNotification(newNotification.title, newNotification.message);
    },
    clearLastNotification: (state) => {
      state.lastNotification = null;
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
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter(n => !n.read).length;
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
        }
      })
      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })
      // Initialize notifications
      .addCase(initializeNotifications.fulfilled, (state, action) => {
        state.notificationEnabled = action.payload.success;
        state.pushToken = action.payload.token;
        console.log('✅ Notifications state updated:', {
          enabled: state.notificationEnabled,
          token: state.pushToken ? `${state.pushToken.substring(0, 20)}...` : 'null'
        });
      })
      .addCase(initializeNotifications.rejected, (state, action) => {
        state.notificationEnabled = false;
        state.pushToken = null;
        state.error = action.payload;
        console.log('❌ Notifications initialization failed:', action.payload);
      });
  }
});

export const { 
  clearError, 
  addNotification, 
  updateUnreadCount, 
  setPushToken,
  setNotificationEnabled,
  testExpoNotification,
  simulateReportCreated,
  simulateReportProcessed,
  simulateRecyclingTip,
  clearLastNotification
} = notificationSlice.actions;
export default notificationSlice.reducer;