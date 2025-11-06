const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const WasteReport = require('../models/WasteReport');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

// @desc    Create waste detection report with image upload
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
        scan_date
      } = req.body;

      console.log('📊 Processing report data:', {
        classification,
        confidence: classification_confidence,
        confidenceType: typeof classification_confidence,
        objectsCount: detected_objects.length,
        hasImage: !!image
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

      // Upload image to Cloudinary if it's base64
      if (image && image.startsWith('data:image')) {
        try {
          console.log('☁️ Uploading image to Cloudinary...');
          const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'waste-reports',
            resource_type: 'image',
            quality: 'auto:good',
            fetch_format: 'auto'
          });
          imageUrl = uploadResponse.secure_url;
          cloudinaryId = uploadResponse.public_id;
          console.log('✅ Image uploaded to Cloudinary:', uploadResponse.secure_url);
        } catch (uploadError) {
          console.error('❌ Cloudinary upload error:', uploadError);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image to cloud storage',
            details: uploadError.message
          });
        }
      } else if (image && (image.startsWith('file://') || image.startsWith('content://'))) {
        // Handle file URIs from mobile - convert to base64 or handle differently
        console.log('📱 Handling mobile file URI - skipping Cloudinary upload');
        // For mobile file URIs, we'll use the URI directly or you might want to implement file upload
        imageUrl = image;
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
          status: 'pending'
        };

        // Add scan date if provided
        if (scan_date) {
          reportData.scanDate = new Date(scan_date);
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


router.get('/my-reports', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { user: req.user.id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const reports = await WasteReport.find(query)
      .sort({ scanDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
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

    const { page = 1, limit = 10, status, user } = req.query;
    
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (user) query.user = user;

    const reports = await WasteReport.find(query)
      .populate('user', 'name email')
      .sort({ scanDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
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
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
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

module.exports = router;