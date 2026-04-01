// redux/slices/classifySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

const createImageFormData = (imageData) => {
  const formData = new FormData();
  
  if (imageData.uri) {
    const uriParts = imageData.uri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    
    formData.append('image', {
      uri: imageData.uri,
      type: `image/${fileType}`,
      name: `waste_image_${Date.now()}.${fileType}`,
    });
  } else if (imageData.base64) {
    const filename = `waste_image_${Date.now()}.jpg`;
    
    formData.append('image', {
      uri: `data:image/jpeg;base64,${imageData.base64}`,
      type: 'image/jpeg',
      name: filename,
    });
  }
  
  return formData;
};

export const classifyWaste = createAsyncThunk(
  'classify/classifyWaste',
  async (imageData, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const token = state?.auth?.token;
      
      const formData = createImageFormData(imageData);
      
      console.log('📸 Sending image for classification...');
      
      const response = await axiosInstance.post('/classify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      console.log('✅ Classification response received');
      console.log(`📊 Total detections: ${response.data.totalDetections || response.data.predictions?.length || 0}`);
      
      if (response.data.predictions && response.data.predictions.length > 0) {
        response.data.predictions.forEach((pred, idx) => {
          console.log(`  ${idx + 1}. ${pred.class} - ${(pred.confidence * 100).toFixed(1)}%`);
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Classification error:', error.response?.data || error.message);
      return rejectWithValue(
        error.response?.data?.error || 'Failed to classify waste image'
      );
    }
  }
);

export const uploadWasteReport = createAsyncThunk(
  'classify/uploadWasteReport',
  async (reportData, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const token = state?.auth?.token;
      
      const response = await axiosInstance.post('/waste-reports/create', reportData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      
      console.log('✅ Report uploaded successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Upload report error:', error.response?.data || error.message);
      return rejectWithValue(
        error.response?.data?.message || 'Failed to upload waste report'
      );
    }
  }
);

const initialState = {
  predictions: [],
  imageUrl: null,
  imageWidth: null,
  imageHeight: null,
  totalDetections: 0,
  loading: false,
  error: null,
  recentClassifications: [],
  uploadingReport: false,
  reportSuccess: false,
  reportError: null,
  historyLoading: false,
};

const classifySlice = createSlice({
  name: 'classify',
  initialState,
  reducers: {
    clearClassifications: (state) => {
      state.predictions = [];
      state.imageUrl = null;
      state.imageWidth = null;
      state.imageHeight = null;
      state.error = null;
      state.totalDetections = 0;
    },
    clearReportSuccess: (state) => {
      state.reportSuccess = false;
    },
    clearReportError: (state) => {
      state.reportError = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAll: (state) => {
      state.predictions = [];
      state.imageUrl = null;
      state.imageWidth = null;
      state.imageHeight = null;
      state.totalDetections = 0;
      state.loading = false;
      state.error = null;
      state.uploadingReport = false;
      state.reportSuccess = false;
      state.reportError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(classifyWaste.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(classifyWaste.fulfilled, (state, action) => {
        state.loading = false;
        
        const predictions = action.payload.predictions || [];
        const imageUrl = action.payload.imageUrl;
        const totalDetections = action.payload.totalDetections || predictions.length;
        const imageWidth = action.payload.imageWidth;
        const imageHeight = action.payload.imageHeight;
        
        const formattedPredictions = predictions.map((pred, index) => ({
          id: index,
          class: pred.class,
          confidence: pred.confidence,
          x: pred.x || 0,
          y: pred.y || 0,
          width: pred.width || 0,
          height: pred.height || 0,
        }));
        
        state.predictions = formattedPredictions;
        state.imageUrl = imageUrl;
        state.imageWidth = imageWidth;
        state.imageHeight = imageHeight;
        state.totalDetections = totalDetections;
        
        if (formattedPredictions.length > 0) {
          const topPrediction = formattedPredictions.reduce((prev, current) => 
            (prev.confidence > current.confidence) ? prev : current
          );
          
          const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            predictions: formattedPredictions,
            imageUrl: imageUrl,
            topPrediction: topPrediction.class,
            confidence: (topPrediction.confidence * 100).toFixed(1),
            totalDetections: totalDetections,
            imageWidth: imageWidth,
            imageHeight: imageHeight,
          };
          
          state.recentClassifications.unshift(historyItem);
          
          if (state.recentClassifications.length > 20) {
            state.recentClassifications.pop();
          }
        }
      })
      .addCase(classifyWaste.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to classify image';
      })
      
      .addCase(uploadWasteReport.pending, (state) => {
        state.uploadingReport = true;
        state.reportSuccess = false;
        state.reportError = null;
      })
      .addCase(uploadWasteReport.fulfilled, (state) => {
        state.uploadingReport = false;
        state.reportSuccess = true;
        state.reportError = null;
      })
      .addCase(uploadWasteReport.rejected, (state, action) => {
        state.uploadingReport = false;
        state.reportError = action.payload || 'Failed to upload report';
        state.reportSuccess = false;
      });
  },
});

export const { 
  clearClassifications, 
  clearReportSuccess,
  clearReportError,
  clearError,
  clearAll
} = classifySlice.actions;

export default classifySlice.reducer;