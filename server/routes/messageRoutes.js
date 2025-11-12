const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// 1️⃣ Get all users (for admin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('_id username email profile status role');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// 2️⃣ Get all admins (for user)
router.get('/admins', async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id username email profile role');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admins', error: err.message });
  }
});

// 3️⃣ Search users (for user-to-user)
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ message: 'Search query required' });
    }
    
    const results = await User.find({
      role: 'user',
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('_id username email profile role');
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// 4️⃣ Send message (FIXED: Use correct field names)
router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    
    // Validate required fields
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ message: 'senderId, receiverId, and text are required' });
    }
    
    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      message: text,
      timestamp: new Date()
    });
    
    await message.save();
    
    // Populate sender and receiver data
    await message.populate('sender receiver', 'username email profile');
    
    console.log('✅ Message sent from', senderId, 'to', receiverId);
    
    res.json({ 
      success: true, 
      message: {
        _id: message._id,
        senderId: message.sender._id,
        receiverId: message.receiver._id,
        text: message.message,
        timestamp: message.timestamp,
        read: message.read
      }
    });
  } catch (err) {
    console.error('❌ Send message error:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// 5️⃣ Get conversation between two users (FIXED: Correct field names)
router.get('/conversation/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .populate('sender receiver', 'username email profile')
    .sort({ timestamp: 1 })
    .lean();
    
    // Transform to match frontend expectations
    const transformedMessages = messages.map(msg => ({
      _id: msg._id,
      senderId: msg.sender._id,
      receiverId: msg.receiver._id,
      text: msg.message,
      timestamp: msg.timestamp,
      read: msg.read,
      createdAt: msg.timestamp
    }));
    
    res.json(transformedMessages);
  } catch (err) {
    console.error('❌ Get conversation error:', err);
    res.status(500).json({ message: 'Failed to fetch conversation', error: err.message });
  }
});

// 6️⃣ Mark messages as seen (FIXED: Correct field names)
router.put('/seen/:senderId/:receiverId', async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    
    const result = await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true } }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} messages as read`);
    
    res.json({ 
      success: true, 
      message: 'Messages marked as seen',
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    console.error('❌ Mark seen error:', err);
    res.status(500).json({ message: 'Failed to update seen status', error: err.message });
  }
});

// 7️⃣ NEW: Get conversations for a user
router.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all unique users this person has chatted with
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
    .populate('sender receiver', 'username email profile')
    .sort({ timestamp: -1 });
    
    // Group by conversation partner
    const conversationMap = {};
    
    messages.forEach(msg => {
      const otherUserId = msg.sender._id.toString() === userId ? msg.receiver._id : msg.sender._id;
      const otherUser = msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      
      if (!conversationMap[otherUserId]) {
        conversationMap[otherUserId] = {
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            email: otherUser.email,
            profile: otherUser.profile
          },
          lastMessage: {
            _id: msg._id,
            text: msg.message,
            timestamp: msg.timestamp,
            read: msg.read,
            senderId: msg.sender._id,
            receiverId: msg.receiver._id
          },
          unread: msg.receiver._id.toString() === userId && !msg.read
        };
      }
    });
    
    const conversations = Object.values(conversationMap);
    res.json(conversations);
  } catch (err) {
    console.error('❌ Get conversations error:', err);
    res.status(500).json({ message: 'Failed to fetch conversations', error: err.message });
  }
});

module.exports = router;