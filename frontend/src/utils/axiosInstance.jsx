import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosInstance = axios.create({
  baseURL: 'http://10.136.44.73:5000/api',
  // baseURL: 'https://solidwaste-ijco.onrender.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log(
          `🔐 Token attached to ${config.method?.toUpperCase()} ${config.url}`
        );
      } else {
        console.log(
          `⚠️ No token found for ${config.method?.toUpperCase()} ${config.url}`
        );
      }
    } catch (error) {
      console.error('❌ Error getting token:', error);
    }

    console.log(
      `🚀 ${config.method?.toUpperCase()} ${config.url}`,
      config.data ?? config.params ?? {}
    );

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(
      `✅ ${response.config.method?.toUpperCase()} ${response.config.url} - Success`
    );

    return response;
  },
  async (error) => {
    console.error('❌ Response Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Unauthorized
    if (error.response?.status === 401) {
      console.log('🔐 Session expired, clearing storage...');

      try {
        await AsyncStorage.multiRemove([
          'userToken',
          'userInfo',
        ]);
      } catch (storageError) {
        console.error('❌ Storage clear error:', storageError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;