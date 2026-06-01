  const mongoose = require('mongoose');

  const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    role: { 
      type: String, 
      enum: ['admin', 'southadmin', 'centraladmin'],
      default: 'admin' 
    },
    profile: String,
    lastLogin: Date,
    assignedBarangay: {
      type: String,
      enum: ['south_signal', 'central_signal', 'tup_taguig', null],
      default: null
    },
    assignedBarangayLabel: {
      type: String,
      enum: ['South Signal, Taguig', 'Central Signal, Taguig', 'TUP Taguig', null],
      default: null
    }
  }, {
    timestamps: true
  });

  module.exports = mongoose.model('Admin', userSchema);