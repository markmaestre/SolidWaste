// utils/axiosInstance.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: 'http://192.168.1.46:4000/api', // Your backend URL
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(`🔐 Token attached to ${config.method?.toUpperCase()} ${config.url}`);
      } else {
        console.log(`⚠️ No token found for ${config.method?.toUpperCase()} ${config.url}`);
      }
    } catch (error) {
      console.error('❌ Error getting token from storage:', error);
    }
    
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - Success`);
    return response;
  },
  async (error) => {
    console.error('❌ Response error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log('🔐 Token expired or invalid, clearing storage...');
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        // You can also dispatch a logout action here if using Redux
      } catch (storageError) {
        console.error('❌ Error clearing storage:', storageError);
      }
      
      // Optionally redirect to login screen
      // You might want to use navigation here if available
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;