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
  detectedObjects: [{
    label: String,
    confidence: Number,
    material: String,
    box: [Number],
    areaPercentage: Number
  }],
  classification: {
    type: String,
    enum: ['Recycling', 'Organic', 'General', 'Hazardous', 'Unknown'],
    required: true
  },
  classificationConfidence: Number,
  wasteComposition: Map,
  materialBreakdown: Map,
  recyclingTips: [String],
  location: {
    address: String,
    city: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'collected', 'recycled'],
    default: 'pending'
  },
  scanDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WasteReport', wasteReportSchema);