const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

const router = express.Router();

// Configure multer for memory storage (for form-data parsing)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Middleware to parse form-data
const parseFormData = upload.none();

// ==================== REGISTER ====================
router.post('/register', async (req, res) => {
  const { username, email, password, bod, gender, address, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      bod,
      gender,
      address,
      role,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Account is banned. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        gender: user.gender,
        bod: user.bod,
        address: user.address,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ==================== UPDATE PROFILE (FIXED VERSION) ====================
router.put('/profile', auth, parseFormData, async (req, res) => {
  try {
    console.log('🔧 Profile update request received for user:', req.user.id);
    console.log('📦 Request body:', req.body);

    const { username, email, bod, gender, address, profile } = req.body;
    
    const updatedFields = {};

    // ✅ Handle text fields - only update if they exist and are not empty
    if (username !== undefined && username !== '') {
      updatedFields.username = username;
      console.log('📝 Updating username:', username);
    }
    if (email !== undefined && email !== '') {
      updatedFields.email = email;
      console.log('📝 Updating email:', email);
    }
    if (bod !== undefined && bod !== '') {
      updatedFields.bod = bod;
      console.log('📝 Updating bod:', bod);
    }
    if (gender !== undefined && gender !== '') {
      updatedFields.gender = gender;
      console.log('📝 Updating gender:', gender);
    }
    if (address !== undefined && address !== '') {
      updatedFields.address = address;
      console.log('📝 Updating address:', address);
    }

    // ✅ Handle profile image update/removal
    if (profile !== undefined) {
      if (profile === '') {
        // User wants to remove profile picture
        updatedFields.profile = null;
        console.log('🗑️ Removing profile picture');
      } else if (profile && profile.startsWith('data:image')) {
        // User uploaded new image (base64)
        try {
          console.log('📸 Uploading new profile picture to Cloudinary...');
          const uploadResponse = await cloudinary.uploader.upload(profile, {
            folder: 'user_profiles',
            resource_type: 'image',
          });
          updatedFields.profile = uploadResponse.secure_url;
          console.log('✅ Image uploaded to Cloudinary:', uploadResponse.secure_url);
        } catch (uploadError) {
          console.error('❌ Cloudinary upload error:', uploadError);
          return res.status(500).json({ message: 'Error uploading image to Cloudinary' });
        }
      }
    }

    console.log('🔄 Fields to update:', updatedFields);

    // Check if there are any fields to update
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: updatedFields }, 
      { 
        new: true,
        runValidators: true 
      }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User updated successfully:', {
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profile: updatedUser.profile
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        gender: updatedUser.gender,
        bod: updatedUser.bod,
        address: updatedUser.address,
        profile: updatedUser.profile,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin,
      },
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update: ' + error.message });
  }
});

// ==================== GET CURRENT USER PROFILE ====================
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        gender: user.gender,
        bod: user.bod,
        address: user.address,
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user data' });
  }
});

// ==================== CHECK EMAIL ====================
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    res.json({ message: 'Email available' });
  } catch (error) {
    res.status(500).json({ message: 'Error checking email' });
  }
});

// ==================== GET ALL USERS (Admin only) ====================
router.get('/all-users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// ==================== BAN / ACTIVATE USER ====================
router.put('/ban/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  const { status } = req.body;

  if (!['banned', 'active'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status' });
  }
});

module.exports = router;