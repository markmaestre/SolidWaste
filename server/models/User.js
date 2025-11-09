const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  bod: String,
  gender: String,
  address: String,
  role: { type: String, default: 'user' },
  profile: String,
  lastLogin: Date, 
  notificationsEnabled: { type: Boolean, default: true },
  pushToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'banned'], default: 'active' },
  
  // Add notification preferences
  notificationPreferences: {
    reportUpdates: { type: Boolean, default: true },
    recyclingTips: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('User', userSchema);