const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// Helper function to check if user is admin
const isAdmin = (user) => {
  return user.role === 'admin' || user.role === 'southadmin' || user.role === 'centraladmin' || user.role === 'superadmin';
};

// Helper to get admin's barangay
const getAdminBarangay = (user) => {
  if (user.role === 'southadmin') return 'South Signal';
  if (user.role === 'centraladmin') return 'Central Bicutan';
  return null; // Super admin can see all
};

// ==================== CREATE POST ====================
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { title, content, category, status, isPinned } = req.body;
    
    // Get admin's barangay
    const adminBarangay = getAdminBarangay(req.user);
    if (!adminBarangay && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Unable to determine admin barangay' });
    }

    // Handle image upload to Cloudinary
    let imageUrl = null;
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'posts' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
      }
    }

    const post = new Post({
      admin: req.user.id,
      title,
      content,
      category: category || 'announcement',
      image: imageUrl,
      status: status || 'draft',
      isPinned: isPinned || false,
      targetBarangay: adminBarangay // Automatically set to admin's barangay
    });

    await post.save();
    await post.populate('admin', 'username email profile role');

    res.status(201).json({ 
      success: true,
      message: 'Post created successfully', 
      post 
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Error creating post: ' + error.message });
  }
});

// ==================== GET ALL POSTS ====================
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const query = {};
    
    // Filter by barangay based on admin role
    const adminBarangay = getAdminBarangay(req.user);
    
    if (adminBarangay) {
      // Regular admin - only see posts from their barangay
      query.targetBarangay = adminBarangay;
    }
    // Super admin can see all posts
    
    // Only show published posts to non-admins, but admins can see all statuses
    if (!isAdmin(req.user)) {
      query.status = 'published';
    } else if (status) {
      query.status = status;
    }
    
    // Filter by category
    if (category) query.category = category;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('admin', 'username email profile role');
    
    const total = await Post.countDocuments(query);
    
    res.json({
      success: true,
      posts,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      totalPosts: total
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Error fetching posts: ' + error.message });
  }
});

// ==================== GET SINGLE POST ====================
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('admin', 'username email profile role')
      .populate('comments.user', 'username profile');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user can view this post based on barangay
    const adminBarangay = getAdminBarangay(req.user);
    if (adminBarangay && post.targetBarangay !== adminBarangay) {
      return res.status(403).json({ message: 'Post not available for your barangay' });
    }
    
    // Check if user is admin or post is published
    if (!isAdmin(req.user) && post.status !== 'published') {
      return res.status(403).json({ message: 'Post not available' });
    }
    
    // Increment views
    post.views += 1;
    await post.save();
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Error fetching post: ' + error.message });
  }
});

// ==================== UPDATE POST ====================
router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if admin owns this post or is super admin
    const adminBarangay = getAdminBarangay(req.user);
    if (adminBarangay && post.targetBarangay !== adminBarangay) {
      return res.status(403).json({ message: 'You can only edit posts from your barangay' });
    }
    
    const { title, content, category, status, isPinned } = req.body;
    
    // Handle image upload
    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (post.image) {
        const publicId = post.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`posts/${publicId}`);
      }
      
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'posts' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      post.image = result.secure_url;
    }
    
    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;
    if (status) post.status = status;
    if (isPinned !== undefined) post.isPinned = isPinned;
    
    await post.save();
    await post.populate('admin', 'username email profile role');
    
    res.json({ 
      success: true,
      message: 'Post updated successfully', 
      post 
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Error updating post: ' + error.message });
  }
});

// ==================== DELETE POST ====================
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if admin owns this post or is super admin
    const adminBarangay = getAdminBarangay(req.user);
    if (adminBarangay && post.targetBarangay !== adminBarangay) {
      return res.status(403).json({ message: 'You can only delete posts from your barangay' });
    }
    
    // Delete image from Cloudinary
    if (post.image) {
      const publicId = post.image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`posts/${publicId}`);
    }
    
    await Post.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Error deleting post: ' + error.message });
  }
});

// ==================== LIKE POST ====================
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const likeIndex = post.likes.indexOf(req.user.id);
    
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
      await post.save();
      res.json({ success: true, message: 'Post unliked', liked: false, likes: post.likes.length });
    } else {
      post.likes.push(req.user.id);
      await post.save();
      res.json({ success: true, message: 'Post liked', liked: true, likes: post.likes.length });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Error liking post: ' + error.message });
  }
});

// ==================== ADD COMMENT ====================
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    
    post.comments.push({
      user: req.user.id,
      content: content.trim()
    });
    
    await post.save();
    await post.populate('comments.user', 'username profile');
    
    res.json({ 
      success: true, 
      message: 'Comment added', 
      comment: post.comments[post.comments.length - 1] 
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Error adding comment: ' + error.message });
  }
});

module.exports = router;