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
    enum: ['pending', 'processed', 'scheduled', 'recycled', 'disposed', 'rejected', 'completed'],
    default: 'pending'
  },

  // Archive fields
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Admin proof images - Updated with more enum values
  adminProofImages: [{
    url: String,
    cloudinaryId: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String,
    type: {
      type: String,
      enum: ['pickup_scheduled', 'collected', 'processed', 'recycled', 'disposed', 'completed', 'hazardous_waste'],
      default: 'processed'
    }
  }],

  // Pickup scheduling
  scheduledPickup: {
    scheduledDate: Date,
    scheduledTime: String,
    notes: String,
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scheduledAt: Date,
    confirmed: {
      type: Boolean,
      default: false
    },
    confirmedAt: Date,
    pickupAddress: String
  },

  // Collection tracking
  collectionDetails: {
    collectedAt: Date,
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectionProofImage: String,
    collectionProofCloudinaryId: String,
    weight: Number,
    notes: String
  },

  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'processed', 'scheduled', 'recycled', 'disposed', 'rejected', 'completed']
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedByName: String,
    changedByRole: String,
    notes: String,
    proofImage: String,
    proofImageUrl: String,
    scheduledPickupDate: Date,
    scheduledPickupTime: String
  }],

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

// Indexes
wasteReportSchema.index({ user: 1, scanDate: -1 });
wasteReportSchema.index({ status: 1 });
wasteReportSchema.index({ classification: 1 });
wasteReportSchema.index({ assignedBarangay: 1 });
wasteReportSchema.index({ assignedBarangay: 1, status: 1 });
wasteReportSchema.index({ 'scheduledPickup.scheduledDate': 1 });

// Archive indexes
wasteReportSchema.index({ isArchived: 1 });
wasteReportSchema.index({ archivedAt: -1 });
wasteReportSchema.index({ isArchived: 1, assignedBarangay: 1 });
wasteReportSchema.index({ isArchived: 1, status: 1 });
wasteReportSchema.index({ archivedBy: 1 });

module.exports = mongoose.model('WasteReport', wasteReportSchema);