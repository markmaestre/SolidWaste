import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  Modal,
  Animated,
  SafeAreaView,
  Platform,
  Image,
  BackHandler,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { styles } from '../../components/Styles/UserDashboard';

const { width, height } = Dimensions.get('window');

const UserDashboard = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useSelector((state) => state.auth);
  const { unreadCount } = useSelector((state) => state.notification);
  const { conversations } = useSelector((state) => state.message); // IDINAGDAG - message state
  const [activeTab, setActiveTab] = useState('Home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  
  // Fixed animation references with useRef
  const sidebarAnimation = useRef(new Animated.Value(-width * 0.75)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Calculate unread messages count - IDINAGDAG
  const unreadMessagesCount = conversations?.filter(conv => conv.unread).length || 0;

  // Sync activeTab with current screen when component focuses
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 UserDashboard focused - current user profile:', user?.profile);
      
      // Get current route name and map it to activeTab
      const currentRoute = route.name;
      const routeToTabMap = {
        'UserDashboard': 'Home',
        'EditProfile': 'EditProfile',
        'FeedbackSupport': 'FeedbackSupport',
        'WasteDetection': 'WasteDetection',
        'ReportWaste': 'ReportWaste',
        'ReportStatus': 'ReportStatus',
        'DetectionHistory': 'DetectionHistory',
        'DisposalGuidance': 'DisposalGuidance',
        'EducationalSection': 'EducationalSection',
        'Notifications': 'Notifications',
        'Maps': 'Maps',
        'MessageList': 'Messages', // IDINAGDAG
        'ChatScreen': 'Messages', // IDINAGDAG
      };
      
      if (routeToTabMap[currentRoute]) {
        setActiveTab(routeToTabMap[currentRoute]);
      }
      
      return () => {
        // Cleanup if needed
      };
    }, [route.name, user])
  );

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarVisible) {
        toggleSidebar();
        return true; // Prevent default behavior
      }
      
      if (logoutModalVisible) {
        setLogoutModalVisible(false);
        return true; // Prevent default behavior
      }
      
      // Show exit confirmation instead of logging out
      if (activeTab === 'Home') {
        showExitConfirmation();
        return true; // Prevent default behavior
      } else {
        // If not on home tab, go back to home
        setActiveTab('Home');
        return true; // Prevent default behavior
      }
    });

    return () => backHandler.remove();
  }, [sidebarVisible, logoutModalVisible, activeTab]);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    let pulseLoop;
    
    // Pulse animation for stats cards
    pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      if (pulseLoop) {
        pulseLoop.stop();
      }
    };
  }, [pulseAnimation]);

  const toggleSidebar = () => {
    if (sidebarVisible) {
      // Close sidebar
      Animated.parallel([
        Animated.timing(sidebarAnimation, {
          toValue: -width * 0.75,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(overlayAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => setSidebarVisible(false));
    } else {
      // Open sidebar
      setSidebarVisible(true);
      Animated.parallel([
        Animated.timing(sidebarAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(overlayAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnimation, {
          toValue: 0.95,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    }
  };

  const handleLogout = () => {
    Animated.timing(fadeAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setLogoutModalVisible(false);
      dispatch(logoutUser());
      navigation.navigate('Login');
    });
  };

  const showLogoutConfirmation = () => {
    if (sidebarVisible) {
      Animated.parallel([
        Animated.timing(sidebarAnimation, {
          toValue: -width * 0.75,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(overlayAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => {
        setSidebarVisible(false);
        setLogoutModalVisible(true);
      });
    } else {
      setLogoutModalVisible(true);
    }
  };

  // New function to show exit confirmation instead of logout
  const showExitConfirmation = () => {
    Alert.alert(
      'Exit WasteWise?',
      'Are you sure you want to exit the app?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => BackHandler.exitApp(),
        },
      ],
      { cancelable: true }
    );
  };

  const navigateTo = (screen) => {
    setActiveTab(screen);
    // Add haptic feedback simulation
    Animated.sequence([
      Animated.timing(scaleAnimation, { toValue: 0.98, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnimation, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
    
    // Close sidebar first
    if (sidebarVisible) {
      toggleSidebar();
    }

    // Handle navigation based on screen
    setTimeout(() => {
      switch (screen) {
        case 'EditProfile':
          navigation.navigate('EditProfile');
          break;
        case 'FeedbackSupport':
          navigation.navigate('FeedbackSupport');
          break;
        case 'WasteDetection':
          navigation.navigate('WasteDetection');
          break;
        case 'ReportWaste':
          navigation.navigate('ReportWaste');
          break;
        case 'ReportStatus':
          navigation.navigate('ReportStatus');
          break;
        case 'DetectionHistory':
          navigation.navigate('DetectionHistory');
          break;
        case 'DisposalGuidance':
          navigation.navigate('DisposalGuidance');
          break;
        case 'EducationalSection':
          navigation.navigate('EducationalSection');
          break;
        case 'Notifications':
          navigation.navigate('NotificationsScreen');
          break;
        case 'Maps':
          navigation.navigate('Maps');
          break;
        case 'Messages': // IDINAGDAG
          navigation.navigate('MessageList');
          break;
        case 'Settings':
          // Settings is handled in renderContent - stay on dashboard but show settings
          break;
        case 'Home':
          // If already on home, no navigation needed
          if (route.name !== 'UserDashboard') {
            navigation.navigate('UserDashboard');
          }
          break;
        default:
          // For any undefined screens, navigate directly
          if (screen !== 'Home' && screen !== 'Settings') {
            navigation.navigate(screen);
          }
      }
    }, 300);
  };

  // Get user's profile picture or use default - UPDATED to handle both string and object formats
  const getProfilePicture = () => {
    console.log('📸 Current user profile data:', user?.profile);
    
    if (user?.profile) {
      // Handle both string URL and object format
      if (typeof user.profile === 'string') {
        return { uri: user.profile };
      } else if (user.profile.url) {
        return { uri: user.profile.url };
      } else if (user.profile.uri) {
        return { uri: user.profile.uri };
      }
    }
    
    // Return null if no profile picture
    return null;
  };

  // Get user's display name
  const getDisplayName = () => {
    return user?.username || user?.name || 'WasteWise User';
  };

  // Get user's role with proper capitalization
  const getDisplayRole = () => {
    return user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
  };

  const QuickActionCard = ({ icon, title, count, countColor, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.quickActionCard, { borderColor: color }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={styles.quickActionGradient}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
          <Icon name={icon} size={24} color="#FFFFFF" />
        </View>
        <Text style={[styles.quickActionCount, countColor && { color: countColor }]}>{count}</Text>
        <Text style={styles.quickActionTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // COMPLETELY REMOVED the placeholder default case
  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back, {getDisplayName()}!</Text>
              <Text style={styles.welcomeSubtext}>Ready to make a difference today?</Text>
              
              {/* User Status Card */}
              <View style={styles.statusCard}>
                <LinearGradient
                  colors={['#1976D2', '#42A5F5']}
                  style={styles.statusGradient}
                >
                  <View style={styles.statusHeader}>
                    <View style={styles.profileImageContainer}>
                      {getProfilePicture() ? (
                        <Image 
                          source={getProfilePicture()} 
                          style={styles.profileImageSmall}
                          onError={(error) => console.log('❌ Image loading error:', error.nativeEvent.error)}
                        />
                      ) : (
                        <View style={styles.profilePlaceholderSmall}>
                          <Icon name="person" size={20} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.statusInfo}>
                      <Text style={styles.statusName}>{getDisplayName()}</Text>
                      <Text style={styles.statusRole}>{getDisplayRole()}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {user?.detectionsCount || '0'}
                      </Text>
                      <Text style={styles.statLabel}>Detections</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {user?.reportsCount || '0'}
                      </Text>
                      <Text style={styles.statLabel}>Reports</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {user?.ecoPoints || '0'}
                      </Text>
                      <Text style={styles.statLabel}>Points</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <QuickActionCard
                  icon="camera-alt"
                  title="Waste Detection"
                  count={`${user?.pendingDetections || '0'} new`}
                  color="#4CAF50"
                  onPress={() => navigateTo('WasteDetection')}
                />
                <QuickActionCard
                  icon="report"
                  title="Report Waste"
                  count="Submit Now"
                  color="#2196F3"
                  onPress={() => navigateTo('ReportWaste')}
                />
                <QuickActionCard
                  icon="history"
                  title="Detection History"
                  count={`${user?.totalDetections || '0'} items`}
                  color="#FF9800"
                  onPress={() => navigateTo('DetectionHistory')}
                />
                {/* IDINAGDAG - Messages Quick Action */}
                <QuickActionCard
                  icon="chat"
                  title="Messages"
                  count={`${unreadMessagesCount || '0'} unread`}
                  countColor={unreadMessagesCount > 0 ? "#FF5252" : "#666"}
                  color="#9C27B0"
                  onPress={() => navigateTo('Messages')}
                />
                <QuickActionCard
                  icon="notifications"
                  title="Notifications"
                  count={`${unreadCount || '0'} unread`}
                  color="#FF9800"
                  onPress={() => navigateTo('Notifications')}
                />
                <QuickActionCard
                  icon="map"
                  title="Recycling Map"
                  count="Find Centers"
                  color="#009688"
                  onPress={() => navigateTo('Maps')}
                />
                <QuickActionCard
                  icon="feedback"
                  title="Feedback"
                  count="Share Ideas"
                  color="#FF5722"
                  onPress={() => navigateTo('FeedbackSupport')}
                />
                {/* Additional Action Card for Educational Resources */}
                <QuickActionCard
                  icon="school"
                  title="Learn & Earn"
                  count="Eco Tips"
                  color="#607D8B"
                  onPress={() => navigateTo('EducationalSection')}
                />
              </View>
            </View>

            {/* Recent Activity Section - IDINAGDAG */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activityContainer}>
                <View style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: '#4CAF50' }]}>
                    <Icon name="camera-alt" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>Waste Detection Ready</Text>
                    <Text style={styles.activityTime}>Just now</Text>
                  </View>
                </View>
                
                <View style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: '#2196F3' }]}>
                    <Icon name="chat" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {unreadMessagesCount > 0 
                        ? `${unreadMessagesCount} unread message${unreadMessagesCount > 1 ? 's' : ''}`
                        : 'No new messages'
                      }
                    </Text>
                    <Text style={styles.activityTime}>
                      {unreadMessagesCount > 0 ? 'Tap to view' : 'All caught up'}
                    </Text>
                  </View>
                  {unreadMessagesCount > 0 && (
                    <TouchableOpacity onPress={() => navigateTo('Messages')}>
                      <Icon name="chevron-right" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: '#FF9800' }]}>
                    <Icon name="notifications" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      {unreadCount > 0 
                        ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''}`
                        : 'No new notifications'
                      }
                    </Text>
                    <Text style={styles.activityTime}>
                      {unreadCount > 0 ? 'Tap to view' : 'All caught up'}
                    </Text>
                  </View>
                  {unreadCount > 0 && (
                    <TouchableOpacity onPress={() => navigateTo('Notifications')}>
                      <Icon name="chevron-right" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>    
          </ScrollView>
        );
        
      case 'Settings':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity 
                style={styles.settingsItem} 
                activeOpacity={0.7}
                onPress={() => navigateTo('EditProfile')}
              >
                <View style={styles.settingsIconContainer}>
                  <Icon name="person" size={24} color="#1976D2" />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsText}>Edit Profile</Text>
                  <Text style={styles.settingsSubtext}>Update your personal information and photo</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>

              {/* IDINAGDAG - Messages Settings Item */}
              <TouchableOpacity 
                style={styles.settingsItem} 
                activeOpacity={0.7}
                onPress={() => navigateTo('Messages')}
              >
                <View style={styles.settingsIconContainer}>
                  <Icon name="chat" size={24} color="#9C27B0" />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsText}>Messages</Text>
                  <Text style={styles.settingsSubtext}>
                    {unreadMessagesCount > 0 
                      ? `${unreadMessagesCount} unread message${unreadMessagesCount > 1 ? 's' : ''}`
                      : 'Manage your conversations'
                    }
                  </Text>
                </View>
                {unreadMessagesCount > 0 && (
                  <View style={styles.settingsBadge}>
                    <Text style={styles.settingsBadgeText}>{unreadMessagesCount}</Text>
                  </View>
                )}
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingsItem} 
                activeOpacity={0.7}
                onPress={() => navigateTo('Notifications')}
              >
                <View style={styles.settingsIconContainer}>
                  <Icon name="notifications" size={24} color="#FF9800" />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsText}>Notifications</Text>
                  <Text style={styles.settingsSubtext}>
                    {unreadCount > 0 
                      ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                      : 'Manage your notification preferences'
                    }
                  </Text>
                </View>
                {unreadCount > 0 && (
                  <View style={styles.settingsBadge}>
                    <Text style={styles.settingsBadgeText}>{unreadCount}</Text>
                  </View>
                )}
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.settingsGroupTitle}>Account Information</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || 'Not set'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Last Login</Text>
                <Text style={styles.infoValue}>
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: user?.status === 'active' ? '#4CAF50' : '#F44336' }
                ]}>
                  <Text style={styles.statusText}>
                    {user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : 'Active'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        );
        
      // REMOVED the default case completely - now it will fall through to Home
      default:
        // If we somehow get an unknown tab, default to Home
        return renderContentForHome();
    }
  };

  // Helper function to render home content (to avoid duplication)
  const renderContentForHome = () => {
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, {getDisplayName()}!</Text>
          <Text style={styles.welcomeSubtext}>Ready to make a difference today?</Text>
          
          {/* User Status Card */}
          <View style={styles.statusCard}>
            <LinearGradient
              colors={['#1976D2', '#42A5F5']}
              style={styles.statusGradient}
            >
              <View style={styles.statusHeader}>
                <View style={styles.profileImageContainer}>
                  {getProfilePicture() ? (
                    <Image 
                      source={getProfilePicture()} 
                      style={styles.profileImageSmall}
                      onError={(error) => console.log('❌ Image loading error:', error.nativeEvent.error)}
                    />
                  ) : (
                    <View style={styles.profilePlaceholderSmall}>
                      <Icon name="person" size={20} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusName}>{getDisplayName()}</Text>
                  <Text style={styles.statusRole}>{getDisplayRole()}</Text>
                </View>
              </View>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {user?.detectionsCount || '0'}
                  </Text>
                  <Text style={styles.statLabel}>Detections</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {user?.reportsCount || '0'}
                  </Text>
                  <Text style={styles.statLabel}>Reports</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {user?.ecoPoints || '0'}
                  </Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon="camera-alt"
              title="Waste Detection"
              count={`${user?.pendingDetections || '0'} new`}
              color="#4CAF50"
              onPress={() => navigateTo('WasteDetection')}
            />
            <QuickActionCard
              icon="report"
              title="Report Waste"
              count="Submit Now"
              color="#2196F3"
              onPress={() => navigateTo('ReportWaste')}
            />
            <QuickActionCard
              icon="history"
              title="Detection History"
              count={`${user?.totalDetections || '0'} items`}
              color="#FF9800"
              onPress={() => navigateTo('DetectionHistory')}
            />
            {/* IDINAGDAG - Messages Quick Action */}
            <QuickActionCard
              icon="chat"
              title="Messages"
              count={`${unreadMessagesCount || '0'} unread`}
              countColor={unreadMessagesCount > 0 ? "#FF5252" : "#666"}
              color="#9C27B0"
              onPress={() => navigateTo('Messages')}
            />
            <QuickActionCard
              icon="notifications"
              title="Notifications"
              count={`${unreadCount || '0'} unread`}
              color="#FF9800"
              onPress={() => navigateTo('Notifications')}
            />
            <QuickActionCard
              icon="map"
              title="Recycling Map"
              count="Find Centers"
              color="#009688"
              onPress={() => navigateTo('Maps')}
            />
            <QuickActionCard
              icon="feedback"
              title="Feedback"
              count="Share Ideas"
              color="#FF5722"
              onPress={() => navigateTo('FeedbackSupport')}
            />
          </View>
        </View>    
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      {/* Enhanced Header */}
      <LinearGradient
        colors={['#1976D2', '#1E88E5', '#42A5F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton} activeOpacity={0.7}>
          <Icon name="menu" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>WasteWise</Text>
          <Text style={styles.headerSubtitle}>{activeTab}</Text>
        </View>

        {/* IDINAGDAG - Messages Button sa Header */}
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => navigateTo('Messages')}
            activeOpacity={0.7}
          >
            <Icon name="chat" size={24} color="#FFFFFF" />
            {unreadMessagesCount > 0 && (
              <View style={styles.notificationBadgeHeader}>
                <Text style={styles.notificationBadgeTextHeader}>
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={() => navigateTo('Notifications')}
            activeOpacity={0.7}
          >
            <Icon name="notifications" size={24} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadgeHeader}>
                <Text style={styles.notificationBadgeTextHeader}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content with Scale Animation */}
      <Animated.View style={[styles.mainContentWrapper, { transform: [{ scale: scaleAnimation }] }]}>
        {renderContent()}
      </Animated.View>

      {/* Enhanced Sidebar */}
      {sidebarVisible && (
        <>
          <Animated.View 
            style={[
              styles.overlay, 
              { opacity: overlayAnimation }
            ]}
          >
            <TouchableOpacity 
              style={StyleSheet.absoluteFillObject}
              onPress={toggleSidebar}
              activeOpacity={1}
            />
          </Animated.View>

          <Animated.View style={[
            styles.sidebar, 
            { transform: [{ translateX: sidebarAnimation }] }
          ]}>
            <LinearGradient
              colors={['#1976D2', '#1565C0', '#0D47A1']}
              style={styles.sidebarBackground}
            >
              <View style={styles.userInfoSidebar}>
                <View style={styles.avatarContainer}>
                  {getProfilePicture() ? (
                    <Image 
                      source={getProfilePicture()} 
                      style={styles.sidebarProfileImage}
                      onError={(error) => console.log('❌ Sidebar image loading error:', error.nativeEvent.error)}
                    />
                  ) : (
                    <View style={styles.sidebarAvatar}>
                      <Text style={styles.sidebarAvatarText}>
                        {getDisplayName().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.onlineIndicator} />
                </View>
                <Text style={styles.userName}>{getDisplayName()}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
                <View style={styles.userRoleBadge}>
                  <Text style={styles.userRoleText}>{getDisplayRole()}</Text>
                </View>
              </View>

              <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
                {/* Main Navigation */}
                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Home' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Home')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="home" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Home Dashboard</Text>
                  {activeTab === 'Home' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>

                {/* Waste Management Section */}
                <Text style={styles.menuSectionTitle}>Waste Management</Text>
                
                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'WasteDetection' && styles.activeMenuItem]}
                  onPress={() => navigateTo('WasteDetection')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="camera-alt" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Waste Detection</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'ReportWaste' && styles.activeMenuItem]}
                  onPress={() => navigateTo('ReportWaste')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="report" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Report Waste</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'ReportStatus' && styles.activeMenuItem]}
                  onPress={() => navigateTo('ReportStatus')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="list-alt" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Report Status</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'DetectionHistory' && styles.activeMenuItem]}
                  onPress={() => navigateTo('DetectionHistory')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="history" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Detection History</Text>
                </TouchableOpacity>

                {/* Communication Section - IDINAGDAG */}
                <Text style={styles.menuSectionTitle}>Communication</Text>

                {/* IDINAGDAG - Messages Menu Item */}
                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Messages' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Messages')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="chat" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Messages</Text>
                  {unreadMessagesCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Notifications' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Notifications')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="notifications" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Notifications</Text>
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'FeedbackSupport' && styles.activeMenuItem]}
                  onPress={() => navigateTo('FeedbackSupport')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="feedback" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Feedback & Support</Text>
                </TouchableOpacity>

                {/* Maps Section */}
                <Text style={styles.menuSectionTitle}>Facilities & Guidance</Text>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Maps' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Maps')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="map" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Recycling Map</Text>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'DisposalGuidance' && styles.activeMenuItem]}
                  onPress={() => navigateTo('DisposalGuidance')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="eco" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Disposal Guidance</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'EducationalSection' && styles.activeMenuItem]}
                  onPress={() => navigateTo('EducationalSection')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="school" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Educational Resources</Text>
                </TouchableOpacity>

                {/* Account Section */}
                <Text style={styles.menuSectionTitle}>Account</Text>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'EditProfile' && styles.activeMenuItem]}
                  onPress={() => navigateTo('EditProfile')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="person" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Settings' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Settings')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="settings" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Settings</Text>
                  {activeTab === 'Settings' && <View style={styles.activeIndicator} />}
                </TouchableOpacity>

                {/* Logout */}
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={showLogoutConfirmation}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="logout" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Logout</Text>
                </TouchableOpacity>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </>
      )}

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalContent, { opacity: fadeAnimation }]}>
            <View style={styles.modalIcon}>
              <Icon name="logout" size={48} color="#1976D2" />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout? Your progress will be saved.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.logoutButtonModal]}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default UserDashboard;