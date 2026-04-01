// backend/routes/classify.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const sizeOf = require('image-size');

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Helper function to get image dimensions
const getImageDimensions = (imageBuffer) => {
  try {
    const dimensions = sizeOf(imageBuffer);
    return {
      width: dimensions.width,
      height: dimensions.height
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return { width: 640, height: 480 };
  }
};

// Helper function to process image and get classification
const processAndClassifyImage = async (imageBuffer, originalname = 'image.jpg') => {
  const tempDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempPath = path.join(tempDir, `${Date.now()}_${originalname}`);
  fs.writeFileSync(tempPath, imageBuffer);
  
  try {
    console.log('📤 Sending to Roboflow...');
    
    const imageBase64 = imageBuffer.toString('base64');
    const roboflowUrl = `https://detect.roboflow.com/datasets-u7013/3`;
    
    const rfRes = await axios({
      method: "POST",
      url: roboflowUrl,
      params: {
        api_key: process.env.ROBOFLOW_API_KEY,
        confidence: 0.25,
        overlap: 0.3,
      },
      data: imageBase64,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 30000
    });
    
    console.log('✅ Roboflow response received');
    console.log(`📊 Raw detections: ${rfRes.data.predictions?.length || 0}`);
    
    const imageDimensions = getImageDimensions(imageBuffer);
    console.log(`📐 Image dimensions: ${imageDimensions.width}x${imageDimensions.height}`);
    
    const processedPredictions = (rfRes.data.predictions || []).map((pred, index) => {
      const centerX = pred.x;
      const centerY = pred.y;
      const boxWidth = pred.width;
      const boxHeight = pred.height;
      
      const topLeftX = centerX - (boxWidth / 2);
      const topLeftY = centerY - (boxHeight / 2);
      const bottomRightX = centerX + (boxWidth / 2);
      const bottomRightY = centerY + (boxHeight / 2);
      
      const normalizedX = centerX / imageDimensions.width;
      const normalizedY = centerY / imageDimensions.height;
      const normalizedWidth = boxWidth / imageDimensions.width;
      const normalizedHeight = boxHeight / imageDimensions.height;
      
      const normalizedTopLeftX = topLeftX / imageDimensions.width;
      const normalizedTopLeftY = topLeftY / imageDimensions.height;
      const normalizedBottomRightX = bottomRightX / imageDimensions.width;
      const normalizedBottomRightY = bottomRightY / imageDimensions.height;
      
      console.log(`\n📦 Detection #${index + 1}: ${pred.class}`);
      console.log(`   Confidence: ${(pred.confidence * 100).toFixed(1)}%`);
      console.log(`   Pixel coordinates (center): x=${centerX}, y=${centerY}`);
      console.log(`   Pixel dimensions: w=${boxWidth}, h=${boxHeight}`);
      console.log(`   Pixel bounding box: [${topLeftX}, ${topLeftY}] to [${bottomRightX}, ${bottomRightY}]`);
      console.log(`   Normalized (0-1):`);
      console.log(`     Center: x=${normalizedX.toFixed(4)}, y=${normalizedY.toFixed(4)}`);
      console.log(`     Size: w=${normalizedWidth.toFixed(4)}, h=${normalizedHeight.toFixed(4)}`);
      console.log(`     Box: [${normalizedTopLeftX.toFixed(4)}, ${normalizedTopLeftY.toFixed(4)}] to [${normalizedBottomRightX.toFixed(4)}, ${normalizedBottomRightY.toFixed(4)}]`);
      
      return {
        class: pred.class,
        confidence: pred.confidence,
        x: normalizedX,
        y: normalizedY,
        width: normalizedWidth,
        height: normalizedHeight,
        pixelX: centerX,
        pixelY: centerY,
        pixelWidth: boxWidth,
        pixelHeight: boxHeight,
      };
    });
    
    const summary = {};
    processedPredictions.forEach(pred => {
      summary[pred.class] = (summary[pred.class] || 0) + 1;
    });
    
    console.log('\n📊 Detection Summary:');
    Object.entries(summary).forEach(([className, count]) => {
      console.log(`   ${className}: ${count} item(s)`);
    });
    
    const cloudRes = await cloudinary.uploader.upload(tempPath, { 
      folder: 'waste_images',
      resource_type: 'image'
    });
    
    return {
      predictions: processedPredictions,
      imageUrl: cloudRes.secure_url,
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      totalDetections: processedPredictions.length
    };
  } catch (error) {
    console.error('❌ Roboflow error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
};

router.post('/', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer;
    let filename = 'image.jpg';
    
    console.log('\n📸 ========== NEW CLASSIFICATION REQUEST ==========');
    
    if (req.file) {
      console.log('📸 File upload received:', req.file.originalname);
      console.log('File size:', req.file.size, 'bytes');
      imageBuffer = req.file.buffer;
      filename = req.file.originalname;
    } 
    else if (req.body && req.body.base64) {
      console.log('📸 Base64 image received');
      const base64Clean = req.body.base64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Clean, 'base64');
      filename = `image_${Date.now()}.jpg`;
      console.log('Base64 size:', imageBuffer.length, 'bytes');
    }
    else {
      return res.status(400).json({ error: 'No image data provided' });
    }
    
    if (!imageBuffer || imageBuffer.length === 0) {
      return res.status(400).json({ error: 'Invalid image data' });
    }
    
    const result = await processAndClassifyImage(imageBuffer, filename);
    
    console.log(`\n✅ Classification Complete!`);
    console.log(`   Total detections: ${result.totalDetections}`);
    console.log(`   Image size: ${result.imageWidth}x${result.imageHeight}`);
    console.log('=====================================\n');
    
    res.json({
      success: true,
      predictions: result.predictions,
      totalDetections: result.totalDetections,
      imageUrl: result.imageUrl,
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight
    });
    
  } catch (err) {
    console.error('❌ Classification error:', err.message);
    res.status(500).json({ 
      error: 'Error classifying image',
      message: err.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    roboflow_configured: !!process.env.ROBOFLOW_API_KEY,
    cloudinary_configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;