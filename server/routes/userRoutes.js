const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

const router = express.Router();

// Configure multer for memory storage
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
  const { username, email, password, bod, gender, address, role, pushToken } = req.body;

  try {
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

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
      bod: bod || '',
      gender: gender || '',
      address: address || '',
      role: role || 'user',
      pushToken: pushToken || null,
    });

    await newUser.save();
    
    console.log('✅ User registered:', email);
    console.log('📱 Push token:', pushToken ? `${pushToken.substring(0, 20)}...` : 'Not provided');
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ==================== LOGIN (FIXED VERSION) ====================
router.post('/login', async (req, res) => {
  const { email, password, pushToken } = req.body;
  
  console.log('🔐 Login attempt for:', email);
  console.log('📱 Push token provided:', pushToken ? `${pushToken.substring(0, 20)}...` : 'Not provided');
  
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'banned') {
      console.log('🚫 Banned user attempt:', email);
      return res.status(403).json({ message: 'Account is banned. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Update user data
    user.lastLogin = new Date();
    
    // Update push token if provided
    if (pushToken && pushToken !== '') {
      console.log('🔄 Updating push token for user:', user.email);
      user.pushToken = pushToken;
    }
    
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    console.log('✅ Login successful for:', user.email);
    console.log('📱 Current push token:', user.pushToken ? `${user.pushToken.substring(0, 20)}...` : 'Not set');

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
        pushToken: user.pushToken,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// ==================== UPDATE PUSH TOKEN ====================
router.put('/push-token', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;
    
    console.log('📱 Updating push token for user:', req.user.id);
    console.log('🔄 New push token:', pushToken ? `${pushToken.substring(0, 20)}...` : 'Removing token');

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        pushToken: pushToken || null 
      },
      { 
        new: true,
        runValidators: true 
      }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Push token updated successfully for user:', updatedUser.email);

    res.json({
      message: pushToken ? 'Push token updated successfully' : 'Push token removed successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        pushToken: updatedUser.pushToken,
      },
    });
  } catch (error) {
    console.error('❌ Push token update error:', error);
    res.status(500).json({ message: 'Server error during push token update' });
  }
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', auth, parseFormData, async (req, res) => {
  try {
    console.log('🔧 Profile update request received for user:', req.user.id);
    console.log('📦 Request body:', req.body);

    const { username, email, bod, gender, address, profile } = req.body;
    
    const updatedFields = {};

    // Handle text fields
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

    // Handle profile image
    if (profile !== undefined) {
      if (profile === '') {
        // Remove profile picture
        updatedFields.profile = null;
        console.log('🗑️ Removing profile picture');
      } else if (profile && profile.startsWith('data:image')) {
        // Upload new image
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

    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      updatedFields, 
      { 
        new: true,
        runValidators: true 
      }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ User updated successfully:', updatedUser.email);

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
        pushToken: updatedUser.pushToken,
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
        pushToken: user.pushToken,
      },
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user data' });
  }
});

// ==================== CHECK EMAIL ====================
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    res.json({ message: 'Email available' });
  } catch (error) {
    console.error('❌ Check email error:', error);
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
    
    console.log(`📊 Admin fetched ${users.length} users`);
    users.forEach(user => {
      console.log(`👤 ${user.email}: Push token ${user.pushToken ? '✅' : '❌'}`);
    });
    
    res.json(users);
  } catch (error) {
    console.error('❌ Get all users error:', error);
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

    console.log(`🔄 User ${user.email} status updated to: ${status}`);

    res.json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    console.error('❌ Ban user error:', error);
    res.status(500).json({ message: 'Error updating user status' });
  }
});

// ==================== GET USERS BY PUSH TOKENS ====================
router.get('/with-push-tokens', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const usersWithTokens = await User.find({ 
      pushToken: { $exists: true, $ne: null, $ne: '' } 
    }).select('username email pushToken role status');

    console.log(`📱 Found ${usersWithTokens.length} users with push tokens`);

    res.json({
      count: usersWithTokens.length,
      users: usersWithTokens
    });
  } catch (error) {
    console.error('❌ Get users with push tokens error:', error);
    res.status(500).json({ message: 'Server error fetching users with push tokens' });
  }
});

module.exports = router;