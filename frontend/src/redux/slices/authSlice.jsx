// redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';

const initialState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  users: [],
  emailCheckLoading: false,
  emailCheckError: null,
  profileUpdateLoading: false,
  isAuthenticated: false,
  isRestoring: true,
  
  // Feedback & Support states
  feedback: [],
  feedbackLoading: false,
  feedbackError: null,
  feedbackSubmitLoading: false,
  feedbackSubmitSuccess: false,
  
  // Admin feedback states
  allFeedback: [],
  allFeedbackLoading: false,
  allFeedbackError: null,
  feedbackStats: null,
  feedbackStatsLoading: false,
};

// ==================== AUTH THUNKS ====================

// Register User
export const registerUser = createAsyncThunk('users/register', async (formData, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/register', formData);
    return res.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Registration failed';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Verify Email
export const verifyEmail = createAsyncThunk('users/verifyEmail', async ({ email, verificationCode }, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/verify-email', { email, verificationCode });
    return res.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Verification failed';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Resend Verification Code
export const resendVerificationCode = createAsyncThunk('users/resendVerification', async ({ email }, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/resend-verification', { email });
    return res.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to resend code';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Login User
export const loginUser = createAsyncThunk('users/login', async ({ email, password, pushToken }, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/login', { 
      email, 
      password, 
      pushToken 
    });
    
    if (res.data.token && res.data.user) {
      await AsyncStorage.setItem('userToken', res.data.token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(res.data.user));
      if (pushToken) {
        await AsyncStorage.setItem('userPushToken', pushToken);
      }
    }
    
    return res.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Login failed';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Update Push Token
export const updatePushToken = createAsyncThunk(
  'users/updatePushToken',
  async (pushToken, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const res = await axiosInstance.put('/users/push-token', 
        { pushToken }, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update push token';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Edit Profile
export const editProfile = createAsyncThunk('users/editProfile', async (formData, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;
    
    const submitData = new FormData();
    
    for (let pair of formData.entries()) {
      const key = pair[0];
      const value = pair[1];
      
      if (key === 'fullAddress' || key === 'barangay') {
        continue;
      } else {
        submitData.append(key, value);
      }
    }
    
    const fullAddress = formData.get('fullAddress');
    const barangay = formData.get('barangay');
    
    if (fullAddress || barangay) {
      let combinedAddress = '';
      if (fullAddress && barangay) {
        combinedAddress = `${fullAddress}, ${barangay}`;
      } else if (fullAddress) {
        combinedAddress = fullAddress;
      } else if (barangay) {
        combinedAddress = barangay;
      }
      
      if (combinedAddress) {
        submitData.append('address', combinedAddress);
      }
    }
    
    const directAddress = formData.get('address');
    if (directAddress) {
      submitData.append('address', directAddress);
    }
    
    const res = await axiosInstance.put('/users/profile', submitData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    if (res.data.user) {
      await AsyncStorage.setItem('userInfo', JSON.stringify(res.data.user));
    }

    return res.data.user;
  } catch (error) {
    console.error('❌ Edit profile error:', error.response?.data);
    const errorMessage = error.response?.data?.message || 'Profile update failed';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Get Current User Profile
export const getCurrentUser = createAsyncThunk('users/getCurrentUser', async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    const res = await axiosInstance.get('/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.data.user) {
      await AsyncStorage.setItem('userInfo', JSON.stringify(res.data.user));
    }

    return res.data.user;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch user data';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Fetch All Users (Admin)
export const fetchAllUsers = createAsyncThunk('users/fetchAllUsers', async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    const res = await axiosInstance.get('/users/all-users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch users';
    return thunkAPI.rejectWithValue(errorMessage);
  }
});

// Update User Status
export const updateUserStatus = createAsyncThunk(
  'users/updateUserStatus',
  async ({ id, status }, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const res = await axiosInstance.put(`/users/ban/${id}`, { status }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data.user;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update user status';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Check Email
export const checkEmail = createAsyncThunk(
  'auth/checkEmail',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/users/check-email', { email });
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error checking email';
      return rejectWithValue(errorMessage);
    }
  }
);

// ==================== FORGOT PASSWORD THUNKS ====================

// Request password reset (send verification code)
export const forgotPasswordRequest = createAsyncThunk(
  'auth/forgotPasswordRequest',
  async ({ email }, thunkAPI) => {
    try {
      const res = await axiosInstance.post('/users/forgot-password', { email });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset code';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Verify reset code
export const verifyResetCode = createAsyncThunk(
  'auth/verifyResetCode',
  async ({ email, code }, thunkAPI) => {
    try {
      const res = await axiosInstance.post('/users/verify-reset-code', { email, code });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Invalid or expired code';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Reset password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, code, newPassword }, thunkAPI) => {
    try {
      const res = await axiosInstance.post('/users/reset-password', { email, code, newPassword });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to reset password';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// ==================== FEEDBACK & SUPPORT THUNKS ====================

// Submit Feedback
export const submitFeedback = createAsyncThunk(
  'feedback/submit',
  async (feedbackData, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const res = await axiosInstance.post('/feedback/submit', feedbackData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to submit feedback';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Get User Feedback History
export const getUserFeedback = createAsyncThunk(
  'feedback/getUserFeedback',
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const res = await axiosInstance.get('/feedback/my-feedback', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch feedback';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Get All Feedback (Admin only)
export const getAllFeedback = createAsyncThunk(
  'feedback/getAllFeedback',
  async ({ page = 1, limit = 20 } = {}, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const res = await axiosInstance.get(`/feedback/all?page=${page}&limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch all feedback';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Update Feedback Status (Admin only)
export const updateFeedbackStatus = createAsyncThunk(
  'feedback/updateStatus',
  async ({ feedbackId, status, adminReply }, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const res = await axiosInstance.put(`/feedback/${feedbackId}/status`, 
        { status, adminReply }, 
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to update feedback status';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// Get Feedback Statistics (Admin only)
export const getFeedbackStats = createAsyncThunk(
  'feedback/getStats',
  async (_, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const res = await axiosInstance.get('/feedback/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch feedback statistics';
      return thunkAPI.rejectWithValue(errorMessage);
    }
  }
);

// ==================== RESTORE SESSION ====================
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, thunkAPI) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfo) {
        const user = JSON.parse(userInfo);
        return { token, user };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to restore session:', error);
      return null;
    }
  }
);

// ==================== LOGOUT ====================
export const logoutUserThunk = createAsyncThunk(
  'auth/logout',
  async (_, thunkAPI) => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPushToken']);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.users = [];
      state.emailCheckError = null;
      state.error = null;
      state.feedback = [];
      state.allFeedback = [];
      state.feedbackStats = null;
      state.feedbackSubmitSuccess = false;
      
      AsyncStorage.multiRemove(['userToken', 'userInfo', 'userPushToken']).catch(console.error);
    },
    clearEmailError: (state) => {
      state.emailCheckError = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearProfileUpdateLoading: (state) => {
      state.profileUpdateLoading = false;
    },
    updateUserProfileLocal: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        AsyncStorage.setItem('userInfo', JSON.stringify(state.user)).catch(console.error);
      }
    },
    updateUserInList: (state, action) => {
      const updatedUser = action.payload;
      state.users = state.users.map((user) =>
        user._id === updatedUser._id ? updatedUser : user
      );
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isRestoring = false;
      
      if (action.payload.token && action.payload.user) {
        AsyncStorage.setItem('userToken', action.payload.token).catch(console.error);
        AsyncStorage.setItem('userInfo', JSON.stringify(action.payload.user)).catch(console.error);
      }
    },
    setPushToken: (state, action) => {
      if (state.user) {
        state.user.pushToken = action.payload;
        AsyncStorage.setItem('userInfo', JSON.stringify(state.user)).catch(console.error);
      }
    },
    clearFeedbackError: (state) => {
      state.feedbackError = null;
    },
    clearFeedbackSubmitSuccess: (state) => {
      state.feedbackSubmitSuccess = false;
    },
    clearAllFeedback: (state) => {
      state.allFeedback = [];
      state.feedbackStats = null;
    },
    updateFeedbackInList: (state, action) => {
      const updatedFeedback = action.payload;
      state.feedback = state.feedback.map((item) =>
        item._id === updatedFeedback._id ? updatedFeedback : item
      );
      state.allFeedback = state.allFeedback.map((item) =>
        item._id === updatedFeedback._id ? updatedFeedback : item
      );
    },
    setRestoringComplete: (state) => {
      state.isRestoring = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register User
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Verify Email
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Resend Verification
      .addCase(resendVerificationCode.pending, (state) => {
        state.loading = true;
      })
      .addCase(resendVerificationCode.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resendVerificationCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Login User
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isRestoring = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // Update Push Token
      .addCase(updatePushToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(updatePushToken.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.pushToken = action.payload.user.pushToken;
          AsyncStorage.setItem('userInfo', JSON.stringify(state.user)).catch(console.error);
        }
      })
      .addCase(updatePushToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
     
      // Edit Profile
      .addCase(editProfile.pending, (state) => {
        state.profileUpdateLoading = true;
        state.error = null;
      })
      .addCase(editProfile.fulfilled, (state, action) => {
        state.profileUpdateLoading = false;
        state.user = action.payload;
        state.users = state.users.map((user) =>
          user._id === action.payload.id ? action.payload : user
        );
      })
      .addCase(editProfile.rejected, (state, action) => {
        state.profileUpdateLoading = false;
        state.error = action.payload;
      })
   
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
   
      // Fetch All Users
      .addCase(fetchAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
     
      // Update User Status
      .addCase(updateUserStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedUser = action.payload;
        state.users = state.users.map((user) =>
          user._id === updatedUser._id ? updatedUser : user
        );
        if (state.user && state.user.id === updatedUser._id) {
          state.user = { ...state.user, status: updatedUser.status };
          AsyncStorage.setItem('userInfo', JSON.stringify(state.user)).catch(console.error);
        }
      })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Check Email
      .addCase(checkEmail.pending, (state) => {
        state.emailCheckLoading = true;
        state.emailCheckError = null;
      })
      .addCase(checkEmail.fulfilled, (state) => {
        state.emailCheckLoading = false;
      })
      .addCase(checkEmail.rejected, (state, action) => {
        state.emailCheckLoading = false;
        state.emailCheckError = action.payload;
      })

      // Forgot Password Request
      .addCase(forgotPasswordRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPasswordRequest.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPasswordRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Verify Reset Code
      .addCase(verifyResetCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyResetCode.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(verifyResetCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Submit Feedback
      .addCase(submitFeedback.pending, (state) => {
        state.feedbackSubmitLoading = true;
        state.feedbackSubmitSuccess = false;
        state.feedbackError = null;
      })
      .addCase(submitFeedback.fulfilled, (state, action) => {
        state.feedbackSubmitLoading = false;
        state.feedbackSubmitSuccess = true;
        state.feedback.unshift(action.payload.feedback);
      })
      .addCase(submitFeedback.rejected, (state, action) => {
        state.feedbackSubmitLoading = false;
        state.feedbackSubmitSuccess = false;
        state.feedbackError = action.payload;
      })

      // Get User Feedback History
      .addCase(getUserFeedback.pending, (state) => {
        state.feedbackLoading = true;
        state.feedbackError = null;
      })
      .addCase(getUserFeedback.fulfilled, (state, action) => {
        state.feedbackLoading = false;
        state.feedback = action.payload.feedback;
      })
      .addCase(getUserFeedback.rejected, (state, action) => {
        state.feedbackLoading = false;
        state.feedbackError = action.payload;
      })

      // Get All Feedback (Admin)
      .addCase(getAllFeedback.pending, (state) => {
        state.allFeedbackLoading = true;
        state.allFeedbackError = null;
      })
      .addCase(getAllFeedback.fulfilled, (state, action) => {
        state.allFeedbackLoading = false;
        state.allFeedback = action.payload.feedback;
      })
      .addCase(getAllFeedback.rejected, (state, action) => {
        state.allFeedbackLoading = false;
        state.allFeedbackError = action.payload;
      })

      // Update Feedback Status (Admin)
      .addCase(updateFeedbackStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFeedbackStatus.fulfilled, (state, action) => {
        state.loading = false;
        const updatedFeedback = action.payload.feedback;
        
        state.feedback = state.feedback.map((item) =>
          item._id === updatedFeedback._id ? updatedFeedback : item
        );
        
        state.allFeedback = state.allFeedback.map((item) =>
          item._id === updatedFeedback._id ? updatedFeedback : item
        );
      })
      .addCase(updateFeedbackStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Get Feedback Statistics (Admin)
      .addCase(getFeedbackStats.pending, (state) => {
        state.feedbackStatsLoading = true;
      })
      .addCase(getFeedbackStats.fulfilled, (state, action) => {
        state.feedbackStatsLoading = false;
        state.feedbackStats = action.payload;
      })
      .addCase(getFeedbackStats.rejected, (state, action) => {
        state.feedbackStatsLoading = false;
        state.error = action.payload;
      })
      
      // Restore Session
      .addCase(restoreSession.pending, (state) => {
        state.isRestoring = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isRestoring = false;
        if (action.payload) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isRestoring = false;
        state.isAuthenticated = false;
      })
      
      // Logout
      .addCase(logoutUserThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.users = [];
        state.error = null;
        state.feedback = [];
        state.allFeedback = [];
        state.feedbackStats = null;
      });
  },
});

export const { 
  logoutUser, 
  clearEmailError, 
  clearError, 
  clearProfileUpdateLoading,
  updateUserProfileLocal,
  updateUserInList,
  setCredentials,
  setPushToken,
  clearFeedbackError,
  clearFeedbackSubmitSuccess,
  clearAllFeedback,
  updateFeedbackInList,
  setRestoringComplete,
} = authSlice.actions;

export default authSlice.reducer;