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
    category: String,
    box: [Number], 
    material: String,
    area_percentage: Number
  }],
  classification: {
    type: String,
    required: true,
    enum: ['Recyclable', 'Special Waste', 'Biodegradable', 'Residual / Non-Recyclable']
  },
  classificationConfidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  wasteComposition: {
    special_waste:  { type: Number, default: 0 },
    recyclable:     { type: Number, default: 0 },
    residual:       { type: Number, default: 0 },
    biodegradable:  { type: Number, default: 0 }
  },
  materialBreakdown: {
    type: Map,
    of: Number
  },
  recyclingTips: [String],

  // ── Location ──────────────────────────────────────────────────────────────
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    timestamp: String
  },


  assignedBarangay: {
    type: String,
    enum: ['south_signal', 'central_bicutan', 'tup_taguig'],
    required: true
  },

  assignedBarangayLabel: {
    type: String,
    enum: ['South Signal, Taguig', 'Central Bicutan, Taguig', 'TUP Taguig'],
    required: true
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
  userMessage: {
    type: String,
    default: ''
  },
  deviceUsed: {
    type: String,
    default: ''
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  scanDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ── Indexes ───────────────────────────────────────────────────────────────
wasteReportSchema.index({ user: 1, scanDate: -1 });
wasteReportSchema.index({ status: 1 });
wasteReportSchema.index({ classification: 1 });
wasteReportSchema.index({ assignedBarangay: 1 });
wasteReportSchema.index({ assignedBarangay: 1, status: 1 });

module.exports = mongoose.model('WasteReport', wasteReportSchema);