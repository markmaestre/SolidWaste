import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal,
  Image, ScrollView, Dimensions, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import axiosInstance from '../../utils/axiosInstance';
import {
  getConversation,
  markMessagesAsRead,
  addMessageToConversation,
  updateMessageReadStatus,
} from '../../redux/slices/messageSlice';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Design tokens ──────────────────────────────────────────────────────
const C = {
  ink:          '#06121E',
  navy:         '#0B2033',
  navyMid:      '#153045',
  teal:         '#00B896',
  tealLight:    '#00D4AC',
  tealDark:     '#008F75',
  tealDim:      'rgba(0,184,150,0.10)',
  tealLine:     'rgba(0,184,150,0.28)',
  white:        '#FFFFFF',
  surface:      '#F0F4F8',
  border:       '#D9E4EE',
  textPrimary:  '#0B2033',
  textSecondary:'#4A6580',
  textMuted:    '#8EA5BC',
  ghost:        'rgba(255,255,255,0.55)',
  blue:         '#2A7FE8',
  orange:       '#E07B2A',
  purple:       '#A78BFA',
  green:        '#22C55E',
  red:          '#EF4444',
  bubbleOut:    '#0B2033',
  bubbleIn:     '#FFFFFF',
};

const ROLE_COLORS = {
  admin:        C.blue,
  southadmin:   C.teal,
  centraladmin: C.purple,
  user:         C.orange,
};

const ROLE_LABELS = {
  admin:        'Super Admin',
  southadmin:   'South Admin',
  centraladmin: 'Central Admin',
  user:         'Resident',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (ts) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', role = 'user', size = 34 }) => {
  const color = ROLE_COLORS[role] || C.textSecondary;
  return (
    <View style={[styles.avatar, {
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: `${color}18`, borderColor: `${color}44`,
    }]}>
      <Text style={[styles.avatarTxt, { color, fontSize: size * 0.42 }]}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

// ── Image Viewer Modal ───────────────────────────────────────────────────────
const ImageViewer = ({ visible, imageUrl, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.imageViewerContainer}>
        <TouchableOpacity style={styles.imageViewerClose} onPress={onClose}>
          <Ionicons name="close" size={28} color={C.white} />
        </TouchableOpacity>
        {imageUrl && (
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.imageViewerImage} 
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const ChatScreen = () => {
  const dispatch   = useDispatch();
  const route      = useRoute();
  const navigation = useNavigation();
  const { user }   = route.params || {};

  const authState   = useSelector(state => state.auth);
  const currentUser = authState.user || authState.userInfo;
  const messageState = useSelector(state => state.message);
  
  const currentConversation = messageState?.currentConversation || [];
  const sending = messageState?.sending || false;
  const isLoading = messageState?.loading || false;

  const [message, setMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImageForView, setSelectedImageForView] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!user || !currentUser) {
      Alert.alert('Error', 'User information not found.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to send images.');
      }
    })();
  }, [user, currentUser]);

  useEffect(() => {
    if (!user?._id || !currentUser?.id) return;

    navigation.setOptions({ headerShown: false });
    dispatch(getConversation({ otherUserId: user._id }));
    initializeSocket();

    return () => {
      if (socket) { socket.disconnect(); setSocket(null); }
    };
  }, [user, currentUser]);

  const initializeSocket = () => {
    try {
      const newSocket = io('http://192.168.1.44:4000', {
        transports: ['websocket'], 
        timeout: 10000,
      });
      
      newSocket.on('connect', () => {
        setIsConnected(true);
        newSocket.emit('join', currentUser.id);
      });
      
      newSocket.on('disconnect', () => setIsConnected(false));
      newSocket.on('connect_error', () => setIsConnected(false));
      
      newSocket.on('receiveMessage', (msg) => {
        dispatch(addMessageToConversation({
          message: msg,
          currentUserId: currentUser.id || currentUser._id,
        }));
        if (msg.senderId === user._id && msg.receiverId === currentUser.id) {
          dispatch(updateMessageReadStatus({ senderId: user._id, receiverId: currentUser.id }));
          if (newSocket.connected) {
            newSocket.emit('markSeen', { senderId: user._id, receiverId: currentUser.id });
          }
        }
        scrollToBottom();
      });
      
      newSocket.on('messagesSeen', (data) => {
        dispatch(updateMessageReadStatus({ senderId: currentUser.id, receiverId: data.receiverId }));
      });
      
      setSocket(newSocket);
    } catch (e) {
      console.error('Socket connection error:', e);
    }
  };

  useEffect(() => {
    if (currentUser && user && currentConversation.length > 0) {
      const hasUnread = currentConversation.some(
        m => m.senderId === user._id && !m.read
      );
      if (hasUnread) markMessagesAsReadAPI();
    }
    scrollToBottom();
  }, [currentConversation]);

  const markMessagesAsReadAPI = async () => {
    try {
      await axiosInstance.put(`/messages/read/${user._id}`);
      dispatch(updateMessageReadStatus({ senderId: user._id }));
    } catch (e) {
      console.log('Mark as read failed:', e?.response?.status);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current && currentConversation.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: false, // Don't use base64 to avoid memory issues
      });
      
      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
        }));
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images: ' + error.message);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!message.trim() && selectedImages.length === 0) || sending || uploading) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('receiverId', user._id);
      
      if (message.trim()) {
        formData.append('text', message.trim());
      }
      
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i];
        
        // Get file extension from uri
        const uriParts = img.uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1];
        const fileName = `image_${Date.now()}_${i}.${fileExtension}`;
        
        formData.append('attachments', {
          uri: img.uri,
          type: img.type,
          name: fileName,
        });
      }
      
      const response = await axiosInstance.post('/messages/send', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
      
      if (response.data.success && response.data.message) {
        dispatch(addMessageToConversation({ 
          message: response.data.message, 
          currentUserId: currentUser.id 
        }));
        
        if (socket?.connected) {
          socket.emit('sendMessage', {
            senderId: currentUser.id,
            receiverId: user._id,
            text: message.trim(),
            messageId: response.data.message._id
          });
        }
        
        setMessage('');
        setSelectedImages([]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Send error:', error);
      let errorMessage = 'Failed to send message';
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    if (!currentUser) return null;
    if (!item || !item.senderId) return null;

    const myId = String(currentUser.id || currentUser._id || '');
    const senderId = String(item.senderId || item.sender?._id || item.sender || '');
    const isMe = myId === senderId;
    
    const hasText = item.text && item.text.trim();
    const hasAttachments = item.attachments && item.attachments.length > 0;
    
    if (!hasText && !hasAttachments) return null;

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {/* Text Message */}
          {hasText && (
            <Text style={[styles.bubbleTxt, isMe ? styles.bubbleTxtMe : styles.bubbleTxtThem]}>
              {item.text}
            </Text>
          )}
          
          {/* Image Attachments */}
          {hasAttachments && (
            <View style={styles.attachmentsContainer}>
              {item.attachments.map((att, idx) => (
                att.type === 'image' && (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedImageForView(att.url)}
                    style={styles.messageImageContainer}
                  >
                    <Image 
                      source={{ uri: att.thumbnailUrl || att.url }} 
                      style={styles.messageImage} 
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )
              ))}
            </View>
          )}
          
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
              {formatTime(item.timestamp)}
            </Text>
            {isMe && (
              <Ionicons
                name={item.read ? 'checkmark-done' : 'checkmark'}
                size={12}
                color={item.read ? C.tealLight : 'rgba(255,255,255,0.5)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!user || !currentUser) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorTxt}>User information not available</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && currentConversation.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={styles.loadingTxt}>Loading conversation…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const otherName = user.username || user.email?.split('@')[0] || 'User';
  const otherRole = user.role || 'user';
  const otherRoleColor = ROLE_COLORS[otherRole] || C.textSecondary;
  const otherRoleLabel = ROLE_LABELS[otherRole] || otherRole;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </TouchableOpacity>

          <Avatar name={otherName} role={otherRole} size={38} />

          <View style={styles.headerMeta}>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
            <View style={styles.headerRoleRow}>
              <View style={[styles.headerRoleDot, { backgroundColor: otherRoleColor }]} />
              <Text style={[styles.headerRoleTxt, { color: otherRoleColor }]}>{otherRoleLabel}</Text>
            </View>
          </View>

          <View style={[styles.connDot, { backgroundColor: isConnected ? C.green : '#F97316' }]} />
        </View>

        {/* Connection banner */}
        {!isConnected && (
          <View style={styles.connBanner}>
            <Ionicons name="wifi-outline" size={12} color={C.white} />
            <Text style={styles.connBannerTxt}>Reconnecting…</Text>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={currentConversation}
          keyExtractor={(item, index) => item._id || `msg-${index}`}
          renderItem={renderMessage}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={30} color={C.teal} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Send a message or image to start the conversation</Text>
            </View>
          }
        />

        {/* Selected Images Preview */}
        {selectedImages.length > 0 && (
          <View style={styles.imagePreviewContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.attachmentPreviewScroll}
              contentContainerStyle={styles.attachmentPreviewContainer}
            >
              {selectedImages.map((img, index) => (
                <View key={index} style={styles.attachmentPreviewItem}>
                  <Image source={{ uri: img.uri }} style={styles.attachmentPreviewImage} />
                  <TouchableOpacity 
                    style={styles.attachmentPreviewRemove}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={22} color={C.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color={C.teal} />
            <Text style={styles.uploadingText}>Sending images...</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity 
            style={styles.attachBtn} 
            onPress={pickImages}
            disabled={uploading}
          >
            <Ionicons name="image-outline" size={24} color={C.teal} />
          </TouchableOpacity>
          
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Type a message…"
              placeholderTextColor={C.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              editable={!sending && !uploading}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() && selectedImages.length === 0) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={(!message.trim() && selectedImages.length === 0) || sending || uploading}
            activeOpacity={0.8}
          >
            {(sending || uploading) ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Ionicons name="send" size={16} color={C.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Image Viewer Modal */}
      <ImageViewer 
        visible={!!selectedImageForView}
        imageUrl={selectedImageForView}
        onClose={() => setSelectedImageForView(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ink },
  flex: { flex: 1, backgroundColor: C.surface },
  
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 4 : 10,
    paddingBottom: 14,
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerBack: {
    width: 34, 
    height: 34, 
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  headerMeta: { flex: 1 },
  headerName: { fontSize: 14, fontWeight: '700', color: C.white },
  headerRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  headerRoleDot: { width: 6, height: 6, borderRadius: 3 },
  headerRoleTxt: { fontSize: 10, fontWeight: '600' },
  connDot: { 
    width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: C.ink 
  },
  connBanner: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 5,
    backgroundColor: '#F97316', 
    paddingVertical: 5,
  },
  connBannerTxt: { fontSize: 11, fontWeight: '600', color: C.white },
  
  avatar: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: '800' },
  
  list: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  
  msgRow: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  
  bubble: {
    maxWidth: '75%', 
    paddingHorizontal: 14, 
    paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: C.bubbleOut,
    borderBottomRightRadius: 5,
  },
  bubbleThem: {
    backgroundColor: C.bubbleIn,
    borderBottomLeftRadius: 5,
    borderWidth: 1, 
    borderColor: C.border,
  },
  bubbleTxt: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  bubbleTxtMe: { color: C.white },
  bubbleTxtThem: { color: C.textPrimary },
  
  attachmentsContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  messageImageContainer: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.5,
    height: 150,
    borderRadius: 12,
  },
  
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' },
  bubbleTime: { fontSize: 10, color: C.textMuted },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.45)' },
  
  imagePreviewContainer: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  attachmentPreviewScroll: {
    maxHeight: 100,
  },
  attachmentPreviewContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    flexDirection: 'row',
  },
  attachmentPreviewItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  attachmentPreviewRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: C.white,
    borderRadius: 12,
  },
  
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: C.tealDim,
    gap: 8,
  },
  uploadingText: {
    fontSize: 12,
    color: C.teal,
    fontWeight: '500',
  },
  
  inputBar: {
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 8,
    paddingHorizontal: 12, 
    paddingVertical: 10,
    backgroundColor: C.white,
    borderTopWidth: 1, 
    borderTopColor: C.border,
  },
  attachBtn: {
    width: 42, 
    height: 42, 
    borderRadius: 21,
    backgroundColor: C.surface,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: C.surface, 
    borderRadius: 22,
    borderWidth: 1.5, 
    borderColor: C.border,
    paddingHorizontal: 14, 
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    minHeight: 42, 
    justifyContent: 'center',
  },
  input: {
    fontSize: 14, 
    color: C.textPrimary, 
    maxHeight: 100,
    padding: 0, 
    margin: 0,
  },
  sendBtn: {
    width: 42, 
    height: 42, 
    borderRadius: 21,
    backgroundColor: C.teal, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: C.teal, 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: C.border, shadowOpacity: 0 },
  
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 19 },
  
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTxt: { fontSize: 16, color: '#FF6B6B', marginTop: 14, textAlign: 'center' },
  loadingTxt: { fontSize: 13, color: C.textSecondary, marginTop: 12 },
  backBtn: {
    marginTop: 20, paddingHorizontal: 22, paddingVertical: 10,
    backgroundColor: C.teal, borderRadius: 9,
  },
  backBtnTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
  
  // Image Viewer Modal
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  imageViewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});

export default ChatScreen;