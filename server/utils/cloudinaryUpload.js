const cloudinary = require('../config/cloudinary').cloudinary;
const stream = require('stream');

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {string} originalName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} Upload result
 */
const uploadBufferToCloudinary = async (buffer, originalName, mimeType) => {
  return new Promise((resolve, reject) => {
    const isImage = mimeType.startsWith('image/');
    const uploadOptions = {
      folder: isImage ? 'chat_attachments/images' : 'chat_attachments/documents',
      resource_type: isImage ? 'image' : 'raw',
      public_id: `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.]/g, '_')}`
    };

    // Add image transformations for images
    if (isImage) {
      uploadOptions.transformation = [
        { width: 2000, height: 2000, crop: 'limit' }
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = new stream.Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Generate thumbnail URL for image
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} Thumbnail URL
 */
const getThumbnailUrl = (publicId) => {
  return cloudinary.url(publicId, {
    width: 200,
    height: 200,
    crop: 'thumb',
    gravity: 'face'
  });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image or raw)
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadBufferToCloudinary,
  getThumbnailUrl,
  deleteFromCloudinary
};