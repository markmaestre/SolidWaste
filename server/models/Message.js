const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'  // Dynamic reference
  },
  senderModel: {
    type: String,
    enum: ['User', 'Admin'],
    required: true
  },
  senderRole: {
    type: String,
    default: null
    // Para sa Admin: 'admin', 'southadmin', 'centraladmin'
    // Para sa User: 'user'
  },
  senderBarangay: {
    type: String,
    default: null
    // Para ma-track kung saang barangay galing ang sender (kung admin)
  },
  
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'receiverModel'
  },
  receiverModel: {
    type: String,
    enum: ['User', 'Admin'],
    required: true
  },
  receiverRole: {
    type: String,
    default: null
  },
  receiverBarangay: {
    type: String,
    default: null
  },
  
  message: {
    type: String,
    required: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  
  
  barangayContext: {
    type: String,
    enum: ['South Signal', 'Central Bicutan', 'TUP Taguig', 'all', null],
    default: null
   
  },
  
  isDeletedBySender: {
    type: Boolean,
    default: false
  },
  isDeletedByReceiver: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ barangayContext: 1 });
messageSchema.index({ senderRole: 1, senderBarangay: 1 });
messageSchema.index({ receiverRole: 1, receiverBarangay: 1 });

module.exports = mongoose.model('Message', messageSchema);