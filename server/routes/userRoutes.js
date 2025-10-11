const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary'); // ✅ Cloudinary config file
const router = express.Router();

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

// ==================== UPDATE PROFILE (with Cloudinary) ====================
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, bod, gender, address } = req.body;
    let profileUrl;

    // ✅ If user uploads an image (base64 or file path)
    if (req.body.profile) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(req.body.profile, {
          folder: 'user_profiles',
          resource_type: 'auto',
        });
        profileUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Error uploading to Cloudinary' });
      }
    }

    const updatedFields = {
      username,
      bod,
      gender,
      address,
    };

    if (profileUrl) {
      updatedFields.profile = profileUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedFields, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

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
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during profile update' });
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
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: `User status updated to ${status}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user status' });
  }
});

module.exports = router;
