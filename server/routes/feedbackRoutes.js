const express = require('express');
const Feedback = require('../models/Feedback');
const auth = require('../middleware/auth');
const router = express.Router();

// ==================== SUBMIT FEEDBACK (User only) ====================
router.post('/submit', auth, async (req, res) => {
  try {
    const { rating, message, category } = req.body;

    // Validation
    if (!rating || !message) {
      return res.status(400).json({ message: 'Rating and message are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const feedback = new Feedback({
      user: req.user.id,
      rating,
      message: message.trim(),
      category: category || 'general'
    });

    await feedback.save();

    // Populate user details for response
    await feedback.populate('user', 'username email profile');

    res.status(201).json({
      message: 'Feedback submitted successfully! Thank you for your input.',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        message: feedback.message,
        category: feedback.category,
        status: feedback.status,
        createdAt: feedback.createdAt,
        user: {
          username: feedback.user.username,
          email: feedback.user.email,
          profile: feedback.user.profile
        }
      }
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ message: 'Server error during feedback submission' });
  }
});

// ==================== GET USER'S FEEDBACK HISTORY ====================
router.get('/my-feedback', auth, async (req, res) => {
  try {
    const feedback = await Feedback.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      feedback,
      total: feedback.length
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'Server error fetching feedback' });
  }
});

// ==================== GET ALL FEEDBACK (Admin only) ====================
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const feedback = await Feedback.find()
      .populate('user', 'username email profile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Feedback.countDocuments();

    res.json({
      feedback,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({ message: 'Server error fetching feedback' });
  }
});

// ==================== UPDATE FEEDBACK STATUS (Admin only) ====================
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { status, adminReply } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        adminReply: adminReply || '',
        updatedAt: new Date()
      },
      { new: true }
    ).populate('user', 'username email profile');

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json({
      message: 'Feedback status updated successfully',
      feedback
    });

  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ message: 'Server error updating feedback' });
  }
});

// ==================== GET FEEDBACK STATS (Admin only) ====================
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const totalFeedback = await Feedback.countDocuments();
    const averageRating = await Feedback.aggregate([
      { $group: { _id: null, average: { $avg: '$rating' } } }
    ]);
    const statusStats = await Feedback.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const categoryStats = await Feedback.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const ratingStats = await Feedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } }
    ]);

    res.json({
      totalFeedback,
      averageRating: averageRating[0]?.average || 0,
      statusStats,
      categoryStats,
      ratingStats
    });

  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({ message: 'Server error fetching feedback stats' });
  }
});

module.exports = router;