const express = require('express');
const router = express.Router();
const WasteReport = require('../models/WasteReport');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Create waste detection report
router.post('/detect', auth, async (req, res) => {
  try {
    const {
      image,
      detected_objects,
      classification,
      classification_confidence,
      waste_composition,
      material_breakdown,
      recycling_tips,
      location
    } = req.body;

    const report = new WasteReport({
      user: req.user.id,
      userEmail: req.user.email,
      image,
      detectedObjects: detected_objects,
      classification,
      classificationConfidence: classification_confidence,
      wasteComposition: waste_composition,
      materialBreakdown: material_breakdown,
      recyclingTips: recycling_tips,
      location
    });

    await report.save();

    // Create notification
    const notification = new Notification({
      user: req.user.id,
      title: 'Waste Report Created',
      message: `Your waste detection report has been created successfully. Classification: ${classification}`,
      type: 'report_created',
      relatedReport: report._id
    });
    await notification.save();

    res.json({
      success: true,
      report: report,
      notification: notification
    });
  } catch (error) {
    console.error('Report creation error:', error);
    res.status(500).json({ error: 'Failed to create waste report' });
  }
});

// Get user's waste reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const reports = await WasteReport.find({ user: req.user.id })
      .sort({ scanDate: -1 });
    
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get all reports (admin)
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reports = await WasteReport.find()
      .populate('user', 'name email')
      .sort({ scanDate: -1 });
    
    res.json(reports);
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const report = await WasteReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = status;
    await report.save();

    // Create status update notification
    const notification = new Notification({
      user: report.user,
      title: 'Report Status Updated',
      message: `Your waste report status has been updated to: ${status}`,
      type: 'report_processed',
      relatedReport: report._id
    });
    await notification.save();

    res.json({ success: true, report });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

module.exports = router;