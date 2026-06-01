import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import axiosInstance from '../../utils/axiosInstance';
import {
  getConversation,
  sendMessage,
  markMessagesAsRead,
  addMessageToConversation,
  updateMessageReadStatus,
} from '../../redux/slices/messageSlice';

// ── Design tokens (same as MessageList) ──────────────────────────────────────
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
    <View style={[s.avatar, {
      width: size, height: size, borderRadius: size * 0.28,
      backgroundColor: `${color}18`, borderColor: `${color}44`,
    }]}>
      <Text style={[s.avatarTxt, { color, fontSize: size * 0.42 }]}>
        {(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const ChatScreen = () => {
  const dispatch   = useDispatch();
  const route      = useRoute();
  const navigation = useNavigation();
  const { user }   = route.params || {};

  const authState   = useSelector(st => st.auth);
  const currentUser = authState.user || authState.userInfo;
  const { currentConversation, sending, loading } = useSelector(st => st.message);

  const [message,     setMessage]     = useState('');
  const [socket,      setSocket]      = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const flatListRef = useRef(null);

  // ── Validate ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !currentUser) {
      Alert.alert('Error', 'User information not found.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    if (!user._id || !currentUser.id) {
      Alert.alert('Error', 'Invalid user data.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [user, currentUser]);

  // ── Load & socket ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id || !currentUser?.id) return;

    navigation.setOptions({ headerShown: false });

    dispatch(getConversation({ userId: currentUser.id, otherUserId: user._id }));
    initializeSocket();

    return () => {
      if (socket) { socket.disconnect(); setSocket(null); }
    };
  }, [user, currentUser]);

  const initializeSocket = () => {
    try {
      const newSocket = io('http://192.168.1.44:4000', {
        transports: ['websocket'], timeout: 10000,
      });
      newSocket.on('connect', () => {
        setIsConnected(true);
        newSocket.emit('join', currentUser.id);
      });
      newSocket.on('disconnect', () => setIsConnected(false));
      newSocket.on('connect_error', () => setIsConnected(false));
      newSocket.on('receiveMessage', (msg) => {
        // Backend emits receiveMessage to BOTH sender and receiver after saving.
        // The sender's message was already dispatched from the API response — skip duplicates by _id.
        // We still process it for the receiver side (incoming messages from others).
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
      Alert.alert('Connection Error', 'Failed to connect to chat server.');
    }
  };

  // ── Mark read & scroll ──────────────────────────────────────────────────────
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
      // Backend route: PUT /messages/read/:senderId (receiver is from auth token)
      await axiosInstance.put(`/messages/read/${user._id}`);
      dispatch(updateMessageReadStatus({ senderId: user._id }));
    } catch (e) {
      console.log('Mark as read failed (non-critical):', e?.response?.status);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current && currentConversation.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || !currentUser || sending) return;
    const msgData = { senderId: currentUser.id, receiverId: user._id, text: message.trim() };
    try {
      const response = await axiosInstance.post('/messages/send', msgData);
      if (response.data.success && response.data.message) {
        // Only dispatch locally — socket's receiveMessage would double-add for sender
        dispatch(addMessageToConversation({ message: response.data.message, currentUserId: currentUser.id }));
      }
      // Emit via socket for real-time delivery to RECEIVER only (not re-added for sender)
      if (socket?.connected) socket.emit('sendMessage', msgData);
      setMessage('');
      scrollToBottom();
    } catch (e) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // ── Render message ──────────────────────────────────────────────────────────
  const renderMessage = ({ item, index }) => {
    // Guard: skip empty, malformed, or duplicate-placeholder messages
    if (!currentUser) return null;
    if (!item || !item.senderId) return null;
    if (!item.text || !item.text.trim()) return null;

    // Backend stores sender as ObjectId in msg.sender / msg.senderId
    // populated messages return senderId = msg.sender (the raw ObjectId stored)
    const myId = String(currentUser.id || currentUser._id || '');
    const senderId = String(item.senderId || item.sender?._id || item.sender || '');
    const isMe = Boolean(myId && senderId && myId === senderId);

    // Show avatar only on first message of a consecutive group
    const prevItem = currentConversation[index - 1];
    const isGroupStart = !prevItem || prevItem.senderId !== item.senderId;

    // Show timestamp only if gap > 5 min or first message
    const showTimestamp = !prevItem ||
      (new Date(item.timestamp) - new Date(prevItem.timestamp)) > 5 * 60 * 1000;

    return (
      <View>
        {showTimestamp && item.timestamp ? (
          <View style={s.timeDivider}>
            <View style={s.timeDividerLine} />
            <Text style={s.timeDividerTxt}>{formatTime(item.timestamp)}</Text>
            <View style={s.timeDividerLine} />
          </View>
        ) : null}

        <View style={[s.msgRow, isMe ? s.msgRowMe : s.msgRowThem]}>
          <View style={[
            s.bubble,
            isMe ? s.bubbleMe : s.bubbleThem,
          ]}>
            <Text style={[s.bubbleTxt, isMe ? s.bubbleTxtMe : s.bubbleTxtThem]}>
              {item.text}
            </Text>
            <View style={s.bubbleMeta}>
              <Text style={[s.bubbleTime, isMe && s.bubbleTimeMe]}>
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
      </View>
    );
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!user || !currentUser) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={s.errorTxt}>User information not available</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && currentConversation.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={s.loadingTxt}>Loading conversation…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const otherName      = user.username || user.email?.split('@')[0] || 'User';
  const otherRole      = user.role || 'user';
  const otherRoleColor = ROLE_COLORS[otherRole] || C.textSecondary;
  const otherRoleLabel = ROLE_LABELS[otherRole] || otherRole;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerBack} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </TouchableOpacity>

          <Avatar name={otherName} role={otherRole} size={38} />

          <View style={s.headerMeta}>
            <Text style={s.headerName} numberOfLines={1}>{otherName}</Text>
            <View style={s.headerRoleRow}>
              <View style={[s.headerRoleDot, { backgroundColor: otherRoleColor }]} />
              <Text style={[s.headerRoleTxt, { color: otherRoleColor }]}>{otherRoleLabel}</Text>
            </View>
          </View>

          {/* Connection indicator */}
          <View style={[s.connDot, { backgroundColor: isConnected ? C.green : '#F97316' }]} />
        </View>

        {/* ── Connection banner (only when disconnected) ── */}
        {!isConnected && (
          <View style={s.connBanner}>
            <Ionicons name="wifi-outline" size={12} color={C.white} />
            <Text style={s.connBannerTxt}>Reconnecting…</Text>
          </View>
        )}

        {/* ── Messages ── */}
        <FlatList
          ref={flatListRef}
          data={currentConversation}
          keyExtractor={item => item._id || `msg-${item.timestamp}-${Math.random()}`}
          renderItem={renderMessage}
          style={s.list}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={30} color={C.teal} />
              </View>
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptySub}>Send a message to start the conversation</Text>
            </View>
          }
        />

        {/* ── Input bar ── */}
        <View style={s.inputBar}>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder="Type a message…"
              placeholderTextColor={C.textMuted}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              editable={!sending}
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity
            style={[s.sendBtn, (!message.trim() || sending) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
            activeOpacity={0.8}
          >
            {sending
              ? <ActivityIndicator size="small" color={C.white} />
              : <Ionicons name="send" size={16} color={C.white} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

// ── Stylesheet ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.ink },
  flex:  { flex: 1, backgroundColor: C.surface },

  // ── Header
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 4 : 10,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerBack: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMeta:    { flex: 1 },
  headerName:    { fontSize: 14, fontWeight: '700', color: C.white },
  headerRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  headerRoleDot: { width: 6, height: 6, borderRadius: 3 },
  headerRoleTxt: { fontSize: 10, fontWeight: '600' },
  connDot: {
    width: 9, height: 9, borderRadius: 5,
    borderWidth: 2, borderColor: C.ink,
  },

  // ── Connection banner
  connBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#F97316', paddingVertical: 5,
  },
  connBannerTxt: { fontSize: 11, fontWeight: '600', color: C.white },

  // ── Avatar
  avatar:    { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: '800' },
  avatarSlot: {},

  // ── List
  list:        { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },

  // ── Time divider
  timeDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginVertical: 14, paddingHorizontal: 4,
  },
  timeDividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  timeDividerTxt:  { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  // ── Message row
  msgRow: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  msgRowMe:   { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },

  // ── Bubble
  bubble: {
    maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: C.bubbleOut,
    borderBottomRightRadius: 5,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  bubbleThem: {
    backgroundColor: C.bubbleIn,
    borderBottomLeftRadius: 5,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1, borderColor: C.border,
  },
  bubbleMeFirst:   {},
  bubbleThemFirst: {},

  bubbleTxt:     { fontSize: 14, lineHeight: 20 },
  bubbleTxtMe:   { color: C.white },
  bubbleTxtThem: { color: C.textPrimary },

  bubbleMeta:    { flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' },
  bubbleTime:    { fontSize: 10, color: C.textMuted },
  bubbleTimeMe:  { color: 'rgba(255,255,255,0.45)' },

  // ── Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.white,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: C.surface, borderRadius: 22,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    minHeight: 42, justifyContent: 'center',
  },
  input: {
    fontSize: 14, color: C.textPrimary, maxHeight: 100,
    padding: 0, margin: 0,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.teal, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: C.border, shadowOpacity: 0 },

  // ── Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 19 },

  // ── Loading / error
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTxt:   { fontSize: 16, color: '#FF6B6B', marginTop: 14, textAlign: 'center' },
  loadingTxt: { fontSize: 13, color: C.textSecondary, marginTop: 12 },
  backBtn: {
    marginTop: 20, paddingHorizontal: 22, paddingVertical: 10,
    backgroundColor: C.teal, borderRadius: 9,
  },
  backBtnTxt: { color: C.white, fontSize: 14, fontWeight: '700' },
});