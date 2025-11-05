import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

// Async thunks
export const createWasteReport = createAsyncThunk(
  'wasteReport/create',
  async (reportData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/waste-reports/detect', reportData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to create report');
    }
  }
);

export const getUserReports = createAsyncThunk(
  'wasteReport/getUserReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/waste-reports/my-reports');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch reports');
    }
  }
);

const wasteReportSlice = createSlice({
  name: 'wasteReport',
  initialState: {
    reports: [],
    currentReport: null,
    loading: false,
    error: null,
    success: false
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    setCurrentReport: (state, action) => {
      state.currentReport = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Create report
      .addCase(createWasteReport.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(createWasteReport.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.reports.unshift(action.payload.report);
        state.currentReport = action.payload.report;
      })
      .addCase(createWasteReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get user reports
      .addCase(getUserReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserReports.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload;
      })
      .addCase(getUserReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError, clearSuccess, setCurrentReport } = wasteReportSlice.actions;
export default wasteReportSlice.reducer;