const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'admin' },
  profile: String,
  lastLogin: Date,

});

module.exports = mongoose.model('Admin', userSchema);