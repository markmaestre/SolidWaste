const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  category: {
    type: String,
    enum: ['announcement', 'event', 'cleanup_drive', 'advisory', 'recycling_tip', 'news', 'alert', 'general'],
    default: 'announcement'
  },
  image: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Only admins from this barangay can see this post
  targetBarangay: {
    type: String,
    enum: ['South Signal', 'Central Bicutan'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
postSchema.index({ createdAt: -1 });
postSchema.index({ status: 1 });
postSchema.index({ category: 1 });
postSchema.index({ targetBarangay: 1 });
postSchema.index({ title: 'text', content: 'text' });

postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Method to check if post is published
postSchema.methods.isPublished = function() {
  return this.status === 'published';
};

module.exports = mongoose.model('Post', postSchema);