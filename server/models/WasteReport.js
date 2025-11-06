const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    default: ''
  },
  detectedObjects: [{
    label: String,
    confidence: Number,
    box: [Number], // [x1, y1, x2, y2]
    material: String,
    area_percentage: Number
  }],
  classification: {
    type: String,
    required: true,
    enum: ['Recycling', 'organic', 'general_waste', 'hazardous', 'unknown']
  },
  classificationConfidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  wasteComposition: {
    type: Map,
    of: Number // percentage values
  },
  materialBreakdown: {
    type: Map,
    of: Number // percentage values
  },
  recyclingTips: [String],
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    timestamp: String
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'recycled', 'disposed', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  scanDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
wasteReportSchema.index({ user: 1, scanDate: -1 });
wasteReportSchema.index({ status: 1 });
wasteReportSchema.index({ classification: 1 });

module.exports = mongoose.model('WasteReport', wasteReportSchema);