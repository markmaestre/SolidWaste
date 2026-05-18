const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  bod: { type: String, default: '' },
  gender: { type: String, default: '' },
  address: { type: String, default: '' },
  fullAddress: { type: String, default: '' },
  barangay: { 
    type: String, 
    enum: ['South Signal', 'Central Bicutan', ''],
    default: '' 
  },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profile: { type: String, default: null },
  lastLogin: { type: Date, default: null },
  notificationsEnabled: { type: Boolean, default: true },
  pushToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'banned', 'pending'], default: 'pending' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  
  notificationPreferences: {
    reportUpdates: { type: Boolean, default: true },
    recyclingTips: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('User', userSchema);