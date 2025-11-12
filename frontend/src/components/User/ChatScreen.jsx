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
  addMessageToConversation,
  updateMessageReadStatus
} from '../../redux/slices/messageSlice';

const ChatScreen = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const navigation = useNavigation();
  const { user: routeUser } = route.params || {};
  
  // Get auth state - try multiple paths for compatibility
  const authState = useSelector(state => state.auth);
  const reduxUser = authState?.user || authState?.userInfo;
  
  const { currentConversation, sending, loading } = useSelector(state => state.message);
  
  const [message, setMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(reduxUser);
  const [user, setUser] = useState(routeUser);
  const flatListRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log('🔍 ChatScreen Debug:', {
      authState: authState,
      reduxUser: reduxUser,
      routeUser: routeUser,
      currentUser: currentUser,
      user: user
    });
  }, []);

  // Validate user data
  useEffect(() => {
    // Try to get user data from multiple sources
    const finalCurrentUser = currentUser || reduxUser;
    const finalOtherUser = user || routeUser;

    console.log('✅ Final user data:', {
      currentUser: finalCurrentUser,
      otherUser: finalOtherUser
    });

    if (!finalCurrentUser) {
      Alert.alert(
        'Error', 
        'Your user information is not available. Please log in again.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
      return;
    }

    if (!finalOtherUser) {
      Alert.alert(
        'Error', 
        'Chat user information not found. Please select a user to chat with.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (!finalCurrentUser._id || !finalOtherUser._id) {
      Alert.alert(
        'Error',
        'Invalid user data. Missing user IDs.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    setCurrentUser(finalCurrentUser);
    setUser(finalOtherUser);
  }, [reduxUser, routeUser]);

  // Set navigation header
  useEffect(() => {
    if (user?._id && currentUser?._id) {
      navigation.setOptions({
        title: user.username || 'Chat',
        headerShown: true,
      });
    }
  }, [user, currentUser, navigation]);

  // Load conversation and initialize socket
  useEffect(() => {
    if (!user?._id || !currentUser?._id) {
      console.log('⚠️ Missing user data, skipping initialization');
      return;
    }

    console.log('🔄 Initializing chat screen');

    // Load conversation history
    dispatch(getConversation({
      userId: currentUser._id,
      otherUserId: user._id
    }));

    // Initialize socket connection
    initializeSocket();

    return () => {
      if (socket) {
        console.log('🧹 Cleaning up socket connection');
        socket.disconnect();
      }
    };
  }, [user?._id, currentUser?._id]);

  const initializeSocket = () => {
    try {
      console.log('🔌 Initializing socket connection...');
      
      const newSocket = io('http://192.168.1.44:4000', {
        transports: ['websocket'],
        timeout: 10000,
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 5
      });
      
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setIsConnected(true);
        
        // Join user room
        if (currentUser?._id) {
          newSocket.emit('join', currentUser._id);
          console.log('👤 Joined room:', currentUser._id);
        }
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        setIsConnected(false);
      });
      
      newSocket.on('connect_error', (error) => {
        console.log('❌ Socket error:', error);
        setIsConnected(false);
      });

      newSocket.on('receiveMessage', (receivedMessage) => {
        console.log('📨 Message received:', receivedMessage);
        
        if (currentUser?._id) {
          dispatch(addMessageToConversation({
            message: receivedMessage,
            currentUserId: currentUser._id
          }));
          
          // Mark as read if message is for current user
          if (receivedMessage.senderId === user?._id && 
              receivedMessage.receiverId === currentUser._id) {
            dispatch(updateMessageReadStatus({
              senderId: user._id,
              receiverId: currentUser._id
            }));
            
            if (newSocket.connected) {
              newSocket.emit('markSeen', {
                senderId: user._id,
                receiverId: currentUser._id
              });
            }
          }
        }
        
        scrollToBottom();
      });

      newSocket.on('messagesSeen', (data) => {
        console.log('👁️ Messages seen:', data);
        if (currentUser?._id) {
          dispatch(updateMessageReadStatus({
            senderId: data.receiverId,
            receiverId: currentUser._id
          }));
        }
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
      setIsConnected(false);
    }
  };

  // Mark messages as read when conversation loads
  useEffect(() => {
    if (currentUser && user && currentConversation.length > 0) {
      const unreadMessages = currentConversation.filter(
        msg => msg.senderId === user._id && !msg.read
      );
      
      if (unreadMessages.length > 0) {
        markMessagesAsSeenAPI();
      }
    }
    
    scrollToBottom();
  }, [currentConversation]);

  const markMessagesAsSeenAPI = async () => {
    try {
      await axiosInstance.put(`/messages/seen/${user._id}/${currentUser._id}`);
      dispatch(updateMessageReadStatus({
        senderId: user._id,
        receiverId: currentUser._id
      }));
    } catch (error) {
      console.error('Failed to mark messages as seen:', error);
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
    if (!message.trim() || !currentUser || !user || sending) {
      console.log('⚠️ Cannot send: message empty, user missing, or already sending');
      return;
    }

    const messageData = {
      senderId: currentUser._id,
      receiverId: user._id,
      text: message.trim()
    };

    try {
      // Send via HTTP first
      const response = await axiosInstance.post('/messages/send', messageData);
      
      if (response.data.success && response.data.message) {
        const sentMessage = response.data.message;
        
        // Add to conversation
        dispatch(addMessageToConversation({
          message: sentMessage,
          currentUserId: currentUser._id
        }));
        
        // Send via socket for real-time
        if (socket && socket.connected) {
          socket.emit('sendMessage', messageData);
        }
      }
      
      setMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const renderMessage = ({ item, index }) => {
    if (!currentUser) return null;

    const isMyMessage = item.senderId === currentUser._id;
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
              {formatTime(item.timestamp || item.createdAt)}
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

  // Error state
  if (!user || !currentUser) {
    return (
      <View style={styles.center}>
        <Icon name="error" size={50} color="#FF6B6B" />
        <Text style={styles.errorText}>Cannot load chat</Text>
        <Text style={styles.debugText}>
          {!currentUser ? 'Your user data is missing' : 'Chat user data is missing'}
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
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
      <View style={[
        styles.connectionStatus,
        { backgroundColor: isConnected ? '#4CAF50' : '#FF9800' }
      ]}>
        <Text style={styles.connectionStatusText}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </Text>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={currentConversation}
        keyExtractor={(item, index) => item._id || `msg-${index}`}
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
          editable={!sending && isConnected}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!message.trim() || sending || !isConnected) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!message.trim() || sending || !isConnected}
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
  debugText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
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