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

export const editProfile = createAsyncThunk('users/editProfile', async (formData, thunkAPI) => {
  try {
    const state = thunkAPI.getState();
    const token = state.auth.token;

    const res = await axiosInstance.put('/users/profile', formData, {
      headers: {
        Authorization: token,
      },
    });

    return res.data.user;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Profile update failed');
  }
});

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

// Fixed checkEmail implementation
export const checkEmail = createAsyncThunk(
  'auth/checkEmail',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/users/check-email', { email });
      return response.data; // Should return { exists: true/false }
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
    },
    clearEmailError: (state) => {
      state.emailCheckError = null;
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
     
      // Edit Profile
      .addCase(editProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(editProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(editProfile.rejected, (state, action) => {
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
      .addCase(checkEmail.fulfilled, (state, action) => {
        state.emailCheckLoading = false;
        // The payload should contain { exists: boolean }
        // We don't need to store this in state as it's a one-time check
      })
      .addCase(checkEmail.rejected, (state, action) => {
        state.emailCheckLoading = false;
        state.emailCheckError = action.payload;
      });
  },
});

export const { logoutUser, clearEmailError } = authSlice.actions;
export default authSlice.reducer;