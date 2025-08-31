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
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'banned'], default: 'active' } 
});

module.exports = mongoose.model('User', userSchema);