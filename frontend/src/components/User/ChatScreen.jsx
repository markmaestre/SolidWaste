import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { io } from 'socket.io-client';
import axiosInstance from '../../utils/axiosInstance';  
import {
  getConversation,
  sendMessage,
  markMessagesAsRead,
  addMessageToConversation,
  updateMessageReadStatus
} from '../../redux/slices/messageSlice';

const ChatScreen = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = route.params || {};
  
  // Redux state access
  const authState = useSelector(state => state.auth);
  const currentUser = authState.user || authState.userInfo;
  
  const { currentConversation, sending, loading } = useSelector(state => state.message);
  
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const flatListRef = useRef(null);

  // Validate user data on component mount
  useEffect(() => {
    if (!user || !currentUser) {
      Alert.alert('Error', 'User information not found. Please go back and try again.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    if (!user._id || !currentUser.id) {
      Alert.alert('Error', 'Invalid user data. Missing user IDs.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    console.log('Starting chat with:', {
      currentUser: {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role
      },
      otherUser: {
        id: user._id,
        username: user.username
      }
    });
  }, [user, currentUser, navigation]);

  useEffect(() => {
    if (!user?._id || !currentUser?.id) return;

    // Set up navigation header
    navigation.setOptions({
      title: user.username || 'Chat',
      headerShown: true,
    });

    // Load conversation
    dispatch(getConversation({
      userId: currentUser.id,
      otherUserId: user._id
    }));

    // Initialize socket connection
    initializeSocket();

    return () => {
      if (socket) {
        console.log('Cleaning up socket connection');
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [user, currentUser]);

  const initializeSocket = () => {
    try {
      console.log('🔄 Initializing socket connection...');
      const newSocket = io('http://192.168.1.44:4000', {
        transports: ['websocket'],
        timeout: 10000,
      });
      
      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        setIsConnected(true);
        newSocket.emit('join', currentUser.id);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
      });
      
      newSocket.on('connect_error', (error) => {
        console.log('❌ Socket connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('receiveMessage', (receivedMessage) => {
        console.log('📨 Received message via socket:', receivedMessage);
        dispatch(addMessageToConversation({
          message: receivedMessage,
          currentUserId: currentUser.id
        }));
        
        // Mark as read if message is for current user
        if (receivedMessage.senderId === user._id && receivedMessage.receiverId === currentUser.id) {
          dispatch(updateMessageReadStatus({
            senderId: user._id,
            receiverId: currentUser.id
          }));
          
          // Emit seen event
          if (newSocket.connected) {
            newSocket.emit('markSeen', {
              senderId: user._id,
              receiverId: currentUser.id
            });
          }
        }
        
        scrollToBottom();
      });

      newSocket.on('messagesSeen', (data) => {
        console.log('Messages seen by receiver:', data);
        // Update read status for messages sent by current user
        dispatch(updateMessageReadStatus({
          senderId: currentUser.id,
          receiverId: data.receiverId
        }));
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      Alert.alert('Connection Error', 'Failed to connect to chat server. Some features may not work.');
    }
  };

  useEffect(() => {
    // Mark messages as read when opening chat
    if (currentUser && user && currentConversation.length > 0) {
      const unreadMessages = currentConversation.filter(
        msg => msg.senderId === user._id && !msg.read
      );
      
      if (unreadMessages.length > 0) {
        markMessagesAsReadAPI();
      }
    }
    
    scrollToBottom();
  }, [currentConversation]);

  const markMessagesAsReadAPI = async () => {
    try {
      await axiosInstance.put(`/messages/read/${user._id}/${currentUser.id}`);
      dispatch(updateMessageReadStatus({
        senderId: user._id,
        receiverId: currentUser.id
      }));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current && currentConversation.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser || sending) return;

    const messageData = {
      senderId: currentUser.id,
      receiverId: user._id,
      text: message.trim()
    };

    try {
      // Send via HTTP first for persistence
      await sendMessageAPI(messageData);
      
      // Then send via socket for real-time if connected
      if (socket && socket.connected) {
        socket.emit('sendMessage', messageData);
      } else {
        console.log('⚠️ Socket not connected, message saved but real-time update may be delayed');
      }
      
      setMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const sendMessageAPI = async (messageData) => {
    try {
      const response = await axiosInstance.post('/messages/send', messageData);
      
      if (response.data.success && response.data.message) {
        dispatch(addMessageToConversation({
          message: response.data.message,
          currentUserId: currentUser.id
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Failed to send message via API:', error);
      throw error;
    }
  };

  const renderMessage = ({ item, index }) => {
    if (!currentUser) return null;

    const isMyMessage = item.senderId === currentUser.id;
    const showAvatar = index === 0 || 
      (currentConversation[index - 1]?.senderId !== item.senderId);

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
      ]}>
        {!isMyMessage && showAvatar && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.text}
          </Text>
          <View style={styles.messageMeta}>
            <Text style={styles.timestamp}>
              {formatTime(item.timestamp)}
            </Text>
            {isMyMessage && (
              <Icon 
                name={item.read ? 'done-all' : 'check'} 
                size={14} 
                color={item.read ? '#2196F3' : '#999'} 
                style={styles.readIcon}
              />
            )}
          </View>
        </View>
        
        {isMyMessage && showAvatar && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentUser.username?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  const renderConnectionStatus = () => (
    <View style={[
      styles.connectionStatus,
      { backgroundColor: isConnected ? '#4CAF50' : '#FF9800' }
    ]}>
      <Text style={styles.connectionStatusText}>
        {isConnected ? 'Connected' : 'Connecting...'}
      </Text>
    </View>
  );

  // Enhanced loading and error states
  if (!user || !currentUser) {
    return (
      <View style={styles.center}>
        <Icon name="error" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>User information not available</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && currentConversation.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Connection Status */}
      {renderConnectionStatus()}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={currentConversation}
        keyExtractor={(item) => item._id || `msg-${item.timestamp}-${Math.random()}`}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="chat" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start the conversation by sending a message
            </Text>
            {!isConnected && (
              <Text style={styles.connectionWarning}>
                Connection issues detected. Messages may be delayed.
              </Text>
            )}
          </View>
        }
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!message.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectionStatus: {
    padding: 8,
    alignItems: 'center',
  },
  connectionStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectionWarning: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 4,
  },
  myMessageBubble: {
    backgroundColor: '#2196F3',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#333',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.7,
  },
  readIcon: {
    marginLeft: 4,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: '#fff',
    marginRight: 8,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default ChatScreen;