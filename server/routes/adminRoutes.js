const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Admin = require('../models/admin'); // Adjust path to your Admin model
const auth = require('../middleware/auth'); // Adjust path to your auth middleware

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for file upload (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Register Admin
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists with this email' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new admin
    const newAdmin = new Admin({
      email,
      password: hashedPassword,
      role: 'admin',
      lastLogin: new Date()
    });

    await newAdmin.save();

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: newAdmin._id, 
        email: newAdmin.email,
        role: newAdmin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        role: newAdmin.role,
        profile: newAdmin.profile,
        lastLogin: newAdmin.lastLogin
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Login Admin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Create JWT token
    const token = jwt.sign(
      { 
        userId: admin._id, 
        email: admin.email,
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        profile: admin.profile,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// Get Admin Profile
router.get('/profile', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.userId).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        profile: admin.profile,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching profile', error: error.message });
  }
});

// Update Admin Profile
router.put('/profile', auth, upload.single('profile'), async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findById(req.user.userId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Update email if provided
    if (email && email !== admin.email) {
      // Check if email already exists
      const emailExists = await Admin.findOne({ email, _id: { $ne: admin._id } });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      admin.email = email;
    }

    // Update password if provided
    if (password) {
      const saltRounds = 10;
      admin.password = await bcrypt.hash(password, saltRounds);
    }

    // Handle profile picture upload
    if (req.file) {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'admin-profiles',
            transformation: [
              { width: 500, height: 500, crop: 'limit' },
              { quality: 'auto' },
              { format: 'jpg' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(req.file.buffer);
      });

      admin.profile = result.secure_url;
    }

    await admin.save();

    // Return updated admin (excluding password)
    const updatedAdmin = await Admin.findById(admin._id).select('-password');

    res.json({
      message: 'Profile updated successfully',
      admin: {
        id: updatedAdmin._id,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        profile: updatedAdmin.profile,
        lastLogin: updatedAdmin.lastLogin
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile', error: error.message });
  }
});

// Delete Admin Profile Picture
router.delete('/profile/picture', auth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.userId);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Remove profile picture URL from database
    admin.profile = undefined;
    await admin.save();

    res.json({
      message: 'Profile picture removed successfully',
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        profile: admin.profile,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('Profile picture delete error:', error);
    res.status(500).json({ message: 'Server error removing profile picture', error: error.message });
  }
});

module.exports = router;