import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Dimensions, StatusBar, Modal, Animated,
  SafeAreaView, Platform, Image, BackHandler,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
  borderDk: 'rgba(255,255,255,0.09)',
  border:   '#D8E4EE',
  slate:    '#4E6B87',
  slateL:   '#8BA5BC',
  ghost:    'rgba(255,255,255,0.55)',
  green:    '#22C55E',
  red:      '#EF4444',
  amber:    '#F59E0B',
};

// ── Fade-in animation ─────────────────────────────────────────────────────────
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

// ── Small badge ───────────────────────────────────────────────────────────────
const Badge = ({ label }) => (
  <View style={s.badge}>
    <View style={s.badgeDot} />
    <Text style={s.badgeText}>{label}</Text>
  </View>
);

const UserDashboard = () => {
  const dispatch   = useDispatch();
  const navigation = useNavigation();
  const route      = useRoute();
  const { user }   = useSelector((st) => st.auth);
  const { unreadCount }    = useSelector((st) => st.notification);
  const { conversations }  = useSelector((st) => st.message);

  const [activeTab,          setActiveTab]          = useState('Home');
  const [sidebarVisible,     setSidebarVisible]     = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [navigationStack,    setNavigationStack]    = useState(['UserDashboard']);

  const sidebarAnim = useRef(new Animated.Value(-width * 0.78)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const fadeAnim    = useRef(new Animated.Value(1)).current;

  const unreadMessages = conversations?.filter((c) => c.unread).length || 0;

  // ── Focus sync ───────────────────────────────────────────────────────────────
  useFocusEffect(
    React.useCallback(() => {
      const map = {
        UserDashboard: 'Home', EditProfile: 'EditProfile',
        FeedbackSupport: 'FeedbackSupport', WasteDetection: 'WasteDetection',
        ReportWaste: 'ReportWaste', ReportStatus: 'ReportStatus',
        DetectionHistory: 'DetectionHistory', DisposalGuidance: 'DisposalGuidance',
        EducationalSection: 'Learning', Notifications: 'Notifications',
        Maps: 'Maps', MessageList: 'Messages', ChatScreen: 'Messages',
      };
      if (map[route.name]) setActiveTab(map[route.name]);
      setNavigationStack((prev) => {
        const next = [...prev];
        if (next[next.length - 1] !== route.name) {
          next.push(route.name);
          if (next.length > 5) next.shift();
        }
        return next;
      });
    }, [route.name, user])
  );

  // ── Back handler ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarVisible)     { toggleSidebar(); return true; }
      if (logoutModalVisible) { setLogoutModalVisible(false); return true; }
      if (navigationStack.length > 1) {
        navigation.navigate(navigationStack[navigationStack.length - 2]);
        setNavigationStack((p) => p.slice(0, -1));
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [sidebarVisible, logoutModalVisible, navigationStack]);

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  const toggleSidebar = () => {
    if (sidebarVisible) {
      Animated.parallel([
        Animated.timing(sidebarAnim, { toValue: -width * 0.78, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim,   { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => setSidebarVisible(false));
    } else {
      setSidebarVisible(true);
      Animated.parallel([
        Animated.timing(sidebarAnim, { toValue: 0,    duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1,    duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim,   { toValue: 0.95, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  };

  const showLogoutConfirmation = () => {
    if (sidebarVisible) {
      Animated.parallel([
        Animated.timing(sidebarAnim, { toValue: -width * 0.78, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => { setSidebarVisible(false); setLogoutModalVisible(true); });
    } else {
      setLogoutModalVisible(true);
    }
  };

  const handleLogout = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setLogoutModalVisible(false);
      dispatch(logoutUser());
      navigation.navigate('Login');
    });
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navigateTo = (screen) => {
    setActiveTab(screen);
    if (sidebarVisible) toggleSidebar();
    setTimeout(() => {
      const map = {
        EditProfile:       'EditProfile',
        FeedbackSupport:   'FeedbackSupport',
        WasteDetection:    'WasteClassifier',
        ReportHistory:     'ReportHistory',
        DisposalGuidance:  'DisposalGuidance',
        EducationalSection:'Learning',
        Notifications:     'NotificationsScreen',
        Maps:              'Maps',
        Messages:          'MessageList',
        WasteAnalytics:    'WasteAnalytics',
        Learning:          'Learning',
      };
      if (map[screen]) { navigation.navigate(map[screen]); return; }
      if (screen === 'Home' && route.name !== 'UserDashboard') navigation.navigate('UserDashboard');
    }, 300);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getProfilePicture = () => {
    if (!user?.profile) return null;
    if (typeof user.profile === 'string') return { uri: user.profile };
    if (user.profile.url)  return { uri: user.profile.url };
    if (user.profile.uri)  return { uri: user.profile.uri };
    return null;
  };
  const getDisplayName = () => user?.username || user?.name || 'T.M.F.K User';
  const getDisplayRole = () => user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';

  // ── About features data ───────────────────────────────────────────────────────
  const FEATURES = [
    { icon: 'scan-outline',         title: 'AI Waste Classification',  desc: 'Snap a photo and our ML model instantly identifies and categorises your waste with industry-leading accuracy.' },
    { icon: 'bar-chart-outline',    title: 'Live Analytics',           desc: 'Real-time dashboards that turn your waste data into actionable sustainability insights and progress tracking.' },
    { icon: 'map-outline',          title: 'Recycling Map',            desc: 'Find certified recycling centres and drop-off points near you with our integrated facility locator.' },
    { icon: 'document-text-outline',title: 'Waste Reporting',          desc: 'Report illegal dumping or waste issues in your community with photo evidence and GPS tagging.' },
    { icon: 'school-outline',       title: 'Educational Resources',    desc: 'Learn proper disposal techniques, eco-friendly habits, and earn eco points as you grow your knowledge.' },
    { icon: 'chatbubbles-outline',  title: 'Community & Support',      desc: 'Connect with environmental advocates, share feedback, and get real-time support from our team.' },
  ];

  const STATS = [
    { value: '85%',  label: 'Classification\nAccuracy' },
    { value: '50', label: 'Waste Items\nClassified' },
    { value: '3', label: 'Recycling\nPartners' },
    { value: '50',  label: 'Active\nUsers' },
  ];

  // ── Render home (about) ───────────────────────────────────────────────────────
  const renderHome = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={s.heroWrap}>
        <View style={s.heroBlob1} />
        <View style={s.heroBlob2} />

        {/* Profile strip */}
        <FadeIn delay={0}>
          <View style={s.profileStrip}>
            <View style={s.profileAvatar}>
              {getProfilePicture() ? (
                <Image source={getProfilePicture()} style={s.profileAvatarImg} />
              ) : (
                <Text style={s.profileAvatarLetter}>{getDisplayName().charAt(0).toUpperCase()}</Text>
              )}
              <View style={s.onlineDot} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.profileHello}>Welcome back,</Text>
              <Text style={s.profileName}>{getDisplayName()}</Text>
            </View>
            <View style={s.rolePill}>
              <Text style={s.rolePillTxt}>{getDisplayRole()}</Text>
            </View>
          </View>
        </FadeIn>

        {/* Stats row */}
        <FadeIn delay={80}>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{user?.detectionsCount || '0'}</Text>
              <Text style={s.statLbl}>Detections</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statNum}>{user?.reportsCount || '0'}</Text>
              <Text style={s.statLbl}>Reports</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statNum}>{user?.ecoPoints || '0'}</Text>
              <Text style={s.statLbl}>Eco Points</Text>
            </View>
          </View>
        </FadeIn>
      </View>

      {/* ── About section ── */}
      <View style={s.aboutSection}>

        {/* Mission */}
        <FadeIn delay={0}>
          <Badge label="Our Mission" />
          <Text style={s.aboutTitle}>Building Cleaner{'\n'}Communities Together</Text>
          <Text style={s.aboutBody}>
            SolidWaste is T.M.F.K. Waste Innovations' flagship platform — leveraging
            cutting-edge artificial intelligence to transform how individuals and
            organisations manage, classify, and report waste across the Philippines.
          </Text>
        </FadeIn>

        {/* Impact numbers */}
        <FadeIn delay={80}>
          <View style={s.impactGrid}>
            {STATS.map((st) => (
              <View key={st.label} style={s.impactCard}>
                <Text style={s.impactNum}>{st.value}</Text>
                <Text style={s.impactLbl}>{st.label}</Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* Vision */}
        <FadeIn delay={120}>
          <View style={s.visionCard}>
            <View style={s.visionIconWrap}>
              <Ionicons name="eye-outline" size={22} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.visionTitle}>Our Vision</Text>
              <Text style={s.visionBody}>
                To become the national standard for intelligent waste management — where
                every piece of waste is properly classified, tracked, and recycled,
                driving a circular economy for a sustainable Philippines.
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* Divider label */}
        <FadeIn delay={140}>
          <View style={s.scrollHint}>
            <View style={s.scrollHintLine} />
            <Text style={s.scrollHintTxt}>Platform Features</Text>
            <View style={s.scrollHintLine} />
          </View>
        </FadeIn>

        {/* Feature cards */}
        {FEATURES.map((f, i) => (
          <FadeIn key={f.title} delay={i * 60}>
            <View style={s.featureCard}>
              <View style={s.featureIconRing}>
                <Ionicons name={f.icon} size={22} color={C.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          </FadeIn>
        ))}

        {/* CTA */}
        <FadeIn delay={400}>
          <View style={s.ctaCard}>
            <View style={s.ctaBlob} />
            <Text style={s.ctaEyebrow}>Get started</Text>
            <Text style={s.ctaTitle}>Use the menu to explore all features →</Text>
            <Text style={s.ctaSub}>
              Tap the ☰ icon at the top left to open navigation and access
              Waste Detection, Reports, Maps, and more.
            </Text>
          </View>
        </FadeIn>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );

  // ── Render settings ───────────────────────────────────────────────────────────
  const renderSettings = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.aboutSection}>
        <FadeIn>
          <Badge label="Account" />
          <Text style={s.aboutTitle}>Settings</Text>
        </FadeIn>

        <FadeIn delay={60}>
          <View style={s.settingsGroup}>
            {[
              { icon: 'person-outline',      label: 'Edit Profile',    sub: 'Update your personal information', screen: 'EditProfile',    color: C.teal },
              { icon: 'chatbubbles-outline',  label: 'Messages',        sub: unreadMessages > 0 ? `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}` : 'Manage your conversations', screen: 'Messages', color: '#A855F7', badge: unreadMessages },
              { icon: 'notifications-outline',label: 'Notifications',   sub: unreadCount > 0 ? `${unreadCount} unread` : 'Manage notification preferences', screen: 'Notifications', color: C.amber, badge: unreadCount },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[s.settingsItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigateTo(item.screen)}
                activeOpacity={0.75}
              >
                <View style={[s.settingsIconBox, { backgroundColor: item.color + '22' }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingsLabel}>{item.label}</Text>
                  <Text style={s.settingsSub}>{item.sub}</Text>
                </View>
                {item.badge > 0 && (
                  <View style={s.settingsBadge}>
                    <Text style={s.settingsBadgeTxt}>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={C.slateL} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={120}>
          <View style={[s.settingsGroup, { marginTop: 20 }]}>
            <Text style={s.settingsGroupTitle}>Account Information</Text>
            {[
              { label: 'Email',        value: user?.email || 'Not set' },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
              { label: 'Last Login',   value: user?.lastLogin  ? new Date(user.lastLogin).toLocaleDateString()  : 'N/A' },
            ].map((row) => (
              <View key={row.label} style={s.infoRow}>
                <Text style={s.infoLabel}>{row.label}</Text>
                <Text style={s.infoValue}>{row.value}</Text>
              </View>
            ))}
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Status</Text>
              <View style={[s.statusPill, { backgroundColor: user?.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                <Text style={[s.statusPillTxt, { color: user?.status === 'active' ? C.green : C.red }]}>
                  {user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
                </Text>
              </View>
            </View>
          </View>
        </FadeIn>
        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    if (activeTab === 'Settings') return renderSettings();
    return renderHome();
  };

  // ── Sidebar menu items ────────────────────────────────────────────────────────
  const SIDEBAR_SECTIONS = [
    {
      title: null,
      items: [{ icon: 'home-outline', label: 'Home Dashboard', screen: 'Home' }],
    },
    {
      title: 'Waste Management',
      items: [
        { icon: 'scan-outline',        label: 'Waste Detection',  screen: 'WasteDetection'  },
        { icon: 'list-outline',        label: 'Report History',   screen: 'ReportHistory'   },
        { icon: 'bar-chart-outline',   label: 'Waste Analytics',  screen: 'WasteAnalytics'  },
      ],
    },
    {
      title: 'Communication',
      items: [
        { icon: 'chatbubbles-outline',  label: 'Messages',          screen: 'Messages',      badge: unreadMessages },
        { icon: 'notifications-outline',label: 'Notifications',     screen: 'Notifications', badge: unreadCount    },
        { icon: 'megaphone-outline',    label: 'Feedback & Support',screen: 'FeedbackSupport' },
      ],
    },
    {
      title: 'Facilities & Guidance',
      items: [
        { icon: 'map-outline',    label: 'Recycling Map',         screen: 'Maps'              },
        { icon: 'school-outline', label: 'Educational Resources', screen: 'Learning' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'person-outline',  label: 'Edit Profile', screen: 'EditProfile' },
        { icon: 'settings-outline',label: 'Settings',     screen: 'Settings'    },
      ],
    },
  ];

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerBlob} />
        <TouchableOpacity style={s.menuBtn} onPress={toggleSidebar} activeOpacity={0.7}>
          <Ionicons name="menu-outline" size={26} color={C.white} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerBrand}>T.M.F.K</Text>
          <Text style={s.headerSub}>{activeTab === 'Home' ? 'Waste Innovations' : activeTab}</Text>
        </View>

        <TouchableOpacity style={s.headerIconBtn} onPress={() => navigateTo('Notifications')} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color={C.white} />
          {unreadCount > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeTxt}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Main content ── */}
      <Animated.View style={[{ flex: 1 }, { transform: [{ scale: scaleAnim }] }]}>
        {renderContent()}
      </Animated.View>

      {/* ── Sidebar ── */}
      {sidebarVisible && (
        <>
          <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={toggleSidebar} activeOpacity={1} />
          </Animated.View>

          <Animated.View style={[s.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
            {/* Sidebar blobs */}
            <View style={s.sidebarBlob1} />
            <View style={s.sidebarBlob2} />

            {/* User info */}
            <View style={s.sidebarUser}>
              <View style={s.sidebarAvatar}>
                {getProfilePicture() ? (
                  <Image source={getProfilePicture()} style={s.sidebarAvatarImg} />
                ) : (
                  <Text style={s.sidebarAvatarLetter}>{getDisplayName().charAt(0).toUpperCase()}</Text>
                )}
                <View style={s.sidebarOnlineDot} />
              </View>
              <Text style={s.sidebarName}>{getDisplayName()}</Text>
              <Text style={s.sidebarEmail}>{user?.email || ''}</Text>
              <View style={s.sidebarRolePill}>
                <Text style={s.sidebarRoleTxt}>{getDisplayRole()}</Text>
              </View>
            </View>

            <ScrollView style={s.sidebarMenu} showsVerticalScrollIndicator={false}>
              {SIDEBAR_SECTIONS.map((sec) => (
                <View key={sec.title || 'main'}>
                  {sec.title && <Text style={s.sidebarSection}>{sec.title}</Text>}
                  {sec.items.map((item) => {
                    const active = activeTab === item.screen || activeTab === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[s.sidebarItem, active && s.sidebarItemActive]}
                        onPress={() => navigateTo(item.screen)}
                        activeOpacity={0.75}
                      >
                        <View style={[s.sidebarItemIcon, active && s.sidebarItemIconActive]}>
                          <Ionicons name={item.icon} size={20} color={active ? C.teal : C.ghost} />
                        </View>
                        <Text style={[s.sidebarItemTxt, active && s.sidebarItemTxtActive]}>{item.label}</Text>
                        {item.badge > 0 && (
                          <View style={s.sidebarBadge}>
                            <Text style={s.sidebarBadgeTxt}>{item.badge > 99 ? '99+' : item.badge}</Text>
                          </View>
                        )}
                        {active && <View style={s.sidebarActiveBar} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Logout */}
              <TouchableOpacity style={s.sidebarLogout} onPress={showLogoutConfirmation} activeOpacity={0.75}>
                <Ionicons name="log-out-outline" size={20} color={C.red} />
                <Text style={s.sidebarLogoutTxt}>Logout</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* ── Logout modal ── */}
      <Modal animationType="fade" transparent visible={logoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View style={s.modalOverlay}>
          <Animated.View style={[s.modalCard, { opacity: fadeAnim }]}>
            <View style={s.modalIconRing}>
              <Ionicons name="log-out-outline" size={28} color={C.teal} />
            </View>
            <Text style={s.modalTitle}>Confirm Logout</Text>
            <Text style={s.modalMsg}>Are you sure you want to logout? Your progress will be saved.</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setLogoutModalVisible(false)} activeOpacity={0.8}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalLogout} onPress={handleLogout} activeOpacity={0.8}>
                <Text style={s.modalLogoutTxt}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default UserDashboard;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.offWhite },
  content: { flex: 1, backgroundColor: C.offWhite },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 14,
    paddingBottom: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.borderDk,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.tealGlow, top: -80, right: -60,
  },
  menuBtn: { padding: 4, marginRight: 12 },
  headerCenter: { flex: 1 },
  headerBrand: { fontSize: 16, fontWeight: '900', color: C.white, letterSpacing: 1.5 },
  headerSub:   { fontSize: 10, color: C.teal, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  headerIconBtn: { padding: 6, position: 'relative' },
  headerBadge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: C.red, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeTxt: { fontSize: 9, color: C.white, fontWeight: '800' },

  // ── Hero wrap ────────────────────────────────────────────────────────────────
  heroWrap: {
    backgroundColor: C.ink, paddingHorizontal: 20,
    paddingTop: 24, paddingBottom: 32, overflow: 'hidden', position: 'relative',
  },
  heroBlob1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: C.tealGlow, top: -100, right: -100,
  },
  heroBlob2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(0,201,167,0.06)', bottom: -60, left: -40,
  },

  profileStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  profileAvatarImg:    { width: 52, height: 52, borderRadius: 16 },
  profileAvatarLetter: { fontSize: 22, fontWeight: '900', color: C.teal },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.ink,
  },
  profileHello: { fontSize: 11, color: C.ghost, fontWeight: '500' },
  profileName:  { fontSize: 17, fontWeight: '900', color: C.white, letterSpacing: -0.2 },
  rolePill: {
    backgroundColor: C.tealDim, borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.tealLine,
  },
  rolePillTxt: { fontSize: 11, color: C.teal, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: C.borderDk,
    borderRadius: 16, padding: 16,
  },
  statBox:    { flex: 1, alignItems: 'center' },
  statNum:    { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: -0.5 },
  statLbl:    { fontSize: 10, color: C.slateL, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  statDivider:{ width: 1, height: 36, backgroundColor: C.borderDk },

  // ── About section ────────────────────────────────────────────────────────────
  aboutSection: { paddingHorizontal: 20, paddingTop: 28 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.tealDim, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 12,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  badgeText: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 1, textTransform: 'uppercase' },

  aboutTitle: {
    fontSize: 28, fontWeight: '900', color: C.navy,
    letterSpacing: -0.6, lineHeight: 36, marginBottom: 14,
  },
  aboutBody: { fontSize: 14, color: C.slate, lineHeight: 22, marginBottom: 28 },

  impactGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24,
  },
  impactCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: C.navy, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: 'rgba(10,37,64,0.12)', alignItems: 'center',
  },
  impactNum: { fontSize: 26, fontWeight: '900', color: C.teal, letterSpacing: -0.5 },
  impactLbl: { fontSize: 11, color: C.slateL, textAlign: 'center', marginTop: 4, lineHeight: 16 },

  visionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: C.white, borderRadius: 18, padding: 20, marginBottom: 28,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.08)', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 2,
  },
  visionIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  visionTitle: { fontSize: 15, fontWeight: '700', color: C.navy, marginBottom: 6 },
  visionBody:  { fontSize: 13, color: C.slate, lineHeight: 20 },

  scrollHint: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 24,
  },
  scrollHintLine: { flex: 1, height: 1, backgroundColor: C.border },
  scrollHintTxt:  { fontSize: 11, color: C.slateL, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },

  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.06)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 1,
  },
  featureIconRing: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: C.navy, marginBottom: 4 },
  featureDesc:  { fontSize: 13, color: C.slate, lineHeight: 19 },

  ctaCard: {
    backgroundColor: C.navy, borderRadius: 20, padding: 26,
    marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.navyMid,
  },
  ctaBlob: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.tealGlow, top: -60, right: -60,
  },
  ctaEyebrow: { fontSize: 10, color: C.teal, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  ctaTitle:   { fontSize: 18, fontWeight: '900', color: C.white, lineHeight: 26, marginBottom: 10 },
  ctaSub:     { fontSize: 13, color: C.ghost, lineHeight: 20 },

  // ── Settings ─────────────────────────────────────────────────────────────────
  settingsGroup: {
    backgroundColor: C.white, borderRadius: 18, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.06)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 1, overflow: 'hidden',
  },
  settingsGroupTitle: {
    fontSize: 11, fontWeight: '700', color: C.slateL,
    letterSpacing: 0.8, textTransform: 'uppercase',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8,
  },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  settingsIconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsLabel: { fontSize: 15, fontWeight: '600', color: C.navy, marginBottom: 2 },
  settingsSub:   { fontSize: 12, color: C.slate },
  settingsBadge: {
    backgroundColor: C.red, borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 7, marginRight: 4,
  },
  settingsBadgeTxt: { fontSize: 11, color: C.white, fontWeight: '800' },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  infoLabel: { fontSize: 13, color: C.slate },
  infoValue: { fontSize: 13, color: C.navy, fontWeight: '600' },
  statusPill: { borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 },
  statusPillTxt: { fontSize: 12, fontWeight: '700' },

  // ── Sidebar ──────────────────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10,
  },
  sidebar: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: width * 0.78, backgroundColor: C.ink,
    zIndex: 20, overflow: 'hidden',
    borderRightWidth: 1, borderRightColor: C.borderDk,
  },
  sidebarBlob1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.tealGlow, top: -80, right: -80,
  },
  sidebarBlob2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(0,201,167,0.05)', bottom: 100, left: -60,
  },
  sidebarUser: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 24, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: C.borderDk,
  },
  sidebarAvatar: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: C.navyMid, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, position: 'relative',
  },
  sidebarAvatarImg:    { width: 64, height: 64, borderRadius: 18 },
  sidebarAvatarLetter: { fontSize: 26, fontWeight: '900', color: C.teal },
  sidebarOnlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.green, borderWidth: 2, borderColor: C.ink,
  },
  sidebarName:  { fontSize: 17, fontWeight: '900', color: C.white, marginBottom: 3 },
  sidebarEmail: { fontSize: 12, color: C.ghost, marginBottom: 10 },
  sidebarRolePill: {
    alignSelf: 'flex-start', backgroundColor: C.tealDim,
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.tealLine,
  },
  sidebarRoleTxt: { fontSize: 10, color: C.teal, fontWeight: '700', letterSpacing: 0.6 },

  sidebarMenu:    { flex: 1, paddingTop: 8 },
  sidebarSection: {
    fontSize: 9, fontWeight: '800', color: C.slateL,
    letterSpacing: 1.2, textTransform: 'uppercase',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },
  sidebarItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingVertical: 13, position: 'relative',
  },
  sidebarItemActive: { backgroundColor: C.tealDim },
  sidebarItemIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  sidebarItemIconActive: { backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine },
  sidebarItemTxt:       { flex: 1, fontSize: 14, color: C.ghost, fontWeight: '500' },
  sidebarItemTxtActive: { color: C.teal, fontWeight: '700' },
  sidebarBadge: {
    backgroundColor: C.red, borderRadius: 10,
    paddingVertical: 2, paddingHorizontal: 7,
  },
  sidebarBadgeTxt:  { fontSize: 10, color: C.white, fontWeight: '800' },
  sidebarActiveBar: {
    position: 'absolute', right: 0, top: 8, bottom: 8,
    width: 3, borderRadius: 2, backgroundColor: C.teal,
  },
  sidebarLogout: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingVertical: 16, marginTop: 8,
    borderTopWidth: 1, borderTopColor: C.borderDk,
  },
  sidebarLogoutTxt: { fontSize: 14, color: C.red, fontWeight: '600' },

  // ── Logout modal ─────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    backgroundColor: C.navy, borderRadius: 22, padding: 28,
    width: '100%', maxWidth: 360,
    borderWidth: 1, borderColor: C.borderDk, alignItems: 'center',
  },
  modalIconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle:  { fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 8 },
  modalMsg:    { fontSize: 13, color: C.ghost, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  modalBtns:   { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCancelTxt: { color: C.ghost, fontSize: 14, fontWeight: '600' },
  modalLogout: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalLogoutTxt: { color: C.red, fontSize: 14, fontWeight: '800' },
});