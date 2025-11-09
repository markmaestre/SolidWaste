import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

const initialState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  users: [],
  emailCheckLoading: false,
  emailCheckError: null,
  profileUpdateLoading: false,
  
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
    return res.data.message;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

// Login User - UPDATED WITH PUSH TOKEN
export const loginUser = createAsyncThunk('users/login', async ({ email, password, pushToken }, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/login', { 
      email, 
      password, 
      pushToken 
    });
    return res.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Login failed');
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
            Authorization: token,
          },
        }
      );

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update push token');
    }
  }
);

// Edit Profile
export const editProfile = createAsyncThunk('users/editProfile', async (formData, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    console.log('🔄 Sending profile update request...');
    console.log('📤 FormData contents:');
    
    // Log FormData contents for debugging
    for (let [key, value] of formData.entries()) {
      if (key === 'profile' && value && value.startsWith('data:image')) {
        console.log(`  ${key}: [Base64 Image Data - ${value.length} chars]`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    const res = await axiosInstance.put('/users/profile', formData, {
      headers: {
        Authorization: token,
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('✅ Profile update response:', res.data);
    return res.data.user;
  } catch (error) {
    console.error('❌ Profile update error in thunk:', error);
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Profile update failed');
  }
});

// Get Current User Profile
export const getCurrentUser = createAsyncThunk('users/getCurrentUser', async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    const res = await axiosInstance.get('/users/me', {
      headers: {
        Authorization: token,
      },
    });

    return res.data.user;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch user data');
  }
});

// Fetch All Users (Admin)
export const fetchAllUsers = createAsyncThunk('users/fetchAllUsers', async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    const res = await axiosInstance.get('/users/all-users', {
      headers: {
        Authorization: token,
      },
    });

    return res.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
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
          Authorization: token,
        },
      });

      return res.data.user;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update user status');
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
      return rejectWithValue(error.response?.data?.message || 'Error checking email');
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
          Authorization: token,
        },
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to submit feedback');
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
          Authorization: token,
        },
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch feedback');
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
          Authorization: token,
        },
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch all feedback');
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
            Authorization: token,
          },
        }
      );

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update feedback status');
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
          Authorization: token,
        },
      });

      return res.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to fetch feedback statistics');
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
      state.users = [];
      state.emailCheckError = null;
      state.error = null;
      // Clear feedback data on logout
      state.feedback = [];
      state.allFeedback = [];
      state.feedbackStats = null;
      state.feedbackSubmitSuccess = false;
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
    },
    // Push token reducer
    setPushToken: (state, action) => {
      if (state.user) {
        state.user.pushToken = action.payload;
      }
    },
    // Feedback reducers
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
  },
  extraReducers: (builder) => {
    builder
      // ==================== AUTH CASES ====================
      
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
      
      // Login User
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update Push Token
      .addCase(updatePushToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(updatePushToken.fulfilled, (state, action) => {
        state.loading = false;
        if (state.user) {
          state.user.pushToken = action.payload.user.pushToken;
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
        // Also update in users list if user is admin viewing users
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
        // If updated user is the current user, update local state too
        if (state.user && state.user.id === updatedUser._id) {
          state.user = { ...state.user, status: updatedUser.status };
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

      // ==================== FEEDBACK & SUPPORT CASES ====================

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
        
        // Update in user's feedback list
        state.feedback = state.feedback.map((item) =>
          item._id === updatedFeedback._id ? updatedFeedback : item
        );
        
        // Update in admin's all feedback list
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
} = authSlice.actions;

export default authSlice.reducer;