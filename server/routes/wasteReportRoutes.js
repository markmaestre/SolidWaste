const express    = require('express');
const router     = express.Router();
const { body, validationResult } = require('express-validator');
const cloudinary = require('cloudinary').v2;

const WasteReport  = require('../models/WasteReport');
const Notification = require('../models/Notification');
const auth         = require('../middleware/auth');
const { routeReport, BARANGAY_LABELS } = require('../utils/barangayRouter');

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: upload base64 image to Cloudinary
// ─────────────────────────────────────────────────────────────────────────────
async function uploadToCloudinary(imageData, userId) {
  const timestamp = Date.now();
  const randomId  = Math.floor(Math.random() * 10000);
  const publicId  = `waste_report_${userId}_${timestamp}_${randomId}`;

  const result = await cloudinary.uploader.upload(imageData, {
    folder:        'waste-reports',
    public_id:     publicId,
    resource_type: 'image',
    quality:       'auto:good',
    fetch_format:  'auto',
    transformation: [
      { width: 800, crop: 'limit' },
      { quality: 'auto' },
    ],
  });

  return { url: result.secure_url, publicId: result.public_id };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/waste-reports/detect
// Create a new waste detection report
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  '/detect',
  auth,
  [
    body('classification').notEmpty().withMessage('Classification is required'),
    body('classification_confidence')
      .custom((v) => { const n = parseFloat(v); return !isNaN(n) && n >= 0; })
      .withMessage('Confidence must be a valid non-negative number'),
  ],
  async (req, res) => {
    try {
      // ── Validation ────────────────────────────────────────────────────────
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const {
        image,
        detected_objects      = [],
        classification,
        classification_confidence,
        waste_composition     = {},
        material_breakdown    = {},
        recycling_tips        = [],
        location              = {},
        scan_date,
        user_message          = '',
        is_demo               = false,
        cloudinary_url,
        device_used           = '',
        // Barangay override: the frontend can pass a manually-selected key
        barangay_override,
      } = req.body;

      // ── Barangay routing ──────────────────────────────────────────────────
      const reportAddress = location?.address || req.user?.address || '';
      const routing = routeReport(reportAddress, classification, barangay_override);

      if (!routing.valid) {
        return res.status(422).json({
          success: false,
          error:   'Waste type not accepted at this location',
          reason:  routing.reason,
          barangay: routing.barangay,
          barangayLabel: routing.label,
        });
      }

      // ── Normalise confidence ──────────────────────────────────────────────
      let finalConfidence = parseFloat(classification_confidence);
      if (finalConfidence > 1) finalConfidence = finalConfidence / 100;

      const processedObjects = detected_objects.map((obj) => ({
        ...obj,
        confidence: obj.confidence > 1 ? obj.confidence / 100 : obj.confidence,
      }));

      // ── Resolve image URL ─────────────────────────────────────────────────
      let imageUrl    = '';
      let cloudinaryId = '';

      if (cloudinary_url) {
        // Flask backend already uploaded the image
        imageUrl = cloudinary_url;
        const parts = cloudinary_url.split('/');
        const fname = parts[parts.length - 1];
        cloudinaryId = `waste_detection/${fname.split('.')[0]}`;

      } else if (image && image.startsWith('data:image')) {
        // Raw base64 — upload from Node backend
        try {
          const uploaded = await uploadToCloudinary(image, req.user.id);
          imageUrl    = uploaded.url;
          cloudinaryId = uploaded.publicId;
        } catch (uploadErr) {
          console.error('Cloudinary upload error:', uploadErr);
          return res.status(500).json({
            success: false,
            error:   'Failed to upload image to cloud storage',
            details: uploadErr.message,
          });
        }

      } else if (image && (image.startsWith('http://') || image.startsWith('https://'))) {
        imageUrl = image;

      } else if (is_demo) {
        imageUrl = 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Demo+Waste+Image';

      } else {
        return res.status(400).json({ success: false, error: 'No valid image provided' });
      }

      // ── Persist with a transaction ────────────────────────────────────────
      const session = await WasteReport.startSession();
      session.startTransaction();

      try {
        const reportData = {
          user:                    req.user.id,
          userEmail:               req.user.email,
          image:                   imageUrl,
          cloudinaryId,
          detectedObjects:         processedObjects,
          classification,
          classificationConfidence: finalConfidence,
          wasteComposition:        waste_composition,
          materialBreakdown:       material_breakdown,
          recyclingTips:           recycling_tips,
          location,
          assignedBarangay:        routing.barangay,
          assignedBarangayLabel:   routing.label,
          userMessage:             user_message,
          deviceUsed:              device_used,
          status:                  'pending',
          isDemo:                  is_demo,
          scanDate:                scan_date ? new Date(scan_date) : new Date(),
        };

        const report = new WasteReport(reportData);
        await report.save({ session });

        // Notification
        const notification = new Notification({
          user:          req.user.id,
          title:         'Waste Report Created',
          message:       `Your ${classification} waste report has been assigned to ${routing.label}.`,
          type:          'report_created',
          relatedReport: report._id,
        });
        await notification.save({ session });

        await session.commitTransaction();
        session.endSession();

        const populated = await WasteReport.findById(report._id).populate('user', 'name email');

        return res.status(201).json({
          success:  true,
          message:  'Report successfully saved!',
          report:   populated,
          routing: {
            barangay:      routing.barangay,
            barangayLabel: routing.label,
          },
          notification: { id: notification._id, title: notification.title, message: notification.message },
        });

      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();

        if (txErr.name === 'ValidationError') {
          return res.status(400).json({ success: false, error: 'Data validation failed', details: txErr.errors });
        }
        if (txErr.code === 11000) {
          return res.status(400).json({ success: false, error: 'Duplicate entry found' });
        }
        throw txErr;
      }

    } catch (err) {
      console.error('Report creation error:', err);
      res.status(500).json({
        success: false,
        error:   'Failed to create waste report',
        details: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/waste-reports/barangay-check
// Pre-flight: check whether a classification is allowed at a given address
// before the user submits the full form.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/barangay-check', auth, (req, res) => {
  const { address, classification, barangay_override } = req.query;
  if (!address || !classification) {
    return res.status(400).json({ success: false, error: 'address and classification are required' });
  }
  const routing = routeReport(address, classification, barangay_override);
  res.json({ success: true, ...routing });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/waste-reports/my-reports
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, sort = 'newest' } = req.query;

    const query = { user: req.user.id };
    if (status && status !== 'all') query.status = status;

    const sortConfig = {
      newest:          { scanDate: -1 },
      oldest:          { scanDate:  1 },
      confidence_high: { classificationConfidence: -1 },
      confidence_low:  { classificationConfidence:  1 },
    }[sort] || { scanDate: -1 };

    const [reports, total] = await Promise.all([
      WasteReport.find(query)
        .sort(sortConfig)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('-__v'),
      WasteReport.countDocuments(query),
    ]);

    res.json({
      success: true, reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasMore: parseInt(page) * parseInt(limit) < total,
    });
  } catch (err) {
    console.error('Get user reports error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/waste-reports/stats/overview
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalReports, byStatus, byClassification, avgResult, recentReports] = await Promise.all([
      WasteReport.countDocuments({ user: userId }),
      WasteReport.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      WasteReport.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$classification', count: { $sum: 1 } } },
      ]),
      WasteReport.aggregate([
        { $match: { user: userId } },
        { $group: { _id: null, avg: { $avg: '$classificationConfidence' } } },
      ]),
      WasteReport.find({ user: userId })
        .sort({ scanDate: -1 })
        .limit(5)
        .select('classification status scanDate classificationConfidence assignedBarangayLabel'),
    ]);

    res.json({
      success: true,
      stats: {
        totalReports,
        reportsByStatus: byStatus.reduce((a, c) => { a[c._id] = c.count; return a; }, {}),
        reportsByClassification: byClassification.reduce((a, c) => { a[c._id] = c.count; return a; }, {}),
        avgConfidence: Math.round((avgResult[0]?.avg ?? 0) * 100),
        recentReports,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/waste-reports/search
// ─────────────────────────────────────────────────────────────────────────────
router.get('/search', auth, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    if (!q?.trim()) return res.status(400).json({ success: false, error: 'Search query is required' });

    const searchQuery = {
      user: req.user.id,
      $or: [
        { classification:             { $regex: q, $options: 'i' } },
        { 'detectedObjects.label':    { $regex: q, $options: 'i' } },
        { userMessage:                { $regex: q, $options: 'i' } },
        { 'location.address':         { $regex: q, $options: 'i' } },
        { assignedBarangayLabel:      { $regex: q, $options: 'i' } },
      ],
    };

    const [reports, total] = await Promise.all([
      WasteReport.find(searchQuery)
        .sort({ scanDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('-__v'),
      WasteReport.countDocuments(searchQuery),
    ]);

    res.json({
      success: true, reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      hasMore: parseInt(page) * parseInt(limit) < total,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, error: 'Failed to search reports' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/waste-reports/:id  — single report
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id).populate('user', 'name email');
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    // Owner OR admin of the assigned barangay
    const isOwner = report.user._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isScopedAdmin =
      req.user.role === 'barangay_admin' && req.user.barangay === report.assignedBarangay;

    if (!isOwner && !isAdmin && !isScopedAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/waste-reports  — admin list (scoped by barangay for barangay_admin)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const isGlobalAdmin   = req.user.role === 'admin';
    const isBarangayAdmin = req.user.role === 'barangay_admin';

    if (!isGlobalAdmin && !isBarangayAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { page = 1, limit = 10, status, user, dateFrom, dateTo, barangay } = req.query;

    const query = {};

    // Barangay admins are always scoped to their own barangay
    if (isBarangayAdmin) {
      query.assignedBarangay = req.user.barangay;
    } else if (barangay && barangay !== 'all') {
      query.assignedBarangay = barangay;
    }

    if (status && status !== 'all') query.status = status;
    if (user) query.user = user;

    if (dateFrom || dateTo) {
      query.scanDate = {};
      if (dateFrom) query.scanDate.$gte = new Date(dateFrom);
      if (dateTo)   query.scanDate.$lte = new Date(dateTo);
    }

    const [reports, total] = await Promise.all([
      WasteReport.find(query)
        .populate('user', 'name email')
        .sort({ scanDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select('-__v'),
      WasteReport.countDocuments(query),
    ]);

    res.json({
      success: true, reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (err) {
    console.error('Get all reports error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/waste-reports/:id/status
// ─────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id/status',
  auth,
  [body('status').isIn(['pending', 'processed', 'recycled', 'disposed', 'rejected']).withMessage('Invalid status')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, error: 'Validation failed', details: errors.array() });

      const { status, adminNotes } = req.body;
      const report = await WasteReport.findById(req.params.id);
      if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

      const isOwner         = report.user.toString() === req.user.id;
      const isAdmin         = req.user.role === 'admin';
      const isScopedAdmin   = req.user.role === 'barangay_admin' && req.user.barangay === report.assignedBarangay;

      if (!isOwner && !isAdmin && !isScopedAdmin) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const session = await WasteReport.startSession();
      session.startTransaction();
      try {
        report.status = status;
        if (adminNotes && (isAdmin || isScopedAdmin)) report.adminNotes = adminNotes;
        await report.save({ session });

        const notification = new Notification({
          user:          report.user,
          title:         'Report Status Updated',
          message:       `Your waste report status has been updated to: ${status}`,
          type:          'report_processed',
          relatedReport: report._id,
        });
        await notification.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.json({ success: true, message: 'Status updated', report });
      } catch (txErr) {
        await session.abortTransaction();
        session.endSession();
        throw txErr;
      }
    } catch (err) {
      console.error('Update status error:', err);
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/waste-reports/:id  — update user message / location
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { user_message, location } = req.body;
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    if (report.user.toString() !== req.user.id) return res.status(403).json({ success: false, error: 'Access denied' });

    if (user_message !== undefined) report.userMessage = user_message;
    if (location     !== undefined) report.location    = location;
    await report.save();

    res.json({ success: true, message: 'Report updated', report });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ success: false, error: 'Failed to update report' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/waste-reports/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await WasteReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    const isOwner       = report.user.toString() === req.user.id;
    const isAdmin       = req.user.role === 'admin';
    const isScopedAdmin = req.user.role === 'barangay_admin' && req.user.barangay === report.assignedBarangay;

    if (!isOwner && !isAdmin && !isScopedAdmin) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (report.cloudinaryId) {
      try { await cloudinary.uploader.destroy(report.cloudinaryId); } catch (e) { console.error('Cloudinary delete:', e); }
    }

    await WasteReport.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
});

module.exports = router;