import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getConversations,
  getUsers,
  getAdmins,
  searchUsers,
  setActiveChat,
  clearSearchResults,
} from '../../redux/slices/messageSlice';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  ink:      '#071B2E',
  navy:     '#0A2540',
  navyMid:  '#103559',
  teal:     '#00C9A7',
  tealDark: '#009E84',
  tealDim:  'rgba(0,201,167,0.13)',
  tealGlow: 'rgba(0,201,167,0.22)',
  tealLine: 'rgba(0,201,167,0.35)',
  white:    '#FFFFFF',
  offWhite: '#F7FAFB',
  border:   '#D8E4EE',
  borderDk: 'rgba(255,255,255,0.09)',
  slate:    '#4E6B87',
  slateL:   '#8BA5BC',
  ghost:    'rgba(255,255,255,0.55)',
  red:      '#EF4444',
  green:    '#22C55E',
  amber:    '#F59E0B',
  blue:     '#60A5FA',
};

// ── FadeIn animation ──────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0 }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ── Avatar initial ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [C.teal, C.blue, '#A78BFA', '#F97316', '#22C55E', '#F59E0B'];
const getAvatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const Avatar = ({ name = '', size = 46 }) => {
  const bg = getAvatarColor(name);
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: `${bg}22`, borderColor: `${bg}55` }]}>
      <Text style={[s.avatarTxt, { color: bg, fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase() || 'U'}
      </Text>
    </View>
  );
};

// ── Time formatter ────────────────────────────────────────────────────────────
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    const now  = new Date();
    const days = Math.floor((now - date) / 86400000);
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7)  return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString();
  } catch { return ''; }
};

// ─────────────────────────────────────────────────────────────────────────────
const MessageList = () => {
  const dispatch    = useDispatch();
  const navigation  = useNavigation();
  const { conversations, users, admins, searchResults, loading } =
    useSelector((s) => s.message);
  const authState   = useSelector((s) => s.auth);
  const currentUser = authState.user || authState.userInfo;

  const [searchQuery,        setSearchQuery]        = useState('');
  const [activeTab,          setActiveTab]          = useState('chats');
  const [showSearchResults,  setShowSearchResults]  = useState(false);
  const [refreshing,         setRefreshing]         = useState(false);
  const [focusedSearch,      setFocusedSearch]      = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (currentUser?.id) loadData();
    }, [currentUser])
  );

  useEffect(() => {
    if (currentUser?.id) loadData();
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const t = setTimeout(() => { dispatch(searchUsers(searchQuery)); setShowSearchResults(true); }, 500);
      return () => clearTimeout(t);
    } else {
      setShowSearchResults(false);
      dispatch(clearSearchResults());
    }
  }, [searchQuery]);

  const loadData = async () => {
    if (!currentUser?.id) return;
    try {
      if (currentUser?.role === 'admin') await dispatch(getUsers()).unwrap();
      else                               await dispatch(getAdmins()).unwrap();
      await dispatch(getConversations(currentUser.id)).unwrap();
    } catch (e) {
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const startChat = (otherUser) => {
    if (!otherUser?._id) { Alert.alert('Error', 'User information is incomplete'); return; }
    if (!currentUser?.id){ Alert.alert('Error', 'Please make sure you are logged in.'); return; }
    const userToChat = {
      _id: otherUser._id,
      username: otherUser.username || 'Unknown User',
      email: otherUser.email || '',
      role: otherUser.role,
      profile: otherUser.profile,
    };
    dispatch(setActiveChat(userToChat));
    navigation.navigate('ChatScreen', { user: userToChat });
  };

  // ── Conversation row ────────────────────────────────────────────────────────
  const renderConversation = ({ item, index }) => {
    if (!item.user) return null;
    const name = item.user?.username || 'Unknown';
    const hasUnread = item.unread;
    return (
      <FadeIn delay={index * 40}>
        <TouchableOpacity
          style={[s.convRow, hasUnread && s.convRowUnread]}
          onPress={() => startChat(item.user)}
          activeOpacity={0.8}
        >
          <View style={s.convAvatarWrap}>
            <Avatar name={name} size={48} />
            <View style={s.onlineDot} />
          </View>
          <View style={s.convInfo}>
            <Text style={[s.convName, hasUnread && { color: C.navy, fontWeight: '800' }]}>
              {name}
            </Text>
            <Text style={s.convLastMsg} numberOfLines={1}>
              {item.lastMessage?.text || 'No messages yet'}
            </Text>
          </View>
          <View style={s.convMeta}>
            <Text style={s.convTime}>{formatTime(item.lastMessage?.timestamp)}</Text>
            {hasUnread && <View style={s.unreadDot} />}
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  // ── User row ────────────────────────────────────────────────────────────────
  const renderUser = ({ item, index }) => (
    <FadeIn delay={index * 40}>
      <TouchableOpacity
        style={s.userRow}
        onPress={() => startChat(item)}
        activeOpacity={0.8}
      >
        <Avatar name={item.username || 'U'} size={48} />
        <View style={s.userInfo}>
          <Text style={s.userName}>{item.username || 'Unknown User'}</Text>
          <Text style={s.userEmail}>{item.email || ''}</Text>
        </View>
        <View style={[s.chatChip, { backgroundColor: C.tealDim, borderColor: C.tealLine }]}>
          <Ionicons name="chatbubble-outline" size={13} color={C.teal} />
          <Text style={s.chatChipTxt}>Chat</Text>
        </View>
      </TouchableOpacity>
    </FadeIn>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => (
    <FadeIn delay={0}>
      <View style={s.emptyWrap}>
        <View style={s.emptyIconWrap}>
          <Ionicons name={icon} size={38} color={C.teal} />
        </View>
        <Text style={s.emptyTitle}>{title}</Text>
        <Text style={s.emptyText}>{subtitle}</Text>
        {actionLabel && (
          <TouchableOpacity style={s.emptyBtn} onPress={onAction} activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={15} color={C.navy} />
            <Text style={s.emptyBtnTxt}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </FadeIn>
  );

  // ── Not logged in ───────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <View style={s.root}>
        <View style={s.header}><View style={s.headerBlob} /></View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={s.loadingTxt}>Loading user information…</Text>
        </View>
      </View>
    );
  }

  const isAdmin      = currentUser?.role === 'admin';
  const contactsData = isAdmin ? users : admins;
  const contactsTab  = isAdmin ? 'Users' : 'Admins';
  const contactsCount= contactsData?.length || 0;
  const convsCount   = conversations?.length || 0;

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerBlob} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Messages</Text>
          <Text style={s.headerSub}>
            {convsCount} conversation{convsCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.backBtn} onPress={loadData} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={19} color={C.ghost} />
        </TouchableOpacity>
      </View>

      {/* ── Profile strip ── */}
      <FadeIn delay={0}>
        <View style={s.profileStrip}>
          <Avatar name={currentUser?.username || 'U'} size={44} />
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{currentUser?.username || 'User'}</Text>
            <Text style={s.profileRole}>{currentUser?.role || 'User'}</Text>
          </View>
          <View style={[s.roleBadge, { backgroundColor: isAdmin ? 'rgba(96,165,250,0.15)' : C.tealDim, borderColor: isAdmin ? 'rgba(96,165,250,0.4)' : C.tealLine }]}>
            <Ionicons name={isAdmin ? 'shield-checkmark-outline' : 'person-outline'} size={12} color={isAdmin ? C.blue : C.teal} />
            <Text style={[s.roleBadgeTxt, { color: isAdmin ? C.blue : C.teal }]}>
              {isAdmin ? 'Admin' : 'Member'}
            </Text>
          </View>
        </View>
      </FadeIn>

      {/* ── Search bar ── */}
      <FadeIn delay={40}>
        <View style={s.searchWrap}>
          <View style={[s.searchBar, focusedSearch && s.searchBarFocused]}>
            <Ionicons name="search-outline" size={16} color={C.slateL} />
            <TextInput
              style={s.searchInput}
              placeholder="Search users…"
              placeholderTextColor={C.slateL}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setFocusedSearch(true)}
              onBlur={() => setFocusedSearch(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={C.slateL} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </FadeIn>

      {/* ── Tab bar (continuous dark panel, like other screens) ── */}
      {!showSearchResults && (
        <FadeIn delay={60}>
          <View style={s.tabBar}>
            {[
              { key: 'chats',   label: `Chats (${convsCount})`,           icon: 'chatbubbles-outline' },
              { key: 'contacts',label: `${contactsTab} (${contactsCount})`, icon: 'people-outline'     },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tab, active && s.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab.icon} size={14} color={active ? C.navy : C.teal} />
                  <Text style={[s.tabTxt, active && s.tabTxtActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeIn>
      )}

      {/* ── Search results label ── */}
      {showSearchResults && searchQuery.length > 0 && (
        <FadeIn delay={0}>
          <View style={s.searchResultBar}>
            <Ionicons name="search-outline" size={13} color={C.teal} />
            <Text style={s.searchResultTxt}>
              {searchResults?.length || 0} result{searchResults?.length !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
          </View>
        </FadeIn>
      )}

      {/* ── Lists ── */}
      {showSearchResults ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id || `u-${Math.random()}`}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No users found"
              subtitle="Try a different search term."
            />
          }
        />
      ) : activeTab === 'chats' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.user?._id || `c-${Math.random()}`}
          renderItem={renderConversation}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.listContent, conversations?.length === 0 && { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />}
          ListEmptyComponent={
            loading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color={C.teal} />
                <Text style={s.loadingTxt}>Loading conversations…</Text>
              </View>
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="No conversations yet"
                subtitle={`Start a chat with ${isAdmin ? 'users' : 'admins'} from the ${contactsTab} tab.`}
                actionLabel="Refresh"
                onAction={loadData}
              />
            )
          }
        />
      ) : (
        <FlatList
          data={contactsData}
          keyExtractor={(item) => item._id || `u-${Math.random()}`}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.listContent, contactsData?.length === 0 && { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />}
          ListEmptyComponent={
            loading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color={C.teal} />
                <Text style={s.loadingTxt}>Loading {contactsTab.toLowerCase()}…</Text>
              </View>
            ) : (
              <EmptyState
                icon="people-outline"
                title={`No ${contactsTab.toLowerCase()} found`}
                subtitle={isAdmin ? 'There are no users in the system.' : 'There are no admins available.'}
              />
            )
          }
        />
      )}
    </View>
  );
};

export default MessageList;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.offWhite },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 18, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.borderDk,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.tealGlow, top: -80, right: -70,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter:  { flex: 1, alignItems: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '900', color: C.white, letterSpacing: -0.2 },
  headerSub:     { fontSize: 10, color: C.teal, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 },

  // ── Profile strip ─────────────────────────────────────────────────────────────
  profileStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.ink,
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 2,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  profileInfo: { flex: 1 },
  profileName:  { fontSize: 15, fontWeight: '800', color: C.white },
  profileRole:  { fontSize: 11, color: C.ghost, textTransform: 'capitalize', marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10,
  },
  roleBadgeTxt: { fontSize: 11, fontWeight: '700' },

  // ── Search ────────────────────────────────────────────────────────────────────
  searchWrap:  { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 46,
  },
  searchBarFocused: {
    borderColor: C.tealLine,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.navy },

  searchResultBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
  },
  searchResultTxt: { fontSize: 12, color: C.tealDark, fontWeight: '600' },

  // ── Tab bar ───────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.border,
  },
  tabActive:    { backgroundColor: C.teal, borderColor: C.teal,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  tabTxt:       { fontSize: 12, fontWeight: '700', color: C.teal },
  tabTxtActive: { color: C.navy },

  // ── Avatar ────────────────────────────────────────────────────────────────────
  avatar:    { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: '900' },

  // ── Conversation row ──────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  convRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.06)',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  convRowUnread: { borderColor: C.tealLine, backgroundColor: 'rgba(0,201,167,0.04)' },
  convAvatarWrap:{ position: 'relative' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.white,
  },
  convInfo:    { flex: 1 },
  convName:    { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 3 },
  convLastMsg: { fontSize: 12, color: C.slateL, lineHeight: 18 },
  convMeta:    { alignItems: 'flex-end', gap: 6 },
  convTime:    { fontSize: 11, color: C.slateL },
  unreadDot:   { width: 9, height: 9, borderRadius: 5, backgroundColor: C.teal },

  // ── User row ──────────────────────────────────────────────────────────────────
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.06)',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  userInfo:  { flex: 1 },
  userName:  { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 2 },
  userEmail: { fontSize: 12, color: C.slateL },
  chatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10,
  },
  chatChipTxt: { fontSize: 11, fontWeight: '700', color: C.teal },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  emptyWrap:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: C.navy, marginBottom: 8, textAlign: 'center' },
  emptyText:  { fontSize: 13, color: C.slate, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.teal, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 24,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  emptyBtnTxt: { fontSize: 14, fontWeight: '800', color: C.navy },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  loadingTxt:  { marginTop: 14, fontSize: 14, color: C.slate, fontWeight: '600' },
});