const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',  
    required: true
  },
  adminName: { 
    type: String,
    required: true
  },
  adminRole: { 
    type: String,
    enum: ['admin', 'southadmin', 'centraladmin'],
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
    ref: 'User'  // Assuming regular users like posts
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
postSchema.index({ admin: 1 });
postSchema.index({ adminRole: 1 });
postSchema.index({ title: 'text', content: 'text' });

// Middleware
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtuals
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

// Static method to get posts visible to a specific admin
postSchema.statics.getVisiblePosts = async function(admin) {
  let query = { status: 'published' };
  
  if (admin.role === 'southadmin') {
    query.targetBarangay = 'South Signal';
  } else if (admin.role === 'centraladmin') {
    query.targetBarangay = 'Central Bicutan';
  }

  
  return await this.find(query)
    .populate('admin', 'fullName email assignedBarangayLabel')
    .sort({ isPinned: -1, createdAt: -1 });
};

module.exports = mongoose.model('Post', postSchema);