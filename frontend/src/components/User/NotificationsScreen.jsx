import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Switch,
  TextInput,
  Animated,
  Platform,
  Modal,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  updateNotificationPreferences,
  initializeNotifications,
} from '../../redux/slices/notificationSlice';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  redDim:   'rgba(239,68,68,0.10)',
  redLine:  'rgba(239,68,68,0.25)',
  green:    '#22C55E',
  greenDim: 'rgba(34,197,94,0.13)',
  greenLine:'rgba(34,197,94,0.35)',
  amber:    '#F59E0B',
  amberDim: 'rgba(245,158,11,0.13)',
  amberLine:'rgba(245,158,11,0.35)',
  blue:     '#60A5FA',
  blueDim:  'rgba(96,165,250,0.13)',
  blueLine: 'rgba(96,165,250,0.35)',
  overlay:  'rgba(7,27,46,0.72)',
};

// ── FadeIn ────────────────────────────────────────────────────────────────────
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

// ── Type helpers ──────────────────────────────────────────────────────────────
const TYPE_META = {
  report_created:   { icon: 'document-text-outline',    color: C.teal,  label: 'REPORT' },
  report_processed: { icon: 'checkmark-circle-outline', color: C.blue,  label: 'UPDATE' },
  recycling_tips:   { icon: 'leaf-outline',             color: C.green, label: 'TIP'    },
};
const getTypeMeta = (t) =>
  TYPE_META[t] || { icon: 'notifications-outline', color: C.slateL, label: 'INFO' };

const getTypeLabel = (type) => {
  switch (type) {
    case 'report_created':   return 'Report Submitted';
    case 'report_processed': return 'Report Status Update';
    case 'recycling_tips':   return 'Recycling Tip';
    default:                 return 'General Notification';
  }
};

const getTypeExplanation = (type) => {
  switch (type) {
    case 'report_created':
      return 'Your recycling report has been successfully submitted. Our team will review the report and may take action on the issue you flagged. You will be notified once it has been processed.';
    case 'report_processed':
      return 'One of your submitted reports has been updated. This may mean it has been reviewed, approved, or that a resolution has been reached. Tap "View Report" below to see the full details.';
    case 'recycling_tips':
      return 'This is an eco-tip from the EcoTrack team to help you recycle smarter and reduce waste. Small daily habits lead to a meaningful environmental impact over time.';
    default:
      return 'This is a general notification from EcoTrack. It may contain important updates about your account, app changes, or announcements from the team.';
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now  = new Date();
  const diff = Math.abs(now - date);
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  === 1) return 'Yesterday';
  if (days  < 7)   return `${days}d ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

// ── Notification Detail Modal ─────────────────────────────────────────────────
const NotificationModal = ({ visible, item, onClose, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 70,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!item) return null;

  const meta       = getTypeMeta(item.type);
  const typeLabel  = getTypeLabel(item.type);
  const explanation = getTypeExplanation(item.type);
  const hasAction  = ['report_created', 'report_processed'].includes(item.type);
  const hasTipLink = item.type === 'recycling_tips' && (item.link || item.data?.link);
  const showAction = hasAction || hasTipLink;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[m.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          m.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Drag handle */}
        <View style={m.handle} />

        {/* ── Modal header ── */}
        <View style={m.modalHeader}>
          {/* Left: icon */}
          <View style={[m.headerIconWrap, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
            <Ionicons name={meta.icon} size={26} color={meta.color} />
          </View>

          {/* Center: title stack */}
          <View style={m.headerTextBlock}>
            <View style={[m.typePill, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
              <View style={[m.pillDot, { backgroundColor: meta.color }]} />
              <Text style={[m.pillTxt, { color: meta.color }]}>{meta.label}</Text>
            </View>
            <Text style={m.headerTypeLabel}>{typeLabel}</Text>
          </View>

          {/* Right: close */}
          <TouchableOpacity style={m.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={C.slate} />
          </TouchableOpacity>
        </View>

        {/* Accent line */}
        <View style={[m.accentLine, { backgroundColor: meta.color }]} />

        {/* ── Scrollable body ── */}
        <ScrollView
          style={m.body}
          contentContainerStyle={m.bodyContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Notification title */}
          <Text style={m.notifTitle}>{item.title}</Text>

          {/* Full message */}
          <Text style={m.notifMessage}>{item.message}</Text>

          {/* Meta chips row */}
          <View style={m.chipsRow}>
            <View style={m.chip}>
              <Ionicons name="time-outline" size={13} color={C.slateL} />
              <Text style={m.chipTxt}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={[
              m.chip,
              item.read
                ? { backgroundColor: C.greenDim, borderColor: C.greenLine }
                : { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` },
            ]}>
              <Ionicons
                name={item.read ? 'checkmark-done-circle-outline' : 'radio-button-on-outline'}
                size={13}
                color={item.read ? C.green : meta.color}
              />
              <Text style={[m.chipTxt, { color: item.read ? C.green : meta.color }]}>
                {item.read ? 'Read' : 'Unread'}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={m.sectionDivider} />

          {/* What does this mean section */}
          <View style={m.sectionHeader}>
            <Ionicons name="information-circle-outline" size={16} color={meta.color} />
            <Text style={[m.sectionTitle, { color: meta.color }]}>What does this mean?</Text>
          </View>
          <View style={[m.explanationBox, { backgroundColor: `${meta.color}0D`, borderColor: `${meta.color}30` }]}>
            <Text style={m.explanationTxt}>{explanation}</Text>
          </View>

          {/* Extra data fields (reportId etc.) */}
          {(item.reportId || item.data?.reportId) && (
            <>
              <View style={m.sectionDivider} />
              <View style={m.sectionHeader}>
                <Ionicons name="link-outline" size={16} color={C.slateL} />
                <Text style={[m.sectionTitle, { color: C.slate }]}>Reference</Text>
              </View>
              <View style={m.refBox}>
                <Text style={m.refLabel}>Report ID</Text>
                <Text style={m.refValue}>{item.reportId || item.data?.reportId}</Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* ── Footer CTA ── */}
        {showAction && (
          <View style={m.footer}>
            <TouchableOpacity
              style={[m.ctaBtn, { backgroundColor: meta.color }]}
              onPress={onNavigate}
              activeOpacity={0.85}
            >
              <Ionicons
                name={hasAction ? 'document-text-outline' : 'leaf-outline'}
                size={18}
                color={C.navy}
              />
              <Text style={m.ctaTxt}>
                {hasAction ? 'View Report Details' : 'Read Full Tip'}
              </Text>
              <Ionicons name="arrow-forward-outline" size={16} color={C.navy} />
            </TouchableOpacity>
          </View>
        )}

        {!showAction && (
          <View style={m.footer}>
            <TouchableOpacity style={m.dismissBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={m.dismissTxt}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { notifications, loading, unreadCount, notificationPreferences } =
    useSelector((s) => s.notification);

  const [refreshing,    setRefreshing]    = useState(false);
  const [showSettings,  setShowSettings]  = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [preferences,   setPreferences]   = useState({
    notificationsEnabled: true,
    reportUpdates:        true,
    recyclingTips:        true,
    systemNotifications:  true,
  });

  useEffect(() => { loadNotifications(); initNotifService(); }, []);
  useEffect(() => {
    if (notificationPreferences) setPreferences(p => ({ ...p, ...notificationPreferences }));
  }, [notificationPreferences]);

  const filtered = notifications.filter(n =>
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initNotifService = async () => {
    try { await dispatch(initializeNotifications()).unwrap(); }
    catch (e) { console.log('Failed to initialize notification service:', e); }
  };

  const loadNotifications = async () => {
    try { await dispatch(getNotifications()).unwrap(); }
    catch (e) { Alert.alert('Error', 'Failed to load notifications'); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadNotifications(); setRefreshing(false); };

  const handleMarkAsRead = async (id) => {
    try { await dispatch(markAsRead(id)).unwrap(); }
    catch (e) { Alert.alert('Error', 'Failed to mark notification as read'); }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try { await dispatch(markAllAsRead()).unwrap(); }
    catch (e) { Alert.alert('Error', 'Failed to mark all notifications as read'); }
  };

  const handlePreferenceChange = async (key, value) => {
    try {
      const updated = { ...preferences, [key]: value };
      setPreferences(updated);
      await dispatch(updateNotificationPreferences(updated)).unwrap();
    } catch (e) {
      setPreferences(p => ({ ...p, [key]: !value }));
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  const handleNotificationPress = async (item) => {
    if (!item.read) await handleMarkAsRead(item._id);
    setSelectedNotif(item);
    setModalVisible(true);
  };

  const handleModalNavigate = () => {
    const item = selectedNotif;
    setModalVisible(false);
    setTimeout(() => setSelectedNotif(null), 300);

    switch (item.type) {
      case 'report_created':
      case 'report_processed':
        if (item.reportId) {
          navigation.navigate('ReportDetail', { reportId: item.reportId });
        } else if (item.data?.reportId) {
          navigation.navigate('ReportDetail', { reportId: item.data.reportId });
        }
        break;
      case 'recycling_tips':
        if (item.link || item.data?.link) {
          navigation.navigate('RecyclingTipsDetail', { tip: item });
        }
        break;
      default:
        break;
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedNotif(null), 300);
  };

  // ── Notification card ──────────────────────────────────────────────────────
  const renderItem = ({ item, index }) => {
    const meta = getTypeMeta(item.type);
    return (
      <FadeIn delay={index * 40}>
        <TouchableOpacity
          style={[
            s.notifCard,
            !item.read && { borderLeftColor: meta.color, borderLeftWidth: 3.5 },
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.78}
        >
          <View style={[s.notifIconWrap, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>

          <View style={s.notifContent}>
            <View style={s.notifTopRow}>
              <Text style={s.notifTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[s.typeBadge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
                <Text style={[s.typeBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <Text style={s.notifMsg} numberOfLines={2}>{item.message}</Text>
            <View style={s.notifFooter}>
              <View style={s.timeRow}>
                <Ionicons name="time-outline" size={11} color={C.slateL} />
                <Text style={s.timeTxt}>{formatDate(item.createdAt)}</Text>
              </View>
              {!item.read ? (
                <View style={[s.newBadge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
                  <View style={[s.newDot, { backgroundColor: meta.color }]} />
                  <Text style={[s.newTxt, { color: meta.color }]}>NEW</Text>
                </View>
              ) : (
                <View style={s.readHint}>
                  <Ionicons name="eye-outline" size={11} color={C.slateL} />
                  <Text style={s.readHintTxt}>Tap to view</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </FadeIn>
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <StatusBar style="light" backgroundColor={C.ink} />
        <View style={s.container}>
          <View style={s.header}>
            <View style={s.headerBlob} />
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={C.white} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Notifications</Text>
              <Text style={s.headerSub}>Stay up to date</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={s.loadingTxt}>Loading notifications…</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />

      <NotificationModal
        visible={modalVisible}
        item={selectedNotif}
        onClose={closeModal}
        onNavigate={handleModalNavigate}
      />

      <View style={s.container}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerBlob} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <View style={s.headerTitleRow}>
              <Text style={s.headerTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={s.unreadPill}>
                  <Text style={s.unreadPillTxt}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={s.headerSub}>Stay up to date</Text>
          </View>
          <View style={s.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity style={s.headerIconBtn} onPress={handleMarkAllAsRead} activeOpacity={0.7}>
                <Ionicons name="checkmark-done-outline" size={19} color={C.teal} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.headerIconBtn, showSettings && { backgroundColor: C.tealDim, borderColor: C.tealLine }]}
              onPress={() => setShowSettings(v => !v)}
              activeOpacity={0.7}
            >
              <Ionicons name={showSettings ? 'close' : 'settings-outline'} size={19} color={showSettings ? C.teal : C.ghost} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <FadeIn delay={0}>
          <View style={s.searchWrap}>
            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={16} color={C.slateL} />
              <TextInput
                style={s.searchInput}
                placeholder="Search notifications…"
                placeholderTextColor={C.slateL}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color={C.slateL} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </FadeIn>

        {/* ── Settings panel ── */}
        {showSettings && (
          <FadeIn delay={0}>
            <View style={s.settingsCard}>
              <View style={s.settingsCardHeader}>
                <View style={s.formCardIconWrap}>
                  <Ionicons name="settings-outline" size={15} color={C.teal} />
                </View>
                <Text style={s.settingsCardTitle}>Notification Settings</Text>
              </View>
              {[
                { key: 'notificationsEnabled', icon: 'notifications-outline',     label: 'Enable Notifications',  desc: 'Receive all notifications',        alwaysOn: true },
                { key: 'reportUpdates',        icon: 'document-text-outline',     label: 'Report Updates',         desc: 'Status changes for your reports' },
                { key: 'recyclingTips',        icon: 'leaf-outline',              label: 'Recycling Tips',          desc: 'Helpful recycling advice' },
                { key: 'systemNotifications',  icon: 'information-circle-outline', label: 'System Notifications',  desc: 'App updates and announcements' },
              ].map(({ key, icon, label, desc, alwaysOn }) => (
                <View key={key} style={s.prefRow}>
                  <View style={s.prefLeft}>
                    <View style={s.prefIconWrap}>
                      <Ionicons name={icon} size={15} color={C.teal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.prefLabel}>{label}</Text>
                      <Text style={s.prefDesc}>{desc}</Text>
                    </View>
                  </View>
                  <Switch
                    value={preferences[key]}
                    onValueChange={(v) => handlePreferenceChange(key, v)}
                    disabled={!alwaysOn && !preferences.notificationsEnabled}
                    trackColor={{ false: C.border, true: C.tealLine }}
                    thumbColor={preferences[key] ? C.teal : C.slateL}
                    ios_backgroundColor={C.border}
                  />
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ── Unread banner ── */}
        {unreadCount > 0 && !showSettings && (
          <FadeIn delay={40}>
            <View style={s.unreadBanner}>
              <View style={s.unreadBannerLeft}>
                <View style={s.unreadBannerDot} />
                <Text style={s.unreadBannerTxt}>
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={handleMarkAllAsRead} activeOpacity={0.7}>
                <Text style={s.unreadBannerAction}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          </FadeIn>
        )}

        {/* ── Search result count ── */}
        {searchQuery.length > 0 && (
          <FadeIn delay={0}>
            <View style={s.searchResultBar}>
              <Ionicons name="search-outline" size={13} color={C.teal} />
              <Text style={s.searchResultTxt}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
            </View>
          </FadeIn>
        )}

        {/* ── List ── */}
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />
          }
          contentContainerStyle={[s.listContent, filtered.length === 0 && { flexGrow: 1 }]}
          ListEmptyComponent={
            <FadeIn delay={60}>
              <View style={s.emptyWrap}>
                <View style={s.emptyIconWrap}>
                  <Ionicons
                    name={searchQuery.length > 0 ? 'search-outline' : 'notifications-off-outline'}
                    size={38}
                    color={C.teal}
                  />
                </View>
                <Text style={s.emptyTitle}>
                  {searchQuery.length > 0 ? 'No results found' : 'No notifications'}
                </Text>
                <Text style={s.emptyText}>
                  {searchQuery.length > 0
                    ? 'Try adjusting your search terms.'
                    : "You're all caught up! Check back later for updates."}
                </Text>
              </View>
            </FadeIn>
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default NotificationsScreen;

// ─── Modal styles ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // Sheet takes roughly 78% of screen — feels full but not cramped
    maxHeight: SCREEN_HEIGHT * 0.78,
    minHeight: SCREEN_HEIGHT * 0.52,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginTop: 12,
    marginBottom: 4,
  },
  accentLine: {
    height: 3,
    marginHorizontal: 24,
    borderRadius: 2,
    marginBottom: 0,
  },

  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTextBlock: {
    flex: 1,
    gap: 5,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  pillTxt: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTypeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.slate,
    letterSpacing: 0.1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 12,
  },
  notifTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.navy,
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 10,
  },
  notifMessage: {
    fontSize: 15,
    color: C.slate,
    lineHeight: 24,
    marginBottom: 18,
  },

  // Chips
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 22,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: C.slateL,
  },

  // Section divider
  sectionDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 18,
  },

  // Explanation section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  explanationBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  explanationTxt: {
    fontSize: 14,
    color: C.slate,
    lineHeight: 22,
  },

  // Reference box
  refBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  refLabel: {
    fontSize: 12,
    color: C.slateL,
    fontWeight: '600',
  },
  refValue: {
    fontSize: 12,
    color: C.navy,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: C.navy,
    flex: 1,
    textAlign: 'center',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  dismissTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: C.slate,
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.offWhite },
  container: { flex: 1 },

  // Header
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDk,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.tealGlow,
    top: -80, right: -70,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: C.white, letterSpacing: -0.2 },
  headerSub: {
    fontSize: 10, color: C.teal, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadPill: {
    backgroundColor: C.teal, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center',
  },
  unreadPillTxt: { fontSize: 11, fontWeight: '900', color: C.navy },

  // Search
  searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.navy },
  searchResultBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 20, marginTop: 8, marginBottom: 4,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
  },
  searchResultTxt: { fontSize: 12, color: C.tealDark, fontWeight: '600' },

  // Settings
  settingsCard: {
    backgroundColor: C.white, borderRadius: 20,
    marginHorizontal: 20, marginTop: 12,
    padding: 20, borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  settingsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  formCardIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsCardTitle: { fontSize: 15, fontWeight: '800', color: C.navy },
  prefRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  prefIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  prefLabel: { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 2 },
  prefDesc:  { fontSize: 11, color: C.slateL },

  // Unread banner
  unreadBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  unreadBannerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadBannerDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal },
  unreadBannerTxt:    { fontSize: 12, color: C.tealDark, fontWeight: '600' },
  unreadBannerAction: { fontSize: 12, color: C.teal, fontWeight: '700', textDecorationLine: 'underline' },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  // Notification card
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  notifIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTopRow:  {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 5,
  },
  notifTitle:   { fontSize: 14, fontWeight: '800', color: C.navy, flex: 1, marginRight: 8 },
  typeBadge:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
  typeBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  notifMsg:     { fontSize: 12, color: C.slate, lineHeight: 18, marginBottom: 8 },
  notifFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeTxt:      { fontSize: 11, color: C.slateL },
  newBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  newDot:       { width: 5, height: 5, borderRadius: 3 },
  newTxt:       { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  readHint:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readHintTxt:  { fontSize: 10, color: C.slateL, fontStyle: 'italic' },

  // Empty
  emptyWrap:    { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle:   { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 8 },
  emptyText:    { fontSize: 14, color: C.slate, textAlign: 'center', lineHeight: 21 },

  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt:  { marginTop: 14, fontSize: 14, color: C.slate, fontWeight: '600' },
});