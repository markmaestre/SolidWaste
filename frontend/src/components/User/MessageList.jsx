import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, RefreshControl,
  Animated, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getConversations,
  getUsers,
  searchUsers,
  setActiveChat,
  clearSearchResults,
} from '../../redux/slices/messageSlice';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  // Base
  ink:       '#06121E',
  navy:      '#0B2033',
  navyMid:   '#153045',
  teal:      '#00B896',
  tealLight: '#00D4AC',
  tealDark:  '#008F75',
  tealDim:   'rgba(0,184,150,0.10)',
  tealLine:  'rgba(0,184,150,0.28)',
  tealGlow:  'rgba(0,184,150,0.16)',
  // Surface
  white:     '#FFFFFF',
  surface:   '#F5F8FA',
  surfaceAlt:'#EEF3F7',
  border:    '#D9E4EE',
  borderSoft:'rgba(11,32,51,0.08)',
  // Text
  textPrimary:  '#0B2033',
  textSecondary:'#4A6580',
  textMuted:    '#8EA5BC',
  ghost:        'rgba(255,255,255,0.55)',
  // Role accents
  blue:      '#2A7FE8',
  orange:    '#E07B2A',
  green:     '#22C55E',
};

const ROLE_COLORS = {
  admin:      C.blue,
  southadmin: C.teal,
  user:       C.orange,
};

const ROLE_LABELS = {
  admin:      'Super Admin',
  southadmin: 'South Admin',
  user:       'Resident',
};

const ROLE_ICONS = {
  admin:      'shield-checkmark',
  southadmin: 'shield-half',
  user:       'person',
};

// ── Serialization helper ───────────────────────────────────────────────────────
// Strips any non-serializable values (Date objects, class instances, etc.)
// before storing a user object in Redux state.
const sanitizeUser = (person) => {
  if (!person) return null;
  return {
    _id:                   person._id        ? String(person._id)        : null,
    username:              person.username   ? String(person.username)   : null,
    email:                 person.email      ? String(person.email)      : null,
    role:                  person.role       ? String(person.role)       : 'user',
    userType:              person.userType   ? String(person.userType)   : null,
    barangay:              person.barangay   ? String(person.barangay)   : null,
    assignedBarangayLabel: person.assignedBarangayLabel
                             ? String(person.assignedBarangayLabel)
                             : null,
  };
};

// ── FadeIn ─────────────────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0 }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', role = 'user', size = 46 }) => {
  const roleColor = ROLE_COLORS[role] || C.textSecondary;
  const initials  = (name || '?').charAt(0).toUpperCase();
  return (
    <View style={[s.avatar, {
      width: size, height: size,
      borderRadius: size * 0.26,
      backgroundColor: `${roleColor}18`,
      borderColor: `${roleColor}40`,
    }]}>
      <Text style={[s.avatarTxt, { color: roleColor, fontSize: size * 0.40 }]}>
        {initials}
      </Text>
    </View>
  );
};

// ── Role pill ─────────────────────────────────────────────────────────────────
const RolePill = ({ role }) => {
  const color = ROLE_COLORS[role] || C.textMuted;
  const label = ROLE_LABELS[role] || role;
  const icon  = ROLE_ICONS[role]  || 'ellipse';
  return (
    <View style={[s.rolePill, { backgroundColor: `${color}14`, borderColor: `${color}38` }]}>
      <Ionicons name={icon} size={9} color={color} />
      <Text style={[s.rolePillTxt, { color }]}>{label}</Text>
    </View>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (ts) => {
  if (!ts) return '';
  try {
    const d    = new Date(ts);
    const now  = new Date();
    const days = Math.floor((now - d) / 86400000);
    if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7)  return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

const isAdminRole = (role) => role === 'admin' || role === 'southadmin';

// ── Component ─────────────────────────────────────────────────────────────────
const MessageList = () => {
  const dispatch   = useDispatch();
  const navigation = useNavigation();

  const { conversations, users, searchResults, loading } = useSelector(st => st.message);
  const authState   = useSelector(st => st.auth);
  const currentUser = authState.user || authState.userInfo;

  const [searchQuery,       setSearchQuery]       = useState('');
  const [activeTab,         setActiveTab]         = useState('chats');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [refreshing,        setRefreshing]        = useState(false);
  const [focusedSearch,     setFocusedSearch]     = useState(false);

  const isAdmin = isAdminRole(currentUser?.role);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(getConversations()).unwrap(),
        dispatch(getUsers()).unwrap(),
      ]);
    } catch (e) {
      console.error('Load data error:', e);
      Alert.alert('Error', 'Failed to load messages. Pull down to retry.');
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData])
  );

  // ── Search debounce ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length > 1) {
      const t = setTimeout(() => {
        dispatch(searchUsers({ query: searchQuery }));
        setShowSearchResults(true);
      }, 400);
      return () => clearTimeout(t);
    } else {
      setShowSearchResults(false);
      dispatch(clearSearchResults());
    }
  }, [searchQuery, dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Start chat ──────────────────────────────────────────────────────────────
  // FIX: sanitize the person object before dispatching to Redux to prevent
  // "non-serializable value detected" errors caused by Date objects,
  // Mongoose class instances, or other non-plain values from the API response.
  const startChat = (person) => {
    if (!person?._id) {
      Alert.alert('Error', 'User information is incomplete.');
      return;
    }
    const safePerson = sanitizeUser(person);
    dispatch(setActiveChat(safePerson));
    navigation.navigate('ChatScreen', { user: safePerson });
  };

  // ── Conversation row ────────────────────────────────────────────────────────
  const renderConversation = ({ item, index }) => {
    const person = item.user;
    if (!person) return null;
    const name      = person.username || person.email?.split('@')[0] || 'Unknown';
    const role      = person.role || 'user';
    const hasUnread = item.unread || item.unreadCount > 0;
    const lastText  = item.lastMessage?.text || 'No messages yet';
    // FIX: normalize timestamp to a plain string/number so it stays serializable
    // when any part of the conversation item is later stored in Redux.
    const rawTs     = item.lastMessage?.timestamp || item.timestamp;
    const timestamp = rawTs instanceof Date ? rawTs.toISOString() : rawTs;

    return (
      <FadeIn delay={index * 30}>
        <TouchableOpacity
          style={[s.convRow, hasUnread && s.convRowUnread]}
          onPress={() => startChat(person)}
          activeOpacity={0.75}
        >
          <View style={s.avatarWrap}>
            <Avatar name={name} role={role} size={48} />
            <View style={s.onlineDot} />
          </View>

          <View style={s.convBody}>
            <View style={s.convHeader}>
              <Text style={[s.convName, hasUnread && s.convNameBold]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={s.convTime}>{formatTime(timestamp)}</Text>
            </View>
            <View style={s.convFooter}>
              <Text style={[s.lastMsg, hasUnread && s.lastMsgUnread]} numberOfLines={1}>
                {lastText}
              </Text>
              {hasUnread ? (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadBadgeTxt}>
                    {item.unreadCount > 9 ? '9+' : (item.unreadCount || '•')}
                  </Text>
                </View>
              ) : null}
            </View>
            <RolePill role={role} />
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  // ── Contact row ─────────────────────────────────────────────────────────────
  const renderContact = ({ item, index }) => {
    const name     = item.username || item.email?.split('@')[0] || 'Unknown';
    const role     = item.role || 'user';
    const barangay = item.barangay;

    return (
      <FadeIn delay={index * 30}>
        <TouchableOpacity style={s.contactRow} onPress={() => startChat(item)} activeOpacity={0.75}>
          <Avatar name={name} role={role} size={46} />

          <View style={s.contactBody}>
            <Text style={s.contactName} numberOfLines={1}>{name}</Text>
            <Text style={s.contactEmail} numberOfLines={1}>{item.email || ''}</Text>
            {barangay ? (
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={10} color={C.textMuted} />
                <Text style={s.locationTxt}>{barangay}</Text>
              </View>
            ) : null}
            <RolePill role={role} />
          </View>

          <View style={s.msgChip}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.teal} />
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyState = ({ icon, title, subtitle, onAction }) => (
    <FadeIn>
      <View style={s.emptyWrap}>
        <View style={s.emptyIconBox}>
          <Ionicons name={icon} size={30} color={C.teal} />
        </View>
        <Text style={s.emptyTitle}>{title}</Text>
        <Text style={s.emptySubtitle}>{subtitle}</Text>
        {onAction && (
          <TouchableOpacity style={s.emptyBtn} onPress={onAction} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={14} color={C.white} />
            <Text style={s.emptyBtnTxt}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    </FadeIn>
  );

  if (!currentUser) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      </SafeAreaView>
    );
  }

  const convsCount       = conversations?.length || 0;
  const contactsTabLabel = isAdmin ? 'Directory' : 'Admins';
  const filteredContacts = isAdmin
    ? users
    : users.filter(u => u.userType === 'Admin');

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />
      <View style={s.root}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Messages</Text>
          </View>

          <TouchableOpacity style={s.backBtn} onPress={loadData} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={18} color={C.ghost} />
          </TouchableOpacity>
        </View>

        {/* ── Profile strip ── */}
        <FadeIn>
          <View style={s.profileStrip}>
            <Avatar name={currentUser.username || currentUser.email} role={currentUser.role} size={44} />
            <View style={s.profileMeta}>
              <Text style={s.profileName}>
                {currentUser.username || currentUser.email?.split('@')[0] || 'You'}
              </Text>
              {(currentUser.assignedBarangayLabel || currentUser.barangay) ? (
                <View style={s.profileLocationRow}>
                  <Ionicons name="location-outline" size={10} color={C.textMuted} />
                  <Text style={s.profileLocation}>
                    {currentUser.assignedBarangayLabel || currentUser.barangay}
                  </Text>
                </View>
              ) : null}
            </View>
            <RolePill role={currentUser.role} />
          </View>
        </FadeIn>

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Search bar ── */}
        <FadeIn delay={20}>
          <View style={s.searchWrap}>
            <View style={[s.searchBar, focusedSearch && s.searchBarFocused]}>
              <Ionicons name="search-outline" size={15} color={C.textMuted} />
              <TextInput
                style={s.searchInput}
                placeholder="Search users…"
                placeholderTextColor={C.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setFocusedSearch(true)}
                onBlur={() => setFocusedSearch(false)}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={15} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </FadeIn>

        {/* ── Tab bar ── */}
        {!showSearchResults && (
          <FadeIn delay={40}>
            <View style={s.tabBar}>
              {[
                { key: 'chats',    label: `Chats`,            count: convsCount,              icon: 'chatbubbles-outline' },
                { key: 'contacts', label: contactsTabLabel,   count: filteredContacts.length, icon: 'people-outline' },
              ].map(tab => {
                const active = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[s.tab, active && s.tabActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={tab.icon} size={13} color={active ? C.white : C.textSecondary} />
                    <Text style={[s.tabTxt, active && s.tabTxtActive]}>{tab.label}</Text>
                    <View style={[s.tabCount, active && s.tabCountActive]}>
                      <Text style={[s.tabCountTxt, active && s.tabCountTxtActive]}>{tab.count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </FadeIn>
        )}

        {/* ── Search results label ── */}
        {showSearchResults && (
          <View style={s.searchResultBar}>
            <Ionicons name="search-outline" size={11} color={C.tealDark} />
            <Text style={s.searchResultTxt}>
              {searchResults?.length || 0} result{searchResults?.length !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
          </View>
        )}

        {/* ── Lists ── */}
        {showSearchResults ? (
          <FlatList
            data={searchResults}
            keyExtractor={item => item._id?.toString() || Math.random().toString()}
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.list, !searchResults?.length && { flexGrow: 1 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
            ListEmptyComponent={
              <EmptyState
                icon="search-outline"
                title="No results found"
                subtitle="Try a different name or email address."
              />
            }
          />
        ) : activeTab === 'chats' ? (
          <FlatList
            data={conversations}
            keyExtractor={item => (item.user?._id || Math.random()).toString()}
            renderItem={renderConversation}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.list, !conversations?.length && { flexGrow: 1 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
            ListEmptyComponent={
              loading
                ? <View style={s.loadingWrap}><ActivityIndicator size="large" color={C.teal} /></View>
                : <EmptyState
                    icon="chatbubbles-outline"
                    title="No conversations yet"
                    subtitle={`Visit the ${contactsTabLabel} tab to start a conversation.`}
                    onAction={loadData}
                  />
            }
          />
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={item => item._id?.toString() || Math.random().toString()}
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.list, !filteredContacts?.length && { flexGrow: 1 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
            ListEmptyComponent={
              loading
                ? <View style={s.loadingWrap}><ActivityIndicator size="large" color={C.teal} /></View>
                : <EmptyState
                    icon="people-outline"
                    title="No contacts found"
                    subtitle="There are no contacts available in your area."
                    onAction={loadData}
                  />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default MessageList;

// ── Stylesheet ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ink },
  root: { flex: 1, backgroundColor: C.surface },

  // ── Header
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 4 : 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 15, fontWeight: '700', color: C.white, letterSpacing: 0.2,
  },

  // ── Profile strip
  profileStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.ink,
    paddingHorizontal: 18, paddingTop: 4, paddingBottom: 16,
  },
  profileMeta: { flex: 1 },
  profileName: { fontSize: 14, fontWeight: '700', color: C.white },
  profileLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  profileLocation: { fontSize: 11, color: C.textMuted },

  // ── Divider
  divider: { height: 1, backgroundColor: C.borderSoft, marginHorizontal: 0 },

  // ── Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.white,
    borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 12, height: 42,
  },
  searchBarFocused: { borderColor: C.tealLine },
  searchInput: { flex: 1, fontSize: 13, color: C.textPrimary },

  searchResultBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    borderRadius: 8, paddingVertical: 7, paddingHorizontal: 11,
  },
  searchResultTxt: { fontSize: 11, color: C.tealDark, fontWeight: '600' },

  // ── Tabs
  tabBar: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 9,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.navy, borderColor: C.navy,
    shadowColor: C.navy, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
  },
  tabTxt:       { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  tabTxtActive: { color: C.white },
  tabCount: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  tabCountActive:    { backgroundColor: 'rgba(255,255,255,0.18)' },
  tabCountTxt:       { fontSize: 9, fontWeight: '700', color: C.textSecondary },
  tabCountTxtActive: { color: C.white },

  // ── Avatar
  avatar:    { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontWeight: '800' },

  // ── Role pill
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 5,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  rolePillTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },

  // ── List
  list: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 2 },

  // ── Conversation row
  convRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.white, borderRadius: 12, padding: 13, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(11,32,51,0.06)',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  convRowUnread: {
    borderColor: C.tealLine,
    backgroundColor: 'rgba(0,184,150,0.025)',
  },
  avatarWrap: { position: 'relative', marginTop: 2 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.white,
  },
  convBody:   { flex: 1 },
  convHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  convName:   { flex: 1, fontSize: 13, fontWeight: '600', color: C.textPrimary },
  convNameBold: { fontWeight: '800' },
  convTime:   { fontSize: 10, color: C.textMuted, marginLeft: 8 },
  convFooter: { flexDirection: 'row', alignItems: 'center' },
  lastMsg:    { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 16 },
  lastMsgUnread: { color: C.textSecondary, fontWeight: '500' },
  unreadBadge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  unreadBadgeTxt: { fontSize: 9, fontWeight: '800', color: C.white },

  // ── Contact row
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 12, padding: 13, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(11,32,51,0.06)',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 1,
  },
  contactBody:   { flex: 1 },
  contactName:   { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  contactEmail:  { fontSize: 11, color: C.textMuted, marginTop: 2 },
  locationRow:   { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationTxt:   { fontSize: 10, color: C.textMuted },
  msgChip: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Empty state
  emptyWrap: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 40,
  },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 7, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.teal, borderRadius: 9,
    paddingVertical: 10, paddingHorizontal: 20,
  },
  emptyBtnTxt: { fontSize: 13, fontWeight: '700', color: C.white },

  // ── Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});