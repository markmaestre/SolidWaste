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
};

// Register User
export const registerUser = createAsyncThunk('users/register', async (formData, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/register', formData);
    return res.data.message;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

// Login User
export const loginUser = createAsyncThunk('users/login', async ({ email, password }, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/login', { email, password });
    return res.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

// Edit Profile - UPDATED
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
     
      // Edit Profile - UPDATED
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
  setCredentials
} = authSlice.actions;

export default authSlice.reducer;