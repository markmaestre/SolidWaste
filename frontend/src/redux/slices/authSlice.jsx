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

export const registerUser = createAsyncThunk('users/register', async (formData, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/register', formData);
    return res.data.message;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Registration failed');
  }
});

export const loginUser = createAsyncThunk('users/login', async ({ email, password }, thunkAPI) => {
  try {
    const res = await axiosInstance.post('/users/login', { email, password });
    return res.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Login failed');
  }
});

// Updated editProfile with image upload support
export const editProfile = createAsyncThunk('users/editProfile', async (formData, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    const res = await axiosInstance.put('/users/profile', formData, {
      headers: {
        Authorization: token,
        'Content-Type': 'multipart/form-data', // Important for file upload
      },
    });

    return res.data.user;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Profile update failed');
  }
});

// New: Get current user profile
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

// New: Update profile picture only
export const updateProfilePicture = createAsyncThunk(
  'users/updateProfilePicture',
  async (imageFile, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const token = state.auth.token;

      const formData = new FormData();
      formData.append('profileImage', imageFile);

      const res = await axiosInstance.put('/users/profile', formData, {
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data',
        },
      });

      return res.data.user;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || 'Failed to update profile picture');
    }
  }
);

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
    // New: Update user profile locally without API call
    updateUserProfileLocal: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    // New: Update user in users list (for admin)
    updateUserInList: (state, action) => {
      const updatedUser = action.payload;
      state.users = state.users.map((user) =>
        user._id === updatedUser._id ? updatedUser : user
      );
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
     
      // Edit Profile - Enhanced with separate loading state
      .addCase(editProfile.pending, (state) => {
        state.profileUpdateLoading = true;
        state.error = null;
      })
      .addCase(editProfile.fulfilled, (state, action) => {
        state.profileUpdateLoading = false;
        state.user = { ...state.user, ...action.payload };
        // Also update in users list if user is admin viewing users
        state.users = state.users.map((user) =>
          user._id === action.payload._id ? action.payload : user
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
   
      // Update Profile Picture
      .addCase(updateProfilePicture.pending, (state) => {
        state.profileUpdateLoading = true;
        state.error = null;
      })
      .addCase(updateProfilePicture.fulfilled, (state, action) => {
        state.profileUpdateLoading = false;
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(updateProfilePicture.rejected, (state, action) => {
        state.profileUpdateLoading = false;
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
        if (state.user && state.user._id === updatedUser._id) {
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
  updateUserInList 
} = authSlice.actions;

export default authSlice.reducer;