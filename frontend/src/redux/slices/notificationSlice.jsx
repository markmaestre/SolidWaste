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

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.unreadCount += 1;
      
      // Show local notification with sound when new one is added
      const { title, message, type } = action.payload;
      console.log('🔄 Dispatching notification with sound:', title, message);
      notificationService.showLocalNotification(title, message, { type });
    },
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    // Add test function with sound
    testNotificationWithSound: (state) => {
      notificationService.testNotification();
    },
    // Simulate different notification types
    simulateReportCreated: (state) => {
      const newNotification = {
        _id: Date.now().toString(),
        title: 'New Waste Report Created',
        message: 'Your waste report has been submitted successfully!',
        type: 'report_created',
        read: false,
        createdAt: new Date().toISOString()
      };
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
      notificationService.showLocalNotification(newNotification.title, newNotification.message);
    },
    simulateReportProcessed: (state) => {
      const newNotification = {
        _id: Date.now().toString(),
        title: 'Report Processed',
        message: 'Your waste report has been processed by our team!',
        type: 'report_processed',
        read: false,
        createdAt: new Date().toISOString()
      };
      state.notifications.unshift(newNotification);
      state.unreadCount += 1;
      notificationService.showLocalNotification(newNotification.title, newNotification.message);
    }
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n._id === action.payload.notification._id);
        if (index !== -1) {
          state.notifications[index].read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      });
  }
});

export const { 
  clearError, 
  addNotification, 
  updateUnreadCount, 
  testNotificationWithSound,
  simulateReportCreated,
  simulateReportProcessed 
} = notificationSlice.actions;
export default notificationSlice.reducer;