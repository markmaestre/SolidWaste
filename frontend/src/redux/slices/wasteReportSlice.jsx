/**
 * redux/slices/wasteReportSlice.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages all waste-report state including barangay routing & validation.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

// ─────────────────────────────────────────────────────────────────────────────
// Async thunks
// ─────────────────────────────────────────────────────────────────────────────

export const createWasteReport = createAsyncThunk(
  'wasteReport/create',
  async (reportData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/waste-reports/detect', reportData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          success: false,
          error:   'Failed to create report',
          details: error.message || 'Network error occurred',
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
      const response = await axiosInstance.get('/waste-reports/my-reports', {
        params: { page, limit, status },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          success: false,
          error:   'Failed to fetch reports',
          details: error.message || 'Network error occurred',
        }
      );
    }
  }
);

export const getReportById = createAsyncThunk(
  'wasteReport/getById',
  async (reportId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/waste-reports/${reportId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          success: false,
          error:   'Failed to fetch report',
          details: error.message || 'Network error occurred',
        }
      );
    }
  }
);

export const updateReportStatus = createAsyncThunk(
  'wasteReport/updateStatus',
  async ({ reportId, status, adminNotes }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/waste-reports/${reportId}/status`, {
        status,
        adminNotes,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          success: false,
          error:   'Failed to update report status',
          details: error.message || 'Network error occurred',
        }
      );
    }
  }
);

export const deleteReport = createAsyncThunk(
  'wasteReport/delete',
  async (reportId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/waste-reports/${reportId}`);
      return reportId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          success: false,
          error:   'Failed to delete report',
          details: error.message || 'Network error occurred',
        }
      );
    }
  }
);

export const getAllReports = createAsyncThunk(
  'wasteReport/getAllReports',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const { page = 1, limit = 10, status, user, barangay } = filters;
      const response = await axiosInstance.get('/waste-reports', {
        params: { page, limit, status, user, barangay },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          success: false,
          error:   'Failed to fetch all reports',
          details: error.message || 'Network error occurred',
        }
      );
    }
  }
);

/**
 * Pre-flight barangay check — call this before showing the save-report modal
 * so the user sees validation feedback instantly.
 */
export const checkBarangayRouting = createAsyncThunk(
  'wasteReport/checkBarangay',
  async ({ address, classification, barangay_override }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/waste-reports/barangay-check', {
        params: { address, classification, barangay_override },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || {
          success: false,
          error:   'Barangay check failed',
        }
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────────────────────

const wasteReportSlice = createSlice({
  name: 'wasteReport',
  initialState: {
    reports:      [],
    allReports:   [],
    currentReport: null,
    loading:       false,
    error:         null,
    success:       false,
    operation:     '',

    // Barangay routing state
    routing: {
      barangay:      null,   // e.g. 'south_signal'
      barangayLabel: null,   // e.g. 'South Signal, Taguig'
      valid:         true,
      reason:        null,
      checking:      false,
    },

    pagination: {
      currentPage: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false,
    },
    adminPagination: {
      currentPage: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false,
    },
  },

  reducers: {
    clearError: (state) => { state.error = null; },
    clearSuccess: (state) => { state.success = false; state.operation = ''; },
    clearCurrentReport: (state) => { state.currentReport = null; },
    setCurrentReport: (state, action) => { state.currentReport = action.payload; },
    clearRouting: (state) => {
      state.routing = { barangay: null, barangayLabel: null, valid: true, reason: null, checking: false };
    },
    resetReportState: (state) => {
      state.reports        = [];
      state.allReports     = [];
      state.currentReport  = null;
      state.loading        = false;
      state.error          = null;
      state.success        = false;
      state.operation      = '';
      state.routing        = { barangay: null, barangayLabel: null, valid: true, reason: null, checking: false };
      state.pagination     = { currentPage: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false };
      state.adminPagination = { currentPage: 1, totalPages: 1, total: 0, hasNext: false, hasPrev: false };
    },
    updateReportInList: (state, action) => {
      const u = action.payload;
      const updateIn = (arr) => {
        const i = arr.findIndex((r) => r._id === u._id);
        if (i !== -1) arr[i] = u;
      };
      updateIn(state.reports);
      updateIn(state.allReports);
      if (state.currentReport?._id === u._id) state.currentReport = u;
    },
  },

  extraReducers: (builder) => {
    // ── createWasteReport ──────────────────────────────────────────────────
    builder
      .addCase(createWasteReport.pending, (state) => {
        state.loading = true; state.error = null; state.success = false; state.operation = 'create';
      })
      .addCase(createWasteReport.fulfilled, (state, action) => {
        state.loading  = false;
        state.success  = true;
        state.operation = 'create';
        state.error    = null;
        if (action.payload.report) {
          state.reports.unshift(action.payload.report);
          state.currentReport = action.payload.report;
        }
        // Persist routing info returned from server
        if (action.payload.routing) {
          state.routing = { ...action.payload.routing, valid: true, reason: null, checking: false };
        }
      })
      .addCase(createWasteReport.rejected, (state, action) => {
        state.loading   = false;
        state.success   = false;
        state.operation = 'create';
        state.error     = action.payload;
        // Surface barangay validation errors
        if (action.payload?.reason) {
          state.routing = {
            barangay:      action.payload.barangay      || state.routing.barangay,
            barangayLabel: action.payload.barangayLabel || state.routing.barangayLabel,
            valid:         false,
            reason:        action.payload.reason,
            checking:      false,
          };
        }
      })

    // ── checkBarangayRouting ────────────────────────────────────────────────
      .addCase(checkBarangayRouting.pending, (state) => {
        state.routing.checking = true;
      })
      .addCase(checkBarangayRouting.fulfilled, (state, action) => {
        const { barangay, label, valid, reason } = action.payload;
        state.routing = { barangay, barangayLabel: label, valid, reason: reason || null, checking: false };
      })
      .addCase(checkBarangayRouting.rejected, (state) => {
        state.routing.checking = false;
      })

    // ── getUserReports ──────────────────────────────────────────────────────
      .addCase(getUserReports.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'fetch_user';
      })
      .addCase(getUserReports.fulfilled, (state, action) => {
        state.loading   = false;
        state.operation = 'fetch_user';
        state.error     = null;
        if (action.payload.success) {
          state.reports = action.payload.reports || [];
          const cp = action.payload.currentPage || 1;
          const tp = action.payload.totalPages  || 1;
          state.pagination = { currentPage: cp, totalPages: tp, total: action.payload.total || 0, hasNext: cp < tp, hasPrev: cp > 1 };
        }
      })
      .addCase(getUserReports.rejected, (state, action) => {
        state.loading = false; state.operation = 'fetch_user'; state.error = action.payload;
      })

    // ── getAllReports ───────────────────────────────────────────────────────
      .addCase(getAllReports.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'fetch_all';
      })
      .addCase(getAllReports.fulfilled, (state, action) => {
        state.loading   = false;
        state.operation = 'fetch_all';
        state.error     = null;
        if (action.payload.success) {
          state.allReports = action.payload.reports || [];
          const cp = action.payload.currentPage || 1;
          const tp = action.payload.totalPages  || 1;
          state.adminPagination = { currentPage: cp, totalPages: tp, total: action.payload.total || 0, hasNext: cp < tp, hasPrev: cp > 1 };
        }
      })
      .addCase(getAllReports.rejected, (state, action) => {
        state.loading = false; state.operation = 'fetch_all'; state.error = action.payload;
      })

    // ── getReportById ───────────────────────────────────────────────────────
      .addCase(getReportById.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'fetch_single';
      })
      .addCase(getReportById.fulfilled, (state, action) => {
        state.loading   = false;
        state.operation = 'fetch_single';
        state.error     = null;
        if (action.payload.success) state.currentReport = action.payload.report;
      })
      .addCase(getReportById.rejected, (state, action) => {
        state.loading = false; state.operation = 'fetch_single'; state.error = action.payload;
      })

    // ── updateReportStatus ──────────────────────────────────────────────────
      .addCase(updateReportStatus.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'update_status';
      })
      .addCase(updateReportStatus.fulfilled, (state, action) => {
        state.loading   = false;
        state.success   = true;
        state.operation = 'update_status';
        state.error     = null;
        if (action.payload.success && action.payload.report) {
          const u = action.payload.report;
          const updateIn = (arr) => { const i = arr.findIndex((r) => r._id === u._id); if (i !== -1) arr[i] = u; };
          updateIn(state.reports);
          updateIn(state.allReports);
          if (state.currentReport?._id === u._id) state.currentReport = u;
        }
      })
      .addCase(updateReportStatus.rejected, (state, action) => {
        state.loading = false; state.operation = 'update_status'; state.error = action.payload;
      })

    // ── deleteReport ────────────────────────────────────────────────────────
      .addCase(deleteReport.pending, (state) => {
        state.loading = true; state.error = null; state.operation = 'delete';
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.loading   = false;
        state.success   = true;
        state.operation = 'delete';
        state.error     = null;
        const id = action.payload;
        state.reports    = state.reports.filter((r) => r._id !== id);
        state.allReports = state.allReports.filter((r) => r._id !== id);
        if (state.currentReport?._id === id) state.currentReport = null;
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.loading = false; state.operation = 'delete'; state.error = action.payload;
      });
  },
});

export const {
  clearError,
  clearSuccess,
  clearCurrentReport,
  setCurrentReport,
  clearRouting,
  resetReportState,
  updateReportInList,
} = wasteReportSlice.actions;

export default wasteReportSlice.reducer;