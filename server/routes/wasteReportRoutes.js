const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const WasteReport = require('../models/WasteReport');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dtisam8ot',
  api_key: process.env.CLOUDINARY_API_KEY || '416996345946976',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'dcfIgNOmXE5GkMyXgOAHnMxVeLg',
  secure: true
});

// @desc    Create waste detection report
// @route   POST /api/waste-reports/detect
// @access  Private
router.post('/detect', 
  auth,
  [
    body('image').notEmpty().withMessage('Image is required'),
    body('classification').notEmpty().withMessage('Classification is required'),
    body('classification_confidence')
      .custom((value) => {
        const numValue = parseFloat(value);
        return !isNaN(numValue) && numValue >= 0;
      })
      .withMessage('Confidence must be a valid number')
  ],
  async (req, res) => {
    try {
      console.log('📨 Received waste detection request from user:', req.user.id);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const {
        image,
        detected_objects = [],
        classification,
        classification_confidence,
        waste_composition = {},
        material_breakdown = {},
        recycling_tips = [],
        location = {},
        scan_date,
        user_message,
        is_demo = false,
        cloudinary_url
      } = req.body;

      console.log('📊 Processing report data:', {
        classification,
        confidence: classification_confidence,
        objectsCount: detected_objects.length,
        hasImage: !!image,
        isDemo: is_demo,
        hasCloudinaryUrl: !!cloudinary_url
      });

      // Convert confidence if it's in percentage format (0-100 to 0-1)
      let finalConfidence = parseFloat(classification_confidence);
      if (finalConfidence > 1) {
        console.log('🔄 Converting confidence from percentage to decimal:', finalConfidence, '→', finalConfidence / 100);
        finalConfidence = finalConfidence / 100;
      }

      // Also convert detected objects confidence
      const processedObjects = detected_objects.map(obj => ({
        ...obj,
        confidence: obj.confidence > 1 ? obj.confidence / 100 : obj.confidence
      }));

      let imageUrl = image;
      let cloudinaryId = '';

      // If Cloudinary URL is already provided from Flask backend, use it
      if (cloudinary_url) {
        console.log('☁️ Using existing Cloudinary URL from detection');
        imageUrl = cloudinary_url;
        // Extract public_id from URL if possible
        const urlParts = cloudinary_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        cloudinaryId = `waste_detection/${filename.split('.')[0]}`;
      }
      // Upload image to Cloudinary if it's base64
      else if (image && image.startsWith('data:image')) {
        try {
          console.log('☁️ Uploading image to Cloudinary...');
          
          // Generate unique public ID
          const timestamp = Date.now();
          const randomId = Math.floor(Math.random() * 10000);
          const publicId = `waste_report_${req.user.id}_${timestamp}_${randomId}`;
          
          const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'waste-reports',
            public_id: publicId,
            resource_type: 'image',
            quality: 'auto:good',
            fetch_format: 'auto',
            transformation: [
              { width: 800, crop: "limit" },
              { quality: "auto" }
            ]
          });
          
          imageUrl = uploadResponse.secure_url;
          cloudinaryId = uploadResponse.public_id;
          console.log('✅ Image uploaded to Cloudinary:', imageUrl);
        } catch (uploadError) {
          console.error('❌ Cloudinary upload error:', uploadError);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image to cloud storage',
            details: uploadError.message
          });
        }
      } else if (image && (image.startsWith('http://') || image.startsWith('https://'))) {
        // If it's already a URL, use it directly
        console.log('🌐 Using existing image URL');
        imageUrl = image;
      } else if (is_demo) {
        // For demo data, use a placeholder
        console.log('🎭 Using demo image');
        imageUrl = 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Demo+Waste+Image';
      } else {
        console.log('❌ No valid image provided');
        return res.status(400).json({
          success: false,
          error: 'No valid image provided'
        });
      }

      // Create report with transaction for data consistency
      const session = await WasteReport.startSession();
      session.startTransaction();

      try {
        const reportData = {
          user: req.user.id,
          userEmail: req.user.email,
          image: imageUrl,
          cloudinaryId: cloudinaryId,
          detectedObjects: processedObjects,
          classification,
          classificationConfidence: finalConfidence,
          wasteComposition: waste_composition,
          materialBreakdown: material_breakdown,
          recyclingTips: recycling_tips,
          location,
          userMessage: user_message || '',
          status: 'pending',
          isDemo: is_demo || false
        };

        // Add scan date if provided
        if (scan_date) {
          reportData.scanDate = new Date(scan_date);
        } else {
          reportData.scanDate = new Date();
        }

        const report = new WasteReport(reportData);
        await report.save({ session });

        console.log('✅ Waste report saved to database:', report._id);

        // Create notification
        const notification = new Notification({
          user: req.user.id,
          title: 'Waste Report Created',
          message: `Your waste detection report has been created successfully. Classification: ${classification}`,
          type: 'report_created',
          relatedReport: report._id
        });
        await notification.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log('✅ Transaction committed successfully');

        // Populate the report with user data for response
        const populatedReport = await WasteReport.findById(report._id)
          .populate('user', 'name email');

        // Detailed response
        res.status(201).json({
          success: true,
          message: 'Report successfully saved to database!',
          report: populatedReport,
          notification: {
            id: notification._id,
            title: notification.title,
            message: notification.message
          }
        });

      } catch (transactionError) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ Transaction error:', transactionError);
        
        // More detailed error logging
        if (transactionError.name === 'ValidationError') {
          return res.status(400).json({
            success: false,
            error: 'Data validation failed',
            details: transactionError.errors
          });
        }
        
        if (transactionError.code === 11000) {
          return res.status(400).json({
            success: false,
            error: 'Duplicate entry found'
          });
        }
        
        throw transactionError;
      }

    } catch (error) {
      console.error('❌ Report creation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create waste report',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// @desc    Get user's waste reports
// @route   GET /api/waste-reports/my-reports
// @access  Private
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sort = 'newest' } = req.query;
    
    const query = { user: req.user.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Sort configuration
    let sortConfig = { scanDate: -1 };
    if (sort === 'oldest') sortConfig = { scanDate: 1 };
    if (sort === 'confidence_high') sortConfig = { classificationConfidence: -1 };
    if (sort === 'confidence_low') sortConfig = { classificationConfidence: 1 };

    const reports = await WasteReport.find(query)
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await WasteReport.countDocuments(query);

    res.json({
      success: true,
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasMore: (parseInt(page) * parseInt(limit)) < total
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch reports' 
    });
  }
});

// @desc    Get single report by ID
// @route   GET /api/waste-reports/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id)
      .populate('user', 'name email');
    
    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: 'Report not found' 
      });
    }

    // Check if user owns the report or is admin
    if (report.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch report' 
    });
  }
});

// @desc    Get all reports (admin only)
// @route   GET /api/waste-reports
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    const { page = 1, limit = 10, status, user, dateFrom, dateTo } = req.query;
    
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (user) query.user = user;
    
    // Date range filtering
    if (dateFrom || dateTo) {
      query.scanDate = {};
      if (dateFrom) {
        query.scanDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.scanDate.$lte = new Date(dateTo);
      }
    }

    const reports = await WasteReport.find(query)
      .populate('user', 'name email')
      .sort({ scanDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');

    const total = await WasteReport.countDocuments(query);

    res.json({
      success: true,
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch reports' 
    });
  }
});

// @desc    Update report status
// @route   PUT /api/waste-reports/:id/status
// @access  Private
router.put('/:id/status', 
  auth,
  [
    body('status').isIn(['pending', 'processed', 'recycled', 'disposed', 'rejected']).withMessage('Invalid status')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation failed',
          details: errors.array() 
        });
      }

      const { status, adminNotes } = req.body;
      
      const report = await WasteReport.findById(req.params.id);
      if (!report) {
        return res.status(404).json({ 
          success: false,
          error: 'Report not found' 
        });
      }

      // Check if user owns the report or is admin
      if (report.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          error: 'Access denied' 
        });
      }

      const session = await WasteReport.startSession();
      session.startTransaction();

      try {
        report.status = status;
        if (adminNotes && req.user.role === 'admin') {
          report.adminNotes = adminNotes;
        }
        await report.save({ session });

        // Create status update notification
        const notification = new Notification({
          user: report.user,
          title: 'Report Status Updated',
          message: `Your waste report status has been updated to: ${status}`,
          type: 'report_processed',
          relatedReport: report._id
        });
        await notification.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ 
          success: true, 
          message: 'Report status updated successfully',
          report 
        });

      } catch (transactionError) {
        await session.abortTransaction();
        session.endSession();
        throw transactionError;
      }

    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update report status' 
      });
    }
  }
);

// @desc    Update report details
// @route   PUT /api/waste-reports/:id
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { user_message, location } = req.body;
    
    const report = await WasteReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: 'Report not found' 
      });
    }

    // Check if user owns the report
    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    // Update allowed fields
    if (user_message !== undefined) {
      report.userMessage = user_message;
    }
    if (location !== undefined) {
      report.location = location;
    }

    await report.save();

    res.json({ 
      success: true, 
      message: 'Report updated successfully',
      report 
    });

  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update report' 
    });
  }
});

// @desc    Delete waste report
// @route   DELETE /api/waste-reports/:id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ 
        success: false,
        error: 'Report not found' 
      });
    }

    // Check if user owns the report or is admin
    if (report.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Access denied' 
      });
    }

    // Delete image from Cloudinary if exists
    if (report.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(report.cloudinaryId);
        console.log('✅ Image deleted from Cloudinary:', report.cloudinaryId);
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
        // Continue with deletion even if Cloudinary delete fails
      }
    }

    await WasteReport.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete report' 
    });
  }
});

// @desc    Get statistics for user's reports
// @route   GET /api/waste-reports/stats
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get total reports
    const totalReports = await WasteReport.countDocuments({ user: userId });
    
    // Get reports by status
    const reportsByStatus = await WasteReport.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    // Get reports by classification
    const reportsByClassification = await WasteReport.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$classification", count: { $sum: 1 } } }
    ]);
    
    // Get recent reports
    const recentReports = await WasteReport.find({ user: userId })
      .sort({ scanDate: -1 })
      .limit(5)
      .select('classification status scanDate classificationConfidence');
    
    // Get average confidence
    const avgConfidenceResult = await WasteReport.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, avgConfidence: { $avg: "$classificationConfidence" } } }
    ]);
    
    const avgConfidence = avgConfidenceResult.length > 0 ? avgConfidenceResult[0].avgConfidence : 0;
    
    res.json({
      success: true,
      stats: {
        totalReports,
        reportsByStatus: reportsByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        reportsByClassification: reportsByClassification.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        avgConfidence: Math.round(avgConfidence * 100),
        recentReports
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch statistics' 
    });
  }
});

// @desc    Search waste reports
// @route   GET /api/waste-reports/search
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const searchQuery = {
      user: req.user.id,
      $or: [
        { classification: { $regex: q, $options: 'i' } },
        { 'detectedObjects.label': { $regex: q, $options: 'i' } },
        { userMessage: { $regex: q, $options: 'i' } },
        { 'location.address': { $regex: q, $options: 'i' } }
      ]
    };
    
    const reports = await WasteReport.find(searchQuery)
      .sort({ scanDate: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-__v');
    
    const total = await WasteReport.countDocuments(searchQuery);
    
    res.json({
      success: true,
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasMore: (parseInt(page) * parseInt(limit)) < total
    });
  } catch (error) {
    console.error('Search reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search reports'
    });
  }
});

module.exports = router;