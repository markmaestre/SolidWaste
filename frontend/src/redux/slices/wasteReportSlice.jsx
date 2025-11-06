import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

// Async thunks
export const createWasteReport = createAsyncThunk(
  'wasteReport/create',
  async (reportData, { rejectWithValue }) => {
    try {
      console.log('📤 Sending waste report to backend:', {
        classification: reportData.classification,
        objectsCount: reportData.detected_objects?.length,
        hasImage: !!reportData.image
      });

      const response = await axiosInstance.post('/waste-reports/detect', reportData);
      
      console.log('✅ Backend response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Create report error:', error.response?.data || error.message);
      
      return rejectWithValue(
        error.response?.data || { 
          success: false,
          error: 'Failed to create report',
          details: error.message || 'Network error occurred'
        }
      );
    }
  }
);

export const getUserReports = createAsyncThunk(
  'wasteReport/getUserReports',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, status } = filters;
      const params = { page, limit, status };
      
      console.log('📥 Fetching user reports with params:', params);
      const response = await axiosInstance.get('/waste-reports/my-reports', { params });
      
      console.log('✅ User reports fetched:', response.data.reports?.length);
      return response.data;
    } catch (error) {
      console.error('❌ Get user reports error:', error.response?.data || error.message);
      
      return rejectWithValue(
        error.response?.data || { 
          success: false,
          error: 'Failed to fetch reports',
          details: error.message || 'Network error occurred'
        }
      );
    }
  }
);

export const getReportById = createAsyncThunk(
  'wasteReport/getById',
  async (reportId, { rejectWithValue }) => {
    try {
      console.log('📥 Fetching report by ID:', reportId);
      const response = await axiosInstance.get(`/waste-reports/${reportId}`);
      
      console.log('✅ Report fetched:', response.data.report?._id);
      return response.data;
    } catch (error) {
      console.error('❌ Get report by ID error:', error.response?.data || error.message);
      
      return rejectWithValue(
        error.response?.data || { 
          success: false,
          error: 'Failed to fetch report',
          details: error.message || 'Network error occurred'
        }
      );
    }
  }
);

export const updateReportStatus = createAsyncThunk(
  'wasteReport/updateStatus',
  async ({ reportId, status, adminNotes }, { rejectWithValue }) => {
    try {
      console.log('🔄 Updating report status:', { reportId, status });
      
      const response = await axiosInstance.put(`/waste-reports/${reportId}/status`, {
        status,
        adminNotes
      });
      
      console.log('✅ Report status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Update report status error:', error.response?.data || error.message);
      
      return rejectWithValue(
        error.response?.data || { 
          success: false,
          error: 'Failed to update report status',
          details: error.message || 'Network error occurred'
        }
      );
    }
  }
);

export const deleteReport = createAsyncThunk(
  'wasteReport/delete',
  async (reportId, { rejectWithValue }) => {
    try {
      console.log('🗑️ Deleting report:', reportId);
      await axiosInstance.delete(`/waste-reports/${reportId}`);
      
      console.log('✅ Report deleted successfully');
      return reportId;
    } catch (error) {
      console.error('❌ Delete report error:', error.response?.data || error.message);
      
      return rejectWithValue(
        error.response?.data || { 
          success: false,
          error: 'Failed to delete report',
          details: error.message || 'Network error occurred'
        }
      );
    }
  }
);

export const getAllReports = createAsyncThunk(
  'wasteReport/getAllReports',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, status, user } = filters;
      const params = { page, limit, status, user };
      
      console.log('📥 Fetching all reports (admin):', params);
      const response = await axiosInstance.get('/waste-reports', { params });
      
      console.log('✅ All reports fetched:', response.data.reports?.length);
      return response.data;
    } catch (error) {
      console.error('❌ Get all reports error:', error.response?.data || error.message);
      
      return rejectWithValue(
        error.response?.data || { 
          success: false,
          error: 'Failed to fetch all reports',
          details: error.message || 'Network error occurred'
        }
      );
    }
  }
);

const wasteReportSlice = createSlice({
  name: 'wasteReport',
  initialState: {
    reports: [],
    allReports: [], // For admin view
    currentReport: null,
    loading: false,
    error: null,
    success: false,
    operation: '', // Current operation type
    pagination: {
      currentPage: 1,
      totalPages: 1,
      total: 0,
      hasNext: false,
      hasPrev: false
    },
    adminPagination: {
      currentPage: 1,
      totalPages: 1,
      total: 0,
      hasNext: false,
      hasPrev: false
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
      state.operation = '';
    },
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
    setCurrentReport: (state, action) => {
      state.currentReport = action.payload;
    },
    resetReportState: (state) => {
      state.reports = [];
      state.allReports = [];
      state.currentReport = null;
      state.loading = false;
      state.error = null;
      state.success = false;
      state.operation = '';
      state.pagination = {
        currentPage: 1,
        totalPages: 1,
        total: 0,
        hasNext: false,
        hasPrev: false
      };
      state.adminPagination = {
        currentPage: 1,
        totalPages: 1,
        total: 0,
        hasNext: false,
        hasPrev: false
      };
    },
    updateReportInList: (state, action) => {
      const updatedReport = action.payload;
      const index = state.reports.findIndex(report => report._id === updatedReport._id);
      if (index !== -1) {
        state.reports[index] = updatedReport;
      }
      
      const allIndex = state.allReports.findIndex(report => report._id === updatedReport._id);
      if (allIndex !== -1) {
        state.allReports[allIndex] = updatedReport;
      }
      
      if (state.currentReport && state.currentReport._id === updatedReport._id) {
        state.currentReport = updatedReport;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Create report
      .addCase(createWasteReport.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.operation = 'create';
      })
      .addCase(createWasteReport.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.operation = 'create';
        
        // Add new report to the beginning of the list
        if (action.payload.report) {
          state.reports.unshift(action.payload.report);
          state.currentReport = action.payload.report;
        }
        
        state.error = null;
        
        console.log('✅ Report created in Redux state:', action.payload.report?._id);
      })
      .addCase(createWasteReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
        state.operation = 'create';
        
        console.error('❌ Report creation failed in Redux:', action.payload);
      })
      
      // Get user reports
      .addCase(getUserReports.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operation = 'fetch_user';
      })
      .addCase(getUserReports.fulfilled, (state, action) => {
        state.loading = false;
        state.operation = 'fetch_user';
        
        if (action.payload.success) {
          state.reports = action.payload.reports || [];
          state.pagination = {
            currentPage: action.payload.currentPage || 1,
            totalPages: action.payload.totalPages || 1,
            total: action.payload.total || 0,
            hasNext: (action.payload.currentPage || 1) < (action.payload.totalPages || 1),
            hasPrev: (action.payload.currentPage || 1) > 1
          };
        }
        
        state.error = null;
      })
      .addCase(getUserReports.rejected, (state, action) => {
        state.loading = false;
        state.operation = 'fetch_user';
        state.error = action.payload;
      })
      
      // Get all reports (admin)
      .addCase(getAllReports.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operation = 'fetch_all';
      })
      .addCase(getAllReports.fulfilled, (state, action) => {
        state.loading = false;
        state.operation = 'fetch_all';
        
        if (action.payload.success) {
          state.allReports = action.payload.reports || [];
          state.adminPagination = {
            currentPage: action.payload.currentPage || 1,
            totalPages: action.payload.totalPages || 1,
            total: action.payload.total || 0,
            hasNext: (action.payload.currentPage || 1) < (action.payload.totalPages || 1),
            hasPrev: (action.payload.currentPage || 1) > 1
          };
        }
        
        state.error = null;
      })
      .addCase(getAllReports.rejected, (state, action) => {
        state.loading = false;
        state.operation = 'fetch_all';
        state.error = action.payload;
      })
      
      // Get report by ID
      .addCase(getReportById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operation = 'fetch_single';
      })
      .addCase(getReportById.fulfilled, (state, action) => {
        state.loading = false;
        state.operation = 'fetch_single';
        
        if (action.payload.success) {
          state.currentReport = action.payload.report;
        }
        
        state.error = null;
      })
      .addCase(getReportById.rejected, (state, action) => {
        state.loading = false;
        state.operation = 'fetch_single';
        state.error = action.payload;
      })
      
      // Update report status
      .addCase(updateReportStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operation = 'update_status';
      })
      .addCase(updateReportStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.operation = 'update_status';
        
        if (action.payload.success && action.payload.report) {
          const updatedReport = action.payload.report;
          
          // Update in user reports list
          const userIndex = state.reports.findIndex(
            report => report._id === updatedReport._id
          );
          if (userIndex !== -1) {
            state.reports[userIndex] = updatedReport;
          }
          
          // Update in all reports list (admin)
          const allIndex = state.allReports.findIndex(
            report => report._id === updatedReport._id
          );
          if (allIndex !== -1) {
            state.allReports[allIndex] = updatedReport;
          }
          
          // Update current report if it's the one being updated
          if (state.currentReport && state.currentReport._id === updatedReport._id) {
            state.currentReport = updatedReport;
          }
        }
        
        state.error = null;
      })
      .addCase(updateReportStatus.rejected, (state, action) => {
        state.loading = false;
        state.operation = 'update_status';
        state.error = action.payload;
      })
      
      // Delete report
      .addCase(deleteReport.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operation = 'delete';
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.operation = 'delete';
        
        const deletedReportId = action.payload;
        
        // Remove from user reports list
        state.reports = state.reports.filter(
          report => report._id !== deletedReportId
        );
        
        // Remove from all reports list
        state.allReports = state.allReports.filter(
          report => report._id !== deletedReportId
        );
        
        // Clear current report if it's the one being deleted
        if (state.currentReport && state.currentReport._id === deletedReportId) {
          state.currentReport = null;
        }
        
        state.error = null;
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.loading = false;
        state.operation = 'delete';
        state.error = action.payload;
      });
  }
});

export const { 
  clearError, 
  clearSuccess, 
  clearCurrentReport, 
  setCurrentReport,
  resetReportState,
  updateReportInList
} = wasteReportSlice.actions;

export default wasteReportSlice.reducer;