const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { cloudinary } = require('../config/cloudinary');
const multer = require('multer');
const { generateVerificationCode, sendVerificationEmail } = require('../config/emailService');

const router = express.Router();

// ==================== MULTER CONFIGURATION ====================
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
      cb(new Error('Only images are allowed'), false);
    }
  }
});

// Middleware to parse form-data
const parseFormData = upload.none();
const uploadSingleImage = upload.single('profile');

// ==================== REGISTER (SEND VERIFICATION CODE) ====================
// ==================== REGISTER (SEND VERIFICATION CODE) ====================
router.post('/register', async (req, res) => {
  const { username, email, password, bod, gender, address, role, pushToken, barangay, fullAddress } = req.body;

  console.log('=========================================');
  console.log('📝 REGISTRATION ATTEMPT RECEIVED!');
  console.log('📧 Email:', email);
  console.log('👤 Username:', username);
  console.log('📍 Address (combined):', address);
  console.log('📍 Full Address:', fullAddress);
  console.log('📍 Barangay (separate):', barangay);
  console.log('🔑 Password length:', password ? password.length : 0);
  console.log('=========================================');

  try {
    // Validate required fields
    if (!username || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Process address fields - prioritize separate fields if provided
    let finalFullAddress = '';
    let finalBarangay = '';
    let finalAddress = '';

    // Check if separate fields are provided (from frontend)
    if (fullAddress && barangay) {
      finalFullAddress = fullAddress;
      finalBarangay = barangay;
      finalAddress = `${fullAddress}, ${barangay}`;
      console.log('✅ Using separate address fields');
    } 
    // Check if separate barangay is provided
    else if (barangay && !fullAddress) {
      finalBarangay = barangay;
      finalAddress = barangay;
      console.log('✅ Using only barangay field');
    }
    // Check if combined address is provided
    else if (address && typeof address === 'string') {
      finalAddress = address;
      
      // Try to parse the combined address
      if (address.includes(',')) {
        const parts = address.split(',');
        finalFullAddress = parts[0].trim();
        finalBarangay = parts.slice(1).join(',').trim();
        console.log('✅ Parsed combined address:', { finalFullAddress, finalBarangay });
      } else {
        // Check if the address is actually a barangay
        if (address === 'South Signal' || address === 'Central Bicutan') {
          finalBarangay = address;
          finalFullAddress = '';
        } else {
          finalFullAddress = address;
          finalBarangay = '';
        }
        console.log('✅ Address without comma:', { finalFullAddress, finalBarangay });
      }
    }
    else {
      return res.status(400).json({ message: 'Address information is required' });
    }

    // Validate barangay if provided
    if (finalBarangay && !['South Signal', 'Central Bicutan'].includes(finalBarangay)) {
      console.log('❌ Invalid barangay:', finalBarangay);
      return res.status(400).json({ message: 'Please select a valid barangay (South Signal or Central Bicutan)' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification code (6 digits)
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    
    console.log('🔑 Generated verification code:', verificationCode);
    console.log('⏰ Code expires at:', verificationExpires);

    // Send verification email
    console.log('📧 Attempting to send email to:', email);
    try {
      const emailResult = await sendVerificationEmail(email, verificationCode);
      console.log('✅ Email sent successfully!');
      console.log('   Message ID:', emailResult.messageId);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please check your email address and try again.' 
      });
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      bod: bod || '',
      gender: gender || '',
      address: finalAddress, // Store the combined address
      fullAddress: finalFullAddress || '', // Store only the full address part
      barangay: finalBarangay || '', // Store only the barangay part
      role: role || 'user',
      pushToken: pushToken || null,
      status: 'pending',
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
    });

    await newUser.save();
    
    console.log('✅ User saved to database with ID:', newUser._id);
    console.log('✅ Registration complete for:', email);
    console.log('   Full Address:', finalFullAddress);
    console.log('   Barangay:', finalBarangay);
    console.log('   Combined Address:', finalAddress);
    console.log('=========================================');
    
    res.status(201).json({ 
      message: 'Verification code sent to your email. Please verify to complete registration.',
      userId: newUser._id,
      email: newUser.email
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ message: 'Server error during registration: ' + error.message });
  }
});
// ==================== VERIFY EMAIL CODE ====================
router.post('/verify-email', async (req, res) => {
  const { email, verificationCode } = req.body;

  console.log('=========================================');
  console.log('🔐 VERIFICATION ATTEMPT:');
  console.log('📧 Email:', email);
  console.log('🔑 Code provided:', verificationCode);
  console.log('=========================================');

  try {
    if (!email || !verificationCode) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      console.log('⚠️ Email already verified:', email);
      return res.status(400).json({ message: 'Email already verified' });
    }

    console.log('📝 Stored code:', user.emailVerificationCode);
    console.log('⏰ Code expires:', user.emailVerificationExpires);
    console.log('🕐 Current time:', new Date());

    if (user.emailVerificationCode !== verificationCode) {
      console.log('❌ Invalid verification code');
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.emailVerificationExpires < new Date()) {
      console.log('❌ Verification code expired');
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Update user as verified
    user.isEmailVerified = true;
    user.status = 'active';
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    console.log('✅ Email verified successfully for:', user.email);
    console.log('=========================================');

    res.json({ 
      message: 'Email verified successfully! You can now login.'
    });
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// ==================== RESEND VERIFICATION CODE ====================
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;

  console.log('=========================================');
  console.log('🔄 RESEND CODE REQUEST for:', email);
  console.log('=========================================');

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      console.log('⚠️ Email already verified:', email);
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log('🔑 New verification code:', verificationCode);

    // Send new verification email
    try {
      await sendVerificationEmail(email, verificationCode);
      console.log('✅ New code sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
      return res.status(500).json({ message: 'Failed to send verification email' });
    }

    // Update user with new code
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    console.log('📧 Resent verification code to:', email);
    console.log('=========================================');

    res.json({ 
      message: 'New verification code sent to your email'
    });
  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({ message: 'Failed to resend verification code' });
  }
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  const { email, password, pushToken } = req.body;
  
  console.log('=========================================');
  console.log('🔐 Login attempt for:', email);
  console.log('=========================================');
  
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      console.log('⚠️ Email not verified:', email);
      return res.status(403).json({ 
        message: 'Please verify your email before logging in',
        requiresVerification: true,
        email: user.email
      });
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

    // Update last login and push token
    user.lastLogin = new Date();
    
    if (pushToken && pushToken !== '') {
      console.log('🔄 Updating push token for user:', user.email);
      user.pushToken = pushToken;
    }
    
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    console.log('✅ Login successful for:', user.email);
    console.log('=========================================');

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
        fullAddress: user.fullAddress || '',
        barangay: user.barangay || '',
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        status: user.status,
        pushToken: user.pushToken,
        isEmailVerified: user.isEmailVerified,
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

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { pushToken: pushToken || null },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Push token updated for:', updatedUser.email);

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

// ==================== UPLOAD PROFILE IMAGE (NEW) ====================
router.post('/upload-profile-image', auth, (req, res) => {
  uploadSingleImage(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'user_profiles',
            transformation: [{ width: 500, height: 500, crop: 'limit' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        
        uploadStream.end(req.file.buffer);
      });
      
      // Update user's profile field
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id, 
        { profile: result.secure_url },
        { new: true }
      ).select('-password');
      
      res.json({ 
        message: 'Profile image uploaded successfully',
        profileUrl: result.secure_url,
        user: updatedUser
      });
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ message: 'Failed to upload image: ' + error.message });
    }
  });
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', auth, parseFormData, async (req, res) => {
  try {
    console.log('🔧 Profile update for user:', req.user.id);
    console.log('📦 Received fields:', Object.keys(req.body));
    console.log('📦 Received body:', req.body);
    
    const { username, email, bod, gender, address, barangay, fullAddress, profile } = req.body;
    
    const updatedFields = {};

    // Update basic fields
    if (username !== undefined && username !== '') {
      updatedFields.username = username;
    }
    if (email !== undefined && email !== '') {
      updatedFields.email = email;
    }
    if (bod !== undefined && bod !== '') {
      updatedFields.bod = bod;
    }
    if (gender !== undefined && gender !== '') {
      updatedFields.gender = gender;
    }
    
    // Handle profile URL (now just a string, not base64)
    if (profile !== undefined) {
      updatedFields.profile = profile === '' ? null : profile;
    }
    
    // Handle address fields
    if (fullAddress !== undefined || barangay !== undefined) {
      let finalFullAddress = fullAddress !== undefined ? fullAddress : '';
      let finalBarangay = barangay !== undefined ? barangay : '';
      let finalAddress = '';
      
      const currentUser = await User.findById(req.user.id);
      if (fullAddress === undefined && currentUser) {
        finalFullAddress = currentUser.fullAddress || '';
      }
      if (barangay === undefined && currentUser) {
        finalBarangay = currentUser.barangay || '';
      }
      
      if (finalBarangay && !['South Signal', 'Central Bicutan'].includes(finalBarangay)) {
        return res.status(400).json({ message: 'Invalid barangay option. Must be South Signal or Central Bicutan' });
      }
      
      if (finalFullAddress && finalBarangay) {
        finalAddress = `${finalFullAddress}, ${finalBarangay}`;
      } else if (finalFullAddress) {
        finalAddress = finalFullAddress;
      } else if (finalBarangay) {
        finalAddress = finalBarangay;
      }
      
      if (finalFullAddress !== undefined) updatedFields.fullAddress = finalFullAddress;
      if (finalBarangay !== undefined) updatedFields.barangay = finalBarangay;
      if (finalAddress) updatedFields.address = finalAddress;
    }
    else if (address !== undefined && typeof address === 'string') {
      const addressParts = address.split(',');
      let finalFullAddress = address;
      let finalBarangay = '';
      
      if (addressParts.length >= 2) {
        finalFullAddress = addressParts[0].trim();
        finalBarangay = addressParts.slice(1).join(',').trim();
        
        if (finalBarangay && !['South Signal', 'Central Bicutan'].includes(finalBarangay)) {
          return res.status(400).json({ message: 'Invalid barangay option. Must be South Signal or Central Bicutan' });
        }
        
        updatedFields.fullAddress = finalFullAddress;
        updatedFields.barangay = finalBarangay;
        updatedFields.address = address;
      } else {
        updatedFields.address = address;
      }
    }

    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    console.log('📝 Updating fields:', Object.keys(updatedFields));
    console.log('📝 Update values:', updatedFields);
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      updatedFields, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Profile updated for:', updatedUser.email);
    console.log('   Full Address:', updatedUser.fullAddress);
    console.log('   Barangay:', updatedUser.barangay);
    console.log('   Combined Address:', updatedUser.address);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        gender: updatedUser.gender,
        bod: updatedUser.bod,
        address: updatedUser.address,
        fullAddress: updatedUser.fullAddress || '',
        barangay: updatedUser.barangay || '',
        profile: updatedUser.profile,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin,
        pushToken: updatedUser.pushToken,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    console.error('Error stack:', error.stack);
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
        fullAddress: user.fullAddress || '',
        barangay: user.barangay || '',
        profile: user.profile,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        status: user.status,
        pushToken: user.pushToken,
        isEmailVerified: user.isEmailVerified,
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
      if (!existingUser.isEmailVerified) {
        return res.status(400).json({ message: 'Email already registered but not verified' });
      }
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

// ==================== GET USERS WITH PUSH TOKENS (Admin only) ====================
router.get('/with-push-tokens', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const usersWithTokens = await User.find({ 
      pushToken: { $exists: true, $ne: null, $ne: '' } 
    }).select('username email pushToken role status');

    console.log(`📱 Found ${usersWithTokens.length} users with push tokens`);
    res.json({ count: usersWithTokens.length, users: usersWithTokens });
  } catch (error) {
    console.error('❌ Get users with push tokens error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

module.exports = router;