const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');

// 1️⃣ Get all users (for admin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('username email profile status');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// 2️⃣ Get all admins (for user)
router.get('/admins', async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('username email profile');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admins', error: err.message });
  }
});

// 3️⃣ Search users (for user-to-user)
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const results = await User.find({
      role: 'user',
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username email profile');
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// 4️⃣ Send message
router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    
    // Validate required fields
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ message: 'senderId, receiverId, and text are required' });
    }

    // Validate that users exist
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);
    
    if (!sender || !receiver) {
      return res.status(404).json({ message: 'Sender or receiver not found' });
    }

    const message = new Message({ 
      sender: senderId, 
      receiver: receiverId, 
      message: text 
    });
    
    await message.save();
    
    // Populate sender information
    await message.populate('sender', 'username email profile');
    await message.populate('receiver', 'username email profile');
    
    res.json({ 
      success: true, 
      message: {
        _id: message._id,
        senderId: message.sender._id,
        receiverId: message.receiver._id,
        text: message.message,
        timestamp: message.timestamp,
        read: message.read,
        sender: message.sender,
        receiver: message.receiver
      }
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// 5️⃣ Get conversation between two users
router.get('/conversation/:userId/:otherUserId', async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    })
    .populate('sender', 'username email profile')
    .populate('receiver', 'username email profile')
    .sort({ timestamp: 1 });

    // Filter out any messages with null sender/receiver (corrupted data)
    const validMessages = messages.filter(msg => 
      msg.sender && msg.receiver && 
      msg.sender._id && msg.receiver._id
    );

    // Transform the data to match frontend expectations
    const transformedMessages = validMessages.map(msg => ({
      _id: msg._id,
      senderId: msg.sender._id,
      receiverId: msg.receiver._id,
      text: msg.message,
      timestamp: msg.timestamp,
      read: msg.read,
      sender: msg.sender,
      receiver: msg.receiver
    }));

    res.json(transformedMessages);
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ message: 'Failed to fetch conversation', error: err.message });
  }
});

// 6️⃣ Get user's conversations list - FIXED VERSION
router.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all messages where user is either sender or receiver
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    })
    .populate('sender', 'username email profile')
    .populate('receiver', 'username email profile')
    .sort({ timestamp: -1 });

    // Group messages by the other user
    const conversationsMap = new Map();

    messages.forEach(message => {
      // Skip messages with null sender or receiver
      if (!message.sender || !message.receiver) {
        console.log('Skipping message with null sender/receiver:', message._id);
        return;
      }

      // Skip if populated fields are null
      if (!message.sender._id || !message.receiver._id) {
        console.log('Skipping message with null populated fields:', message._id);
        return;
      }

      // Determine the other user in the conversation
      const otherUser = message.sender._id.toString() === userId ? message.receiver : message.sender;
      const otherUserId = otherUser._id.toString();

      // If we haven't seen this conversation yet, initialize it
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            email: otherUser.email,
            profile: otherUser.profile
          },
          lastMessage: {
            _id: message._id,
            text: message.message,
            timestamp: message.timestamp,
            read: message.read,
            sender: message.sender._id
          },
          timestamp: message.timestamp,
          unread: message.sender._id.toString() !== userId && !message.read
        });
      } else {
        // Update unread status if there are unread messages from this user
        const existingConv = conversationsMap.get(otherUserId);
        if (message.sender._id.toString() !== userId && !message.read) {
          existingConv.unread = true;
        }
        
        // Update last message if this message is newer
        if (new Date(message.timestamp) > new Date(existingConv.timestamp)) {
          existingConv.lastMessage = {
            _id: message._id,
            text: message.message,
            timestamp: message.timestamp,
            read: message.read,
            sender: message.sender._id
          };
          existingConv.timestamp = message.timestamp;
        }
      }
    });

    // Convert map to array and sort by timestamp
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`Found ${conversations.length} conversations for user ${userId}`);
    
    res.json(conversations);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ message: 'Failed to fetch conversations', error: err.message });
  }
});

// 7️⃣ Mark messages as read
router.put('/read/:senderId/:receiverId', async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    
    await Message.updateMany(
      { 
        sender: senderId, 
        receiver: receiverId, 
        read: false 
      },
      { 
        $set: { read: true } 
      }
    );
    
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Failed to update read status', error: err.message });
  }
});

// 8️⃣ Clean up corrupted messages (run this once)
router.delete('/cleanup-corrupted-messages', async (req, res) => {
  try {
    // Find and delete messages where sender or receiver is null
    const result = await Message.deleteMany({
      $or: [
        { sender: null },
        { receiver: null },
        { sender: { $exists: false } },
        { receiver: { $exists: false } }
      ]
    });
    
    console.log(`Cleaned up ${result.deletedCount} corrupted messages`);
    res.json({ 
      success: true, 
      message: `Cleaned up ${result.deletedCount} corrupted messages` 
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ message: 'Cleanup failed', error: err.message });
  }
});

// 9️⃣ Get message statistics (for debugging)
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const totalMessages = await Message.countDocuments({
      $or: [
        { sender: userId },
        { receiver: userId }
      ]
    });
    
    const corruptedMessages = await Message.countDocuments({
      $or: [
        { sender: null },
        { receiver: null }
      ]
    });
    
    res.json({
      totalMessages,
      corruptedMessages,
      userId
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Failed to get stats', error: err.message });
  }
});

module.exports = router;