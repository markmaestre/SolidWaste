const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat_attachments/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],
    transformation: [{ width: 2000, height: 2000, crop: 'limit' }]
  }
});

// Configure storage for documents
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat_attachments/documents',
    resource_type: 'raw',
    allowed_formats: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip', 'rar'],
    format: async (req, file) => {
      const ext = file.originalname.split('.').pop();
      return ext;
    },
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const name = file.originalname.split('.')[0];
      return `${uniqueSuffix}-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
  }
});

// Dynamic storage based on file type
const dynamicStorage = {
  _handleFile: async (req, file, cb) => {
    try {
      const isImage = file.mimetype.startsWith('image/');
      const storage = isImage ? imageStorage : documentStorage;
      
      // Use the appropriate storage's _handleFile method
      await storage._handleFile(req, file, cb);
    } catch (error) {
      cb(error);
    }
  },
  _removeFile: (req, file, cb) => {
    // Handle file removal if needed
    cb(null);
  }
};

// File filter for validation
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp|bmp/;
  const allowedDocumentTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar/;
  
  const isImage = allowedImageTypes.test(file.mimetype);
  const isDocument = allowedDocumentTypes.test(file.mimetype);
  
  if (isImage || isDocument) {
    cb(null, true);
  } else {
    cb(new Error('Only images and documents are allowed (max 50MB per file)'), false);
  }
};

// Create multer instance for multiple file uploads
const upload = multer({
  storage: dynamicStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per file
    files: 10 // Max 10 files per upload
  },
  fileFilter: fileFilter
});

// Multer middleware for handling attachments
const uploadAttachments = upload.array('attachments', 10);

// Alternative: Single file upload
const uploadSingleAttachment = upload.single('attachment');

// Export configured instances
module.exports = {
  cloudinary,
  imageStorage,
  documentStorage,
  upload,
  uploadAttachments,
  uploadSingleAttachment,
  dynamicStorage
};