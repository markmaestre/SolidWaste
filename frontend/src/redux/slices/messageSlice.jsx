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

// Helper to format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper to get file icon based on type
export const getFileIcon = (fileType) => {
  switch(fileType) {
    case 'pdf':
      return '📄';
    case 'image':
      return '🖼️';
    case 'document':
      return '📝';
    default:
      return '📎';
  }
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
  async ({ query }, { rejectWithValue }) => {
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

// 5️⃣ Send message with text only (legacy)
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

// 5b️⃣ Send message with file attachments (FormData)
export const sendMessageWithAttachments = createAsyncThunk(
  'message/sendMessageWithAttachments',
  async ({ receiverId, text, files, onProgress }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('receiverId', receiverId);
      if (text && text.trim()) {
        formData.append('text', text.trim());
      }
      
      // Append each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        formData.append('attachments', {
          uri: file.uri,
          type: file.type,
          name: file.fileName || `file_${Date.now()}.jpg`,
        });
      }
      
      const response = await axiosInstance.post('/messages/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to send message with attachments');
    }
  }
);

// 5c️⃣ Send message with base64 attachments (for React Native)
export const sendMessageWithBase64Attachments = createAsyncThunk(
  'message/sendMessageWithBase64Attachments',
  async ({ receiverId, text, attachments }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/messages/send-base64', {
        receiverId,
        text,
        attachments
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to send message with attachments');
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

// 8b️⃣ Delete an attachment from a message
export const deleteAttachment = createAsyncThunk(
  'message/deleteAttachment',
  async ({ messageId, attachmentId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/messages/${messageId}/attachment/${attachmentId}`);
      return { 
        success: response.data.success, 
        messageId, 
        attachmentId,
        attachments: response.data.attachments 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to delete attachment');
    }
  }
);

// 9️⃣ Health check - FIXED VERSION
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
    uploadingFiles: false,
    uploadProgress: 0,
    activeChat: null,
    unreadCount: 0,
    healthStatus: null,
    debugUsers: null,
    currentUserId: null,
    currentUserType: null,
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
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    
    // Add a new message to current conversation (used by socket)
    addMessageToConversation: (state, action) => {
      const { message, currentUserId } = action.payload;
      const sanitizedMessage = sanitizeMessage(message);
      
      // Check if message already exists
      const exists = state.currentConversation.some(msg => msg._id === sanitizedMessage._id);
      
      if (!exists) {
        // Add to current conversation
        state.currentConversation.push(sanitizedMessage);
        
        // Mark as read if it's from the current active chat and receiver is current user
        if (state.activeChat && 
            sanitizedMessage.senderId === state.activeChat.userId && 
            sanitizedMessage.receiverId === currentUserId) {
          sanitizedMessage.read = true;
        }
      }
      
      // Update conversations list with last message
      const otherUserId = sanitizedMessage.senderId === currentUserId 
        ? sanitizedMessage.receiverId 
        : sanitizedMessage.senderId;
      
      const conversationIndex = state.conversations.findIndex(
        conv => conv.user?._id === otherUserId
      );
      
      // Prepare last message preview
      let lastMessageText = sanitizedMessage.text;
      if (!lastMessageText && sanitizedMessage.attachments && sanitizedMessage.attachments.length > 0) {
        const imageCount = sanitizedMessage.attachments.filter(att => att.type === 'image').length;
        const docCount = sanitizedMessage.attachments.filter(att => att.type !== 'image').length;
        
        if (imageCount > 0 && docCount > 0) {
          lastMessageText = `📎 ${imageCount} image(s), ${docCount} document(s)`;
        } else if (imageCount > 0) {
          lastMessageText = `🖼️ ${imageCount} image(s)`;
        } else if (docCount > 0) {
          lastMessageText = `📎 ${docCount} document(s)`;
        }
      }
      
      if (conversationIndex !== -1) {
        // Update existing conversation
        state.conversations[conversationIndex].lastMessage = {
          _id: sanitizedMessage._id,
          text: lastMessageText || 'Message',
          hasAttachment: sanitizedMessage.attachments && sanitizedMessage.attachments.length > 0,
          attachments: sanitizedMessage.attachments,
          timestamp: sanitizedMessage.timestamp,
          read: sanitizedMessage.read,
          sender: sanitizedMessage.senderId,
          senderRole: sanitizedMessage.senderRole
        };
        state.conversations[conversationIndex].timestamp = sanitizedMessage.timestamp;
        state.conversations[conversationIndex].unread = !sanitizedMessage.read && sanitizedMessage.receiverId === currentUserId;
        
        // Move to top
        const updated = state.conversations.splice(conversationIndex, 1)[0];
        state.conversations.unshift(updated);
      }
    },
    
    // Update read status for messages
    updateMessageReadStatus: (state, action) => {
      const { senderId } = action.payload;
      
      // Update messages in current conversation
      state.currentConversation.forEach(message => {
        if (message.senderId === senderId && !message.read) {
          message.read = true;
          message.readAt = new Date().toISOString();
        }
      });
      
      // Update conversations list
      state.conversations.forEach(conv => {
        if (conv.user?._id === senderId && conv.lastMessage && !conv.lastMessage.read) {
          conv.lastMessage.read = true;
          conv.unread = false;
        }
      });
      
      // Update unread count
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
    
    // Remove a deleted attachment
    removeDeletedAttachment: (state, action) => {
      const { messageId, attachmentId, attachments } = action.payload;
      const message = state.currentConversation.find(msg => msg._id === messageId);
      if (message) {
        message.attachments = attachments;
      }
    },
    
    // Set current user info
    setCurrentUser: (state, action) => {
      state.currentUserId = action.payload.userId;
      state.currentUserType = action.payload.userType;
    },
    
    // Clear upload status
    clearUploadStatus: (state) => {
      state.uploadingFiles = false;
      state.uploadProgress = 0;
    },
    
    // Reset message state
    resetMessageState: (state) => {
      state.conversations = [];
      state.currentConversation = [];
      state.users = [];
      state.searchResults = [];
      state.loading = false;
      state.error = null;
      state.sending = false;
      state.uploadingFiles = false;
      state.uploadProgress = 0;
      state.activeChat = null;
      state.unreadCount = 0;
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
        state.users = action.payload;
        state.error = null;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Search Users =====
      .addCase(searchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(searchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = action.payload;
        state.error = null;
      })
      .addCase(searchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Get Conversations =====
      .addCase(getConversations.pending, (state) => {
        state.loading = true;
      })
      .addCase(getConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
        state.error = null;
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Get Conversation =====
      .addCase(getConversation.pending, (state) => {
        state.loading = true;
      })
      .addCase(getConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConversation = action.payload.map(sanitizeMessage);
        state.error = null;
      })
      .addCase(getConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ===== Send Message (Text only) =====
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        if (action.payload.message) {
          const message = sanitizeMessage(action.payload.message);
          const exists = state.currentConversation.some(m => m._id === message._id);
          if (!exists && state.activeChat) {
            const isRelevant = (message.receiverId === state.activeChat.userId || message.senderId === state.activeChat.userId);
            if (isRelevant) {
              state.currentConversation.push(message);
            }
          }
        }
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload;
      })
      
      // ===== Send Message with Attachments =====
      .addCase(sendMessageWithAttachments.pending, (state) => {
        state.sending = true;
        state.uploadingFiles = true;
        state.uploadProgress = 0;
      })
      .addCase(sendMessageWithAttachments.fulfilled, (state, action) => {
        state.sending = false;
        state.uploadingFiles = false;
        state.uploadProgress = 100;
        if (action.payload.message) {
          const message = sanitizeMessage(action.payload.message);
          const exists = state.currentConversation.some(m => m._id === message._id);
          if (!exists && state.activeChat) {
            const isRelevant = (message.receiverId === state.activeChat.userId || message.senderId === state.activeChat.userId);
            if (isRelevant) {
              state.currentConversation.push(message);
            }
          }
        }
        state.error = null;
        setTimeout(() => {
          state.uploadProgress = 0;
        }, 1000);
      })
      .addCase(sendMessageWithAttachments.rejected, (state, action) => {
        state.sending = false;
        state.uploadingFiles = false;
        state.uploadProgress = 0;
        state.error = action.payload;
      })
      
      // ===== Send Message with Base64 Attachments =====
      .addCase(sendMessageWithBase64Attachments.pending, (state) => {
        state.sending = true;
        state.uploadingFiles = true;
      })
      .addCase(sendMessageWithBase64Attachments.fulfilled, (state, action) => {
        state.sending = false;
        state.uploadingFiles = false;
        if (action.payload.message) {
          const message = sanitizeMessage(action.payload.message);
          const exists = state.currentConversation.some(m => m._id === message._id);
          if (!exists && state.activeChat) {
            const isRelevant = (message.receiverId === state.activeChat.userId || message.senderId === state.activeChat.userId);
            if (isRelevant) {
              state.currentConversation.push(message);
            }
          }
        }
        state.error = null;
      })
      .addCase(sendMessageWithBase64Attachments.rejected, (state, action) => {
        state.sending = false;
        state.uploadingFiles = false;
        state.error = action.payload;
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
      
      // ===== Delete Attachment =====
      .addCase(deleteAttachment.fulfilled, (state, action) => {
        const { messageId, attachmentId, attachments } = action.payload;
        const message = state.currentConversation.find(msg => msg._id === messageId);
        if (message) {
          message.attachments = attachments;
        }
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
  removeDeletedAttachment,
  setUploadProgress,
  clearUploadStatus,
  resetMessageState,
} = messageSlice.actions;

export default messageSlice.reducer;