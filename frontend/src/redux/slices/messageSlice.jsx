import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

// Async thunks
export const getConversations = createAsyncThunk(
  'message/getConversations',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/messages/conversations/${userId}`);
      return response.data;
    } catch (error) {
      console.error('❌ getConversations error:', error);
      return rejectWithValue(error.response?.data || 'Failed to fetch conversations');
    }
  }
);

export const getConversation = createAsyncThunk(
  'message/getConversation',
  async ({ userId, otherUserId }, { rejectWithValue }) => {
    try {
      console.log(`🔄 Fetching conversation between ${userId} and ${otherUserId}`);
      const response = await axiosInstance.get(`/messages/conversation/${userId}/${otherUserId}`);
      console.log('✅ Conversation loaded:', response.data.length, 'messages');
      return response.data;
    } catch (error) {
      console.error('❌ getConversation error:', error);
      return rejectWithValue(error.response?.data || 'Failed to fetch conversation');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'message/sendMessage',
  async ({ senderId, receiverId, text }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/messages/send', {
        senderId,
        receiverId,
        text
      });
      return response.data;
    } catch (error) {
      console.error('❌ sendMessage error:', error);
      return rejectWithValue(error.response?.data || 'Failed to send message');
    }
  }
);

export const markMessagesAsSeen = createAsyncThunk(
  'message/markAsSeen',
  async ({ senderId, receiverId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/messages/seen/${senderId}/${receiverId}`);
      return response.data;
    } catch (error) {
      console.error('❌ markMessagesAsSeen error:', error);
      return rejectWithValue(error.response?.data || 'Failed to mark messages as seen');
    }
  }
);

export const getUsers = createAsyncThunk(
  'message/getUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/users');
      console.log('✅ Users loaded:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ getUsers error:', error);
      return rejectWithValue(error.response?.data || 'Failed to fetch users');
    }
  }
);

export const getAdmins = createAsyncThunk(
  'message/getAdmins',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/admins');
      console.log('✅ Admins loaded:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ getAdmins error:', error);
      return rejectWithValue(error.response?.data || 'Failed to fetch admins');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'message/searchUsers',
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/messages/search?q=${query}`);
      console.log('✅ Search results:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('❌ searchUsers error:', error);
      return rejectWithValue(error.response?.data || 'Search failed');
    }
  }
);

const messageSlice = createSlice({
  name: 'message',
  initialState: {
    conversations: [],
    currentConversation: [],
    users: [],
    admins: [],
    searchResults: [],
    loading: false,
    error: null,
    sending: false,
    activeChat: null,
    unreadCounts: {}
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setActiveChat: (state, action) => {
      console.log('🔧 Setting active chat:', action.payload);
      state.activeChat = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    addMessageToConversation: (state, action) => {
      const { message, currentUserId } = action.payload;
      
      console.log('📌 Adding message to conversation:', {
        messageId: message._id,
        from: message.senderId,
        to: message.receiverId,
        current: currentUserId
      });
      
      // Add to current conversation if active
      if (state.activeChat) {
        const isRelevant = 
          (message.senderId === state.activeChat._id && message.receiverId === currentUserId) ||
          (message.receiverId === state.activeChat._id && message.senderId === currentUserId);
        
        if (isRelevant) {
          // Check if message already exists
          const exists = state.currentConversation.some(m => m._id === message._id);
          if (!exists) {
            state.currentConversation.push(message);
          }
        }
      }
      
      // Update or create conversation in list
      const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
      const conversationIndex = state.conversations.findIndex(
        conv => conv.user._id === otherUserId
      );
      
      if (conversationIndex !== -1) {
        // Update existing conversation
        state.conversations[conversationIndex].lastMessage = message;
        state.conversations[conversationIndex].unread = 
          message.senderId !== currentUserId && !message.read;
        
        // Move to top
        const updatedConversation = state.conversations.splice(conversationIndex, 1)[0];
        state.conversations.unshift(updatedConversation);
      }
    },
    updateMessageReadStatus: (state, action) => {
      const { senderId, receiverId } = action.payload;
      
      console.log('👁️ Updating read status for messages from', senderId);
      
      // Update in current conversation
      state.currentConversation.forEach(message => {
        if (message.senderId === senderId && message.receiverId === receiverId && !message.read) {
          message.read = true;
        }
      });
      
      // Update in conversations list
      state.conversations.forEach(conv => {
        if (conv.user._id === senderId && conv.lastMessage && !conv.lastMessage.read) {
          conv.lastMessage.read = true;
          conv.unread = false;
        }
      });
    },
    clearCurrentConversation: (state) => {
      state.currentConversation = [];
      state.activeChat = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Get conversations
      .addCase(getConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(getConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload || [];
        console.log('✅ Conversations updated');
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('❌ Failed to load conversations');
      })
      
      // Get conversation
      .addCase(getConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(getConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConversation = action.payload || [];
      })
      .addCase(getConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        if (action.payload.message) {
          state.currentConversation.push(action.payload.message);
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
      })
      
      // Get users
      .addCase(getUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload || [];
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get admins
      .addCase(getAdmins.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAdmins.fulfilled, (state, action) => {
        state.loading = false;
        state.admins = action.payload || [];
      })
      .addCase(getAdmins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload || [];
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Mark messages as seen
      .addCase(markMessagesAsSeen.fulfilled, (state) => {
        // Status updated via socket or real-time
      });
  }
});

export const {
  clearError,
  setActiveChat,
  clearSearchResults,
  addMessageToConversation,
  updateMessageReadStatus,
  clearCurrentConversation
} = messageSlice.actions;

export default messageSlice.reducer;