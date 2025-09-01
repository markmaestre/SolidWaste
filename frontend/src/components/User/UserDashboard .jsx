
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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
      if (screen === 'Settings') {
        Alert.alert('Settings', 'Settings screen would open here', [
          { text: 'OK', style: 'default' }
        ]);
      } else if (screen !== 'Home') {
        Alert.alert(screen, `${screen} feature coming soon!`, [
          { text: 'OK', style: 'default' }
        ]);
      }
    }, 300);
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
              <Text style={styles.welcomeText}>Welcome to {'WasteWise'}! </Text>
              <Text style={styles.welcomeSubtext}>Ready to make a difference today?</Text>
            </View>

       

        
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
                <QuickActionCard
                  icon="add-circle"
                  title="Log Waste"
                  count="New"
                  color="#4CAF50"
                  onPress={() => Alert.alert('Log Waste', 'Waste logging feature coming soon!')}
                />
                <QuickActionCard
                  icon="location-on"
                  title="Find Centers"
                  count="Near"
                  color="#2196F3"
                  onPress={() => Alert.alert('Recycling Centers', 'Map feature coming soon!')}
                />
                <QuickActionCard
                  icon="people"
                  title="Community"
                  count="Join"
                  color="#FF9800"
                  onPress={() => Alert.alert('Community', 'Social features coming soon!')}
                />
                <QuickActionCard
                  icon="trending-up"
                  title="Progress"
                  count="View"
                  color="#9C27B0"
                  onPress={() => Alert.alert('Progress', 'Analytics coming soon!')}
                />
              </ScrollView>
            </View>

            {/* Enhanced Recent Activity */}
            <View style={styles.recentActivitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              
              <ActivityBadge type="Plastic Recycling" points="15" time="2 hours ago" />
              <ActivityBadge type="Paper Collection" points="10" time="Yesterday" />
              <ActivityBadge type="Glass Sorting" points="20" time="2 days ago" />
              <ActivityBadge type="Metal Recovery" points="25" time="1 week ago" />
            </View>

          
     
          </ScrollView>
        );
        
      case 'Settings':
        return (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.settingsGroup}>
              <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
                <View style={styles.settingsIconContainer}>
                  <Icon name="person" size={24} color="#1976D2" />
                </View>
                <View style={styles.settingsTextContainer}>
                  <Text style={styles.settingsText}>Edit Profile</Text>
                  <Text style={styles.settingsSubtext}>Update your personal information</Text>
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
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
                <Text style={styles.userName}>{user?.name || 'WasteWise'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>
             
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

      {/* Enhanced Logout Modal */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#E3F2FD',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  mainContentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 25,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
    opacity: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsSection: {
    marginBottom: 25,
  },
  quickActionsScroll: {
    paddingLeft: 5,
  },
  quickActionCard: {
    width: 120,
    height: 100,
    marginRight: 15,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  quickActionTitle: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  recentActivitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
  },
  viewAllText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activityPoints: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  impactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactCard: {
    alignItems: 'center',
    flex: 1,
    padding: 15,
  },
  impactNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  impactLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingsSubtext: {
    fontSize: 13,
    color: '#666',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.75,
    zIndex: 1000,
  },
  sidebarBackground: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  userInfoSidebar: {
    alignItems: 'center',
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#E3F2FD',
    marginBottom: 15,
    textAlign: 'center',
  },
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  userStat: {
    alignItems: 'center',
    flex: 1,
  },
  userStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userStatLabel: {
    fontSize: 12,
    color: '#E3F2FD',
    marginTop: 2,
  },
  userStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
  },
  sidebarMenu: {
    flex: 1,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    position: 'relative',
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 15,
    marginHorizontal: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 999,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 25,
    flex: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButtonModal: {
    backgroundColor: '#1976D2',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default UserDashboard;
