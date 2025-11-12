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
      return rejectWithValue(error.response?.data || 'Failed to fetch conversations');
    }
  }
);

export const getConversation = createAsyncThunk(
  'message/getConversation',
  async ({ userId, otherUserId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/messages/conversation/${userId}/${otherUserId}`);
      return response.data;
    } catch (error) {
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
      return rejectWithValue(error.response?.data || 'Failed to send message');
    }
  }
);

export const markMessagesAsRead = createAsyncThunk(
  'message/markAsRead',
  async ({ senderId, receiverId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/messages/read/${senderId}/${receiverId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark messages as read');
    }
  }
);

export const getUsers = createAsyncThunk(
  'message/getUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/users');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch users');
    }
  }
);

export const getAdmins = createAsyncThunk(
  'message/getAdmins',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/admins');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch admins');
    }
  }
);

export const searchUsers = createAsyncThunk(
  'message/searchUsers',
  async (query, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/messages/search?q=${query}`);
      return response.data;
    } catch (error) {
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
      state.activeChat = action.payload;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    addMessageToConversation: (state, action) => {
      const { message, currentUserId } = action.payload;
      
      // Add to current conversation if active chat matches
      if (state.activeChat && 
          (message.senderId === state.activeChat._id || message.receiverId === state.activeChat._id)) {
        
        // Check if message already exists to avoid duplicates
        const messageExists = state.currentConversation.some(msg => msg._id === message._id);
        if (!messageExists) {
          state.currentConversation.push(message);
        }
      }
      
      // Update conversations list
      const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;
      const conversationIndex = state.conversations.findIndex(conv => conv.user._id === otherUserId);
      
      if (conversationIndex !== -1) {
        // Update existing conversation
        state.conversations[conversationIndex].lastMessage = {
          text: message.text,
          timestamp: message.timestamp,
          read: message.read,
          sender: message.senderId
        };
        state.conversations[conversationIndex].timestamp = message.timestamp;
        
        // Update unread status
        if (message.senderId !== currentUserId && !message.read) {
          state.conversations[conversationIndex].unread = true;
        }
        
        // Move to top
        const updatedConversation = state.conversations.splice(conversationIndex, 1)[0];
        state.conversations.unshift(updatedConversation);
      }
    },
    updateMessageReadStatus: (state, action) => {
      const { senderId, receiverId } = action.payload;
      
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
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
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
        state.conversations = action.payload;
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get conversation
      .addCase(getConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(getConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConversation = action.payload;
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
        state.users = action.payload;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get admins
      .addCase(getAdmins.fulfilled, (state, action) => {
        state.admins = action.payload;
      })
      
      // Search users
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  setActiveChat,
  clearSearchResults,
  addMessageToConversation,
  updateMessageReadStatus,
  clearCurrentConversation,
  setLoading
} = messageSlice.actions;

export default messageSlice.reducer;