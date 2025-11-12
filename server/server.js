require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const userRoutes = require('./routes/userRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const wasteReportRoutes = require('./routes/wasteReportRoutes');
const messageRoutes = require('./routes/messageRoutes');

const app = express();
const server = http.createServer(app);

// Socket.IO server setup - FIXED PORT
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/waste-reports', wasteReportRoutes);
app.use('/api/messages', messageRoutes);

// In-memory online users storage
const onlineUsers = {}; // { userId: socketId }

// Socket.IO logic for real-time chat
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // Join room with userId
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    socket.join(userId);
    console.log(`👤 User ${userId} joined their room`);
    
    // Notify all clients of online status
    io.emit('userOnline', { userId });
  });

  // Sending a message
  socket.on('sendMessage', async ({ senderId, receiverId, text }) => {
    try {
      const Message = require('./models/Message');
      
      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        message: text,
        timestamp: new Date()
      });
      
      await message.save();
      await message.populate('sender receiver', 'username email profile');

      const messageData = {
        _id: message._id,
        senderId: message.sender._id,
        receiverId: message.receiver._id,
        text: message.message,
        timestamp: message.timestamp,
        read: message.read
      };

      console.log(`📨 Message from ${senderId} to ${receiverId}`);

      // Emit message to receiver if online
      if (onlineUsers[receiverId]) {
        io.to(receiverId).emit('receiveMessage', messageData);
      }

      // Emit back to sender to update their chat instantly
      io.to(senderId).emit('receiveMessage', messageData);
    } catch (error) {
      console.error('❌ Socket message error:', error);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  // Mark message as seen
  socket.on('markSeen', async ({ senderId, receiverId }) => {
    try {
      const Message = require('./models/Message');
      
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, read: false },
        { $set: { read: true } }
      );

      // Notify sender that message was read
      if (onlineUsers[senderId]) {
        io.to(senderId).emit('messagesSeen', { receiverId });
      }
    } catch (error) {
      console.error('❌ Mark seen error:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    let disconnectedUserId = null;
    
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        disconnectedUserId = userId;
        delete onlineUsers[userId];
        break;
      }
    }
    
    if (disconnectedUserId) {
      console.log(`🔴 User ${disconnectedUserId} disconnected`);
      io.emit('userOffline', { userId: disconnectedUserId });
    }
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection failed:', err));

// Start the server - FIXED: Use consistent port
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Socket.IO available at http://192.168.1.44:${PORT}`);
});