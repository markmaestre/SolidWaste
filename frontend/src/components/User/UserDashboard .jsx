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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { styles } from '../../components/Css/UserDashboard';

const { width, height } = Dimensions.get('window');

const UserDashboard = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('Home');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  
  // Fixed animation references with useRef
  const sidebarAnimation = useRef(new Animated.Value(-width * 0.75)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

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
        case 'Settings':
          // Settings is now handled in renderContent
          break;
        case 'Home':
          // Stay on home
          break;
        default:
          Alert.alert(screen, `${screen} feature coming soon!`, [
            { text: 'OK', style: 'default' }
          ]);
      }
    }, 300);
  };

  // Get user's profile picture or use default
  const getProfilePicture = () => {
    if (user?.profile?.url) {
      return { uri: user.profile.url };
    }
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

  const QuickActionCard = ({ icon, title, count, color, onPress }) => (
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
        <Text style={styles.quickActionCount}>{count}</Text>
        <Text style={styles.quickActionTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const ActivityBadge = ({ type, points, time }) => (
    <View style={styles.activityBadge}>
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(type) }]}>
        <Icon name={getActivityIcon(type)} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{type}</Text>
        <Text style={styles.activityPoints}>+{points} EcoPoints</Text>
      </View>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  );

  const getActivityColor = (type) => {
    switch (type) {
      case 'Plastic Recycling': return '#4CAF50';
      case 'Paper Collection': return '#FF9800';
      case 'Glass Sorting': return '#2196F3';
      case 'Metal Recovery': return '#9C27B0';
      default: return '#666';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'Plastic Recycling': return 'recycling';
      case 'Paper Collection': return 'description';
      case 'Glass Sorting': return 'wine-bar';
      case 'Metal Recovery': return 'build';
      default: return 'eco';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>Welcome back, {getDisplayName()}! 🌱</Text>
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
                      <Text style={styles.statNumber}>12</Text>
                      <Text style={styles.statLabel}>Recycling</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>8</Text>
                      <Text style={styles.statLabel}>Points</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>3</Text>
                      <Text style={styles.statLabel}>Badges</Text>
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
                  icon="recycling"
                  title="Recycle Now"
                  count="5 items"
                  color="#4CAF50"
                  onPress={() => navigateTo('Recycling')}
                />
                <QuickActionCard
                  icon="trending-up"
                  title="Analytics"
                  count="View Stats"
                  color="#2196F3"
                  onPress={() => navigateTo('Analytics')}
                />
                <QuickActionCard
                  icon="people"
                  title="Community"
                  count="24 online"
                  color="#FF9800"
                  onPress={() => navigateTo('Community')}
                />
                <QuickActionCard
                  icon="settings"
                  title="Settings"
                  count="Manage"
                  color="#9C27B0"
                  onPress={() => navigateTo('Settings')}
                />
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.activitiesList}>
                <ActivityBadge 
                  type="Plastic Recycling" 
                  points={50} 
                  time="2h ago" 
                />
                <ActivityBadge 
                  type="Paper Collection" 
                  points={30} 
                  time="1d ago" 
                />
                <ActivityBadge 
                  type="Glass Sorting" 
                  points={40} 
                  time="2d ago" 
                />
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
              
              <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                <View style={styles.settingsIconContainer}>
                  <Icon name="notifications" size={24} color="#FF9800" />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsText}>Notifications</Text>
                  <Text style={styles.settingsSubtext}>Manage your notification preferences</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                <View style={styles.settingsIconContainer}>
                  <Icon name="security" size={24} color="#4CAF50" />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsText}>Privacy & Security</Text>
                  <Text style={styles.settingsSubtext}>Control your privacy settings</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                <View style={styles.settingsIconContainer}>
                  <Icon name="help" size={24} color="#9C27B0" />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsText}>Help & Support</Text>
                  <Text style={styles.settingsSubtext}>Get help and contact support</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Account Info Section */}
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
        
      default:
        return (
          <View style={styles.content}>
            <View style={styles.placeholderContainer}>
              <Icon name="eco" size={64} color="#1976D2" />
              <Text style={styles.placeholderText}>Select an option from the sidebar</Text>
              <Text style={styles.placeholderSubtext}>Explore WasteWise features</Text>
            </View>
          </View>
        );
    }
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

        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigateTo('EditProfile')}
          activeOpacity={0.7}
        >
          {getProfilePicture() ? (
            <Image 
              source={getProfilePicture()} 
              style={styles.headerProfileImage}
            />
          ) : (
            <View style={styles.headerProfilePlaceholder}>
              <Icon name="person" size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
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
                
                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Analytics' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Analytics')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="analytics" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Analytics</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Recycling' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Recycling')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="recycling" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Recycling Center</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.menuItem, activeTab === 'Community' && styles.activeMenuItem]}
                  onPress={() => navigateTo('Community')}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconContainer}>
                    <Icon name="people" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.menuText}>Community</Text>
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

                <View style={styles.menuDivider} />
                
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

      {/* Logout Confirmation Modal */}
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