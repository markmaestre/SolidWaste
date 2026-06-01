const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const Admin = require('../models/admin');
const auth = require('../middleware/auth');

// ==================== HELPER FUNCTIONS ====================

// Helper function to find user in either User or Admin collection with full details
const findUserById = async (userId) => {
  try {
    let user = await User.findById(userId);
    if (user) {
      return {
        ...user.toObject(),
        userType: 'User',
        username: user.username,
        email: user.email,
        role: 'user',
        barangay: user.barangay
      };
    }

    let admin = await Admin.findById(userId);
    if (admin) {
      return {
        ...admin.toObject(),
        userType: 'Admin',
        username: admin.email.split('@')[0],
        email: admin.email,
        role: admin.role,
        barangay: admin.assignedBarangayLabel
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
};

// Helper function to get user details with type
const getUserDetails = async (userId, userModel) => {
  if (userModel === 'User') {
    const user = await User.findById(userId).select('username email barangay role profile');
    if (user) {
      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        barangay: user.barangay,
        role: 'user',
        userType: 'User'
      };
    }
  } else if (userModel === 'Admin') {
    const admin = await Admin.findById(userId).select('email role assignedBarangay assignedBarangayLabel profile');
    if (admin) {
      return {
        _id: admin._id,
        username: admin.email.split('@')[0],
        email: admin.email,
        barangay: admin.assignedBarangayLabel,
        role: admin.role,
        userType: 'Admin'
      };
    }
  }
  return null;
};

// Helper function to determine sender details
const getSenderDetails = async (senderId) => {
  let user = await User.findById(senderId);
  if (user) {
    return {
      senderModel: 'User',
      senderRole: 'user',
      senderBarangay: user.barangay || null
    };
  }

  let admin = await Admin.findById(senderId);
  if (admin) {
    return {
      senderModel: 'Admin',
      senderRole: admin.role,
      senderBarangay: admin.assignedBarangayLabel || null
    };
  }

  return null;
};

// Helper function to determine receiver details
const getReceiverDetails = async (receiverId) => {
  let user = await User.findById(receiverId);
  if (user) {
    return {
      receiverModel: 'User',
      receiverRole: 'user',
      receiverBarangay: user.barangay || null
    };
  }

  let admin = await Admin.findById(receiverId);
  if (admin) {
    return {
      receiverModel: 'Admin',
      receiverRole: admin.role,
      receiverBarangay: admin.assignedBarangayLabel || null
    };
  }

  return null;
};

// Helper function to get barangay context
const getBarangayContext = (senderBarangay, receiverBarangay, senderRole, receiverRole) => {
  if (senderBarangay && receiverBarangay && senderBarangay === receiverBarangay) {
    return senderBarangay;
  }
  
  if (senderRole === 'user' && receiverRole !== 'user') {
    return senderBarangay;
  }
  
  if (senderRole !== 'user' && receiverRole === 'user') {
    return receiverBarangay;
  }
  
  return null;
};

// ==================== ROUTES ====================

// 1️⃣ Get all users for messaging (FILTERED BY BARANGAY FOR ADMINS)
router.get('/users', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user.userId;
    
    const currentUserInfo = await findUserById(currentUserId);
    
    if (!currentUserInfo) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Fetching users for:', currentUserInfo.email, 'Role:', currentUserInfo.role);
    
    let users = [];
    let admins = [];
    
    const allUsers = await User.find({ _id: { $ne: currentUserId } })
      .select('username email profile role barangay status');
    
    let allAdmins = await Admin.find({ _id: { $ne: currentUserId } })
      .select('email profile role assignedBarangay assignedBarangayLabel');
    
    if (currentUserInfo.userType === 'Admin') {
      if (currentUserInfo.role === 'southadmin') {
        users = allUsers.filter(user => user.barangay === 'South Signal');
        admins = allAdmins.filter(admin => 
          admin.assignedBarangayLabel === 'South Signal, Taguig' ||
          admin.role === 'admin'
        );
      } 
      else if (currentUserInfo.role === 'centraladmin') {
        users = allUsers.filter(user => user.barangay === 'Central Bicutan');
        admins = allAdmins.filter(admin => 
          admin.assignedBarangayLabel === 'Central Signal, Taguig' ||
          admin.role === 'admin'
        );
      }
      else if (currentUserInfo.role === 'admin') {
        users = allUsers;
        admins = allAdmins;
      }
    } else {
      users = allUsers;
      admins = allAdmins;
    }
    
    const formattedAdmins = admins.map(admin => ({
      _id: admin._id,
      username: admin.email.split('@')[0],
      email: admin.email,
      profile: admin.profile,
      role: admin.role,
      userType: 'Admin',
      barangay: admin.assignedBarangayLabel,
      status: 'active'
    }));
    
    const formattedUsers = users.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      role: 'user',
      userType: 'User',
      barangay: user.barangay,
      status: user.status
    }));
    
    const allUsersList = [...formattedUsers, ...formattedAdmins];
    console.log(`Found ${allUsersList.length} contacts for ${currentUserInfo.role}`);
    
    res.json(allUsersList);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// 2️⃣ Search users - with barangay filtering
router.get('/search', auth, async (req, res) => {
  try {
    const query = req.query.q;
    const currentUserId = req.user.id || req.user.userId;
    
    console.log('🔍 Searching users with query:', query, 'by user:', currentUserId);
    
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }
    
    const currentUserInfo = await findUserById(currentUserId);
    
    // Search in User collection
    let userResults = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username email profile role barangay status');
    
    // Search in Admin collection
    let adminResults = await Admin.find({
      _id: { $ne: currentUserId },
      $or: [
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('email profile role assignedBarangay assignedBarangayLabel');
    
    // Format admin results
    const formattedAdminResults = adminResults.map(admin => ({
      _id: admin._id,
      username: admin.email.split('@')[0],
      email: admin.email,
      profile: admin.profile,
      role: admin.role,
      userType: 'Admin',
      barangay: admin.assignedBarangayLabel,
      status: 'active'
    }));
    
    // Format user results
    const formattedUserResults = userResults.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      role: 'user',
      userType: 'User',
      barangay: user.barangay,
      status: user.status
    }));
    
    // Combine results
    let allResults = [...formattedUserResults, ...formattedAdminResults];
    
    // FILTER based on admin's barangay
    if (currentUserInfo && currentUserInfo.userType === 'Admin') {
      if (currentUserInfo.role === 'southadmin') {
        allResults = allResults.filter(user => {
          if (user.userType === 'Admin') {
            return user.barangay === 'South Signal, Taguig' || user.role === 'admin';
          } else {
            return user.barangay === 'South Signal';
          }
        });
      } 
      else if (currentUserInfo.role === 'centraladmin') {
        allResults = allResults.filter(user => {
          if (user.userType === 'Admin') {
            return user.barangay === 'Central Signal, Taguig' || user.role === 'admin';
          } else {
            return user.barangay === 'Central Bicutan';
          }
        });
      }
    }
    
    console.log(`✅ Search found ${allResults.length} results for "${query}"`);
    res.json(allResults);
    
  } catch (err) {
    console.error('❌ Search error:', err);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// 3️⃣ Get conversations list - IMPORTANT: This must be defined BEFORE /conversation/:otherUserId
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const currentUserInfo = await findUserById(userId);
    
    if (!currentUserInfo) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Fetching conversations for user:', userId, 'Role:', currentUserInfo.role);
    
    let matchQuery = {
      $or: [
        { sender: new mongoose.Types.ObjectId(userId) },
        { receiver: new mongoose.Types.ObjectId(userId) }
      ],
      isDeletedBySender: { $ne: true },
      isDeletedByReceiver: { $ne: true }
    };
    
    if (currentUserInfo.userType === 'Admin' && currentUserInfo.role !== 'admin') {
      matchQuery.barangayContext = currentUserInfo.barangay?.split(',')[0] || currentUserInfo.barangay;
    }
    
    const conversations = await Message.aggregate([
      { $match: matchQuery },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
              then: {
                id: "$receiver",
                model: "$receiverModel",
                role: "$receiverRole",
                barangay: "$receiverBarangay"
              },
              else: {
                id: "$sender",
                model: "$senderModel",
                role: "$senderRole",
                barangay: "$senderBarangay"
              }
            }
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ["$sender", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$read", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const userInfo = await getUserDetails(conv._id.id, conv._id.model);
        if (!userInfo) return null;
        
        return {
          user: userInfo,
          lastMessage: {
            _id: conv.lastMessage._id,
            text: conv.lastMessage.message,
            timestamp: conv.lastMessage.timestamp,
            read: conv.lastMessage.read,
            sender: conv.lastMessage.sender,
            senderRole: conv.lastMessage.senderRole
          },
          unread: conv.unreadCount > 0,
          unreadCount: conv.unreadCount,
          timestamp: conv.lastMessage.timestamp
        };
      })
    );
    
    const validConversations = populatedConversations.filter(conv => conv !== null);
    console.log(`Found ${validConversations.length} conversations`);
    
    res.json(validConversations);
    
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ message: 'Failed to fetch conversations', error: err.message });
  }
});

// 4️⃣ Get conversation between users (This should come AFTER /conversations)
router.get('/conversation/:otherUserId', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const otherUserId = req.params.otherUserId;
    const currentUserInfo = await findUserById(userId);
    
    console.log('Fetching conversation between:', userId, 'and', otherUserId);
    
    if (!mongoose.Types.ObjectId.isValid(otherUserId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    let query = {
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ],
      isDeletedBySender: false,
      isDeletedByReceiver: false
    };
    
    if (currentUserInfo.userType === 'Admin' && currentUserInfo.role !== 'admin') {
      query.barangayContext = currentUserInfo.barangay?.split(',')[0] || currentUserInfo.barangay;
    }
    
    const messages = await Message.find(query).sort({ timestamp: 1 });
    
    const populatedMessages = await Promise.all(
      messages.map(async (msg) => {
        const senderInfo = await getUserDetails(msg.sender, msg.senderModel);
        const receiverInfo = await getUserDetails(msg.receiver, msg.receiverModel);
        
        return {
          _id: msg._id,
          senderId: msg.sender,
          receiverId: msg.receiver,
          text: msg.message,
          timestamp: msg.timestamp,
          read: msg.read,
          readAt: msg.readAt,
          sender: senderInfo,
          receiver: receiverInfo,
          senderRole: msg.senderRole,
          receiverRole: msg.receiverRole,
          barangayContext: msg.barangayContext
        };
      })
    );
    
    console.log(`Found ${populatedMessages.length} messages`);
    res.json(populatedMessages);
    
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ message: 'Failed to fetch conversation', error: err.message });
  }
});

// 5️⃣ Send message
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user.id || req.user.userId;
    
    console.log('📨 SENDING MESSAGE - Sender:', senderId, 'Receiver:', receiverId);
    
    if (!receiverId || !text) {
      return res.status(400).json({ message: 'receiverId and text are required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const senderDetails = await getSenderDetails(senderId);
    if (!senderDetails) {
      return res.status(404).json({ message: 'Sender not found' });
    }
    
    const receiverDetails = await getReceiverDetails(receiverId);
    if (!receiverDetails) {
      return res.status(404).json({ message: 'Receiver not found' });
    }
    
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }
    
    const barangayContext = getBarangayContext(
      senderDetails.senderBarangay,
      receiverDetails.receiverBarangay,
      senderDetails.senderRole,
      receiverDetails.receiverRole
    );
    
    const message = new Message({
      sender: senderId,
      senderModel: senderDetails.senderModel,
      senderRole: senderDetails.senderRole,
      senderBarangay: senderDetails.senderBarangay,
      receiver: receiverId,
      receiverModel: receiverDetails.receiverModel,
      receiverRole: receiverDetails.receiverRole,
      receiverBarangay: receiverDetails.receiverBarangay,
      message: text,
      barangayContext: barangayContext,
      read: false,
      readAt: null
    });
    
    await message.save();
    console.log('✅ Message saved with ID:', message._id, 'BarangayContext:', barangayContext);
    
    const senderInfo = await getUserDetails(senderId, senderDetails.senderModel);
    const receiverInfo = await getUserDetails(receiverId, receiverDetails.receiverModel);
    
    const responseMessage = {
      _id: message._id,
      senderId: message.sender,
      receiverId: message.receiver,
      text: message.message,
      timestamp: message.timestamp,
      read: message.read,
      sender: senderInfo,
      receiver: receiverInfo,
      senderRole: message.senderRole,
      receiverRole: message.receiverRole,
      barangayContext: message.barangayContext
    };
    
    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      // Send to receiver
      io.to(receiverId.toString()).emit('receiveMessage', responseMessage);
      // Send back to sender
      io.to(senderId.toString()).emit('receiveMessage', responseMessage);
    }
    
    res.json({ success: true, message: responseMessage });
    
  } catch (err) {
    console.error('❌ Send message error:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// 6️⃣ Mark messages as read
router.put('/read/:senderId', auth, async (req, res) => {
  try {
    const receiverId = req.user.id || req.user.userId;
    const senderId = req.params.senderId;
    
    console.log('Marking messages as read from:', senderId, 'to:', receiverId);
    
    if (!mongoose.Types.ObjectId.isValid(receiverId) || !mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const result = await Message.updateMany(
      { sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    
    console.log('Marked as read:', result.modifiedCount, 'messages');
    res.json({ success: true, message: 'Messages marked as read', modifiedCount: result.modifiedCount });
    
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Failed to update read status', error: err.message });
  }
});

// 7️⃣ Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const currentUserInfo = await findUserById(userId);
    
    let query = { receiver: userId, read: false, isDeletedByReceiver: false };
    
    if (currentUserInfo.userType === 'Admin' && currentUserInfo.role !== 'admin') {
      query.barangayContext = currentUserInfo.barangay?.split(',')[0] || currentUserInfo.barangay;
    }
    
    const unreadCount = await Message.countDocuments(query);
    res.json({ unreadCount });
    
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ message: 'Failed to get unread count', error: err.message });
  }
});

// 8️⃣ Delete message
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    if (message.sender.toString() === userId.toString()) {
      message.isDeletedBySender = true;
    } else if (message.receiver.toString() === userId.toString()) {
      message.isDeletedByReceiver = true;
    } else {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    await message.save();
    res.json({ success: true, message: 'Message deleted' });
    
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
});

// 9️⃣ Health check
router.get('/health', auth, async (req, res) => {
  const userId = req.user.id || req.user.userId;
  const userInfo = await findUserById(userId);
  
  res.json({ 
    status: 'OK', 
    service: 'Messages API',
    authenticatedUser: {
      ...req.user,
      role: userInfo?.role,
      barangay: userInfo?.barangay,
      userType: userInfo?.userType
    },
    timestamp: new Date().toISOString()
  });
});

// 🔟 Debug route - check all users
router.get('/debug/all-users', auth, async (req, res) => {
  try {
    const users = await User.find().select('username email barangay role');
    const admins = await Admin.find().select('email role assignedBarangayLabel');
    
    res.json({
      users: users,
      admins: admins,
      totalUsers: users.length,
      totalAdmins: admins.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;