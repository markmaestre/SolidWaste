import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../utils/axiosInstance';

// ── Sanitize helpers ───────────────────────────────────────────────────────────
const sanitizeMessage = (msg) => {
  if (!msg) return msg;
  return {
    ...msg,
    readAt:    msg.readAt    instanceof Date ? msg.readAt.toISOString()    : msg.readAt,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
    updatedAt: msg.updatedAt instanceof Date ? msg.updatedAt.toISOString() : msg.updatedAt,
  };
};

// ==================== ASYNC THUNKS ====================

// 1️⃣ Get all users for messaging (with barangay filtering)
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

// 2️⃣ Search users
export const searchUsers = createAsyncThunk(
  'message/searchUsers',
  async ({ query, type = 'users' }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/messages/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Search failed');
    }
  }
);

// 3️⃣ Get conversations list
export const getConversations = createAsyncThunk(
  'message/getConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/conversations');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch conversations');
    }
  }
);

// 4️⃣ Get conversation between current user and another user
export const getConversation = createAsyncThunk(
  'message/getConversation',
  async ({ otherUserId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/messages/conversation/${otherUserId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch conversation');
    }
  }
);

// 5️⃣ Send message
export const sendMessage = createAsyncThunk(
  'message/sendMessage',
  async ({ receiverId, text }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/messages/send', { receiverId, text });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to send message');
    }
  }
);

// 6️⃣ Mark messages as read from a specific sender
export const markMessagesAsRead = createAsyncThunk(
  'message/markMessagesAsRead',
  async ({ senderId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/messages/read/${senderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to mark messages as read');
    }
  }
);

// 7️⃣ Get unread message count
export const getUnreadCount = createAsyncThunk(
  'message/getUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/unread/count');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to get unread count');
    }
  }
);

// 8️⃣ Delete a message
export const deleteMessage = createAsyncThunk(
  'message/deleteMessage',
  async ({ messageId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/messages/${messageId}`);
      return { success: response.data.success, messageId };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete message');
    }
  }
);

// 9️⃣ Health check
export const checkMessagesHealth = createAsyncThunk(
  'message/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/health');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Health check failed');
    }
  }
);

// 🔟 Debug - get all users (admin only)
export const debugGetAllUsers = createAsyncThunk(
  'message/debugGetAllUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/messages/debug/all-users');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to fetch debug users');
    }
  }
);

// ==================== SLICE ====================

const messageSlice = createSlice({
  name: 'message',
  initialState: {
    conversations: [],
    currentConversation: [],
    users: [],
    searchResults: [],
    loading: false,
    error: null,
    sending: false,
    activeChat: null,
    unreadCount: 0,
    healthStatus: null,
    debugUsers: null,
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
    clearCurrentConversation: (state) => {
      state.currentConversation = [];
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    // Add a new message to current conversation (used by socket)
    addMessageToConversation: (state, action) => {
      const message = sanitizeMessage(action.payload); // ✅ sanitize before storing

      const exists = state.currentConversation.some(msg => msg._id === message._id);
      if (!exists && state.activeChat) {
        const isRelevant =
          (message.senderId === state.activeChat.userId && message.receiverId === state.currentUserId) ||
          (message.senderId === state.currentUserId && message.receiverId === state.activeChat.userId);

        if (isRelevant) {
          state.currentConversation.push(message);
        }

        const conversationIndex = state.conversations.findIndex(
          conv => conv.user?._id === message.senderId || conv.user?._id === message.receiverId
        );

        if (conversationIndex !== -1) {
          state.conversations[conversationIndex].lastMessage = {
            text:      message.text,
            timestamp: message.timestamp,
            read:      message.read,
          };
          state.conversations[conversationIndex].timestamp = message.timestamp;

          const updated = state.conversations.splice(conversationIndex, 1)[0];
          state.conversations.unshift(updated);
        }
      }
    },

    // Update read status for messages
    updateMessageReadStatus: (state, action) => {
      const { senderId } = action.payload;

      state.currentConversation.forEach(message => {
        if (message.senderId === senderId && !message.read) {
          message.read   = true;
          message.readAt = new Date().toISOString(); // ✅ ISO string, not Date object
        }
      });

      state.conversations.forEach(conv => {
        if (conv.user?._id === senderId && conv.lastMessage && !conv.lastMessage.read) {
          conv.lastMessage.read = true;
          conv.unread           = false;
        }
      });

      const stillUnread = state.currentConversation.filter(
        m => !m.read && m.receiverId === state.currentUserId
      ).length;
      state.unreadCount = stillUnread;
    },

    // Remove a deleted message
    removeDeletedMessage: (state, action) => {
      const { messageId } = action.payload;
      state.currentConversation = state.currentConversation.filter(msg => msg._id !== messageId);
    },

    // Set current user info
    setCurrentUser: (state, action) => {
      state.currentUserId   = action.payload.userId;
      state.currentUserType = action.payload.userType;
    },
  },
  extraReducers: (builder) => {
    builder
      // ===== Get Users =====
      .addCase(getUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users   = action.payload;
        state.error   = null;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // ===== Search Users =====
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading       = false;
        state.searchResults = action.payload;
        state.error         = null;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // ===== Get Conversations =====
      .addCase(getConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(getConversations.fulfilled, (state, action) => {
        state.loading       = false;
        state.conversations = action.payload;
        state.error         = null;
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // ===== Get Conversation =====
      .addCase(getConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(getConversation.fulfilled, (state, action) => {
        state.loading              = false;
        state.currentConversation  = action.payload.map(sanitizeMessage); // ✅ sanitize array
        state.error                = null;
      })
      .addCase(getConversation.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload;
      })

      // ===== Send Message =====
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        if (action.payload.message) {
          const message = sanitizeMessage(action.payload.message); // ✅ sanitize before storing
          if (
            state.activeChat &&
            (message.receiverId === state.activeChat.userId ||
             message.senderId   === state.activeChat.userId)
          ) {
            const exists = state.currentConversation.some(m => m._id === message._id);
            if (!exists) {
              state.currentConversation.push(message);
            }
          }
        }
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error   = action.payload;
      })

      // ===== Mark Messages as Read =====
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        state.unreadCount = Math.max(0, state.unreadCount - (action.payload.modifiedCount || 0));
      })

      // ===== Delete Message =====
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { messageId } = action.payload;
        state.currentConversation = state.currentConversation.filter(msg => msg._id !== messageId);
      })

      // ===== Get Unread Count =====
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
      })

      // ===== Health Check =====
      .addCase(checkMessagesHealth.fulfilled, (state, action) => {
        state.healthStatus = action.payload;
      })

      // ===== Debug Get All Users =====
      .addCase(debugGetAllUsers.fulfilled, (state, action) => {
        state.debugUsers = action.payload;
      });
  },
});

// ==================== EXPORTS ====================

export const {
  clearError,
  setActiveChat,
  clearSearchResults,
  clearCurrentConversation,
  setLoading,
  setCurrentUser,
  addMessageToConversation,
  updateMessageReadStatus,
  removeDeletedMessage,
} = messageSlice.actions;

export default messageSlice.reducer;