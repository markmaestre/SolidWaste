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
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// Socket.IO server setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/waste-reports', wasteReportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admins', adminRoutes);

// In-memory online users storage
const onlineUsers = {}; // { userId: socketId }

// Socket.IO logic for real-time chat
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // Join room with userId
  socket.on('join', (userId) => {
    onlineUsers[userId] = socket.id;
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Sending a message
  socket.on('sendMessage', async (messageData) => {
    try {
      const Message = require('./models/Message');
      const message = new Message({ 
        sender: messageData.senderId, 
        receiver: messageData.receiverId, 
        message: messageData.text 
      });
      
      await message.save();
      
      // Populate user data
      await message.populate('sender', 'username email profile');
      await message.populate('receiver', 'username email profile');

      const transformedMessage = {
        _id: message._id,
        senderId: message.sender._id,
        receiverId: message.receiver._id,
        text: message.message,
        timestamp: message.timestamp,
        read: message.read,
        sender: message.sender,
        receiver: message.receiver
      };

      // Emit message to receiver if online
      const receiverSocket = onlineUsers[messageData.receiverId];
      if (receiverSocket) {
        io.to(messageData.receiverId).emit('receiveMessage', transformedMessage);
      }

      // Emit back to sender to update their chat instantly
      io.to(messageData.senderId).emit('receiveMessage', transformedMessage);
    } catch (error) {
      console.error('Socket send message error:', error);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });

  // Mark messages as seen
  socket.on('markSeen', async ({ senderId, receiverId }) => {
    try {
      const Message = require('./models/Message');
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
      
      // Notify the sender that messages were seen
      const senderSocket = onlineUsers[senderId];
      if (senderSocket) {
        io.to(senderId).emit('messagesSeen', { receiverId });
      }
    } catch (error) {
      console.error('Mark seen error:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
    console.log('🔴 User disconnected:', socket.id);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection failed:', err));

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));