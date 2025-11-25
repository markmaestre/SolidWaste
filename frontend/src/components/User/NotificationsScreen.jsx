import React, { useEffect, useState } from 'react';
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
  TextInput
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  updateNotificationPreferences,
  initializeNotifications
} from '../../redux/slices/notificationSlice';

const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { 
    notifications, 
    loading, 
    unreadCount,
    notificationPreferences 
  } = useSelector((state) => state.notification);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [preferences, setPreferences] = useState({
    notificationsEnabled: true,
    reportUpdates: true,
    recyclingTips: true,
    systemNotifications: true
  });

  useEffect(() => {
    loadNotifications();
    initializeNotificationService();
  }, []);

  useEffect(() => {
    if (notificationPreferences) {
      setPreferences(prev => ({
        ...prev,
        ...notificationPreferences
      }));
    }
  }, [notificationPreferences]);

  const filteredNotifications = notifications.filter(notification => 
    notification.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notification.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initializeNotificationService = async () => {
    try {
      await dispatch(initializeNotifications()).unwrap();
    } catch (error) {
      console.log('Failed to initialize notification service:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      await dispatch(getNotifications()).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to load notifications');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await dispatch(markAsRead(notificationId)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await dispatch(markAllAsRead()).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handlePreferenceChange = async (key, value) => {
    try {
      const updatedPreferences = { ...preferences, [key]: value };
      setPreferences(updatedPreferences);
      await dispatch(updateNotificationPreferences(updatedPreferences)).unwrap();
    } catch (error) {
      setPreferences(prev => ({ ...prev, [key]: !value }));
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'report_created':
        return { name: 'assignment', color: '#87CEEB' };
      case 'report_processed':
        return { name: 'check-circle', color: '#4682B4' };
      case 'recycling_tips':
        return { name: 'eco', color: '#5F9EA0' };
      default:
        return { name: 'notifications', color: '#B0C4DE' };
    }
  };

  const getNotificationType = (type) => {
    switch (type) {
      case 'report_created':
        return 'REPORT';
      case 'report_processed':
        return 'UPDATE';
      case 'recycling_tips':
        return 'TIP';
      default:
        return 'NOTIFICATION';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'report_created':
        return '#87CEEB';
      case 'report_processed':
        return '#4682B4';
      case 'recycling_tips':
        return '#5F9EA0';
      default:
        return '#B0C4DE';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }) => {
    const icon = getNotificationIcon(item.type);
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleMarkAsRead(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Icon name={icon.name} size={24} color={icon.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{item.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
              <Text style={styles.typeText}>{getNotificationType(item.type)}</Text>
            </View>
          </View>
          <Text style={styles.message}>{item.message}</Text>
          <View style={styles.footerRow}>
            <View style={styles.dateContainer}>
              <Icon name="access-time" size={12} color="#999" />
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            {!item.read && (
              <View style={styles.unreadIndicator}>
                <Icon name="fiber-manual-record" size={8} color="#87CEEB" />
                <Text style={styles.unreadText}>NEW</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#87CEEB" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#87CEEB" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity 
              onPress={handleMarkAllAsRead} 
              style={styles.markAllButton}
            >
              <Icon name="done-all" size={20} color="#87CEEB" />
              <Text style={styles.markAllText}>Mark all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setShowSettings(!showSettings)}
            style={styles.settingsButton}
          >
            <Icon 
              name={showSettings ? "close" : "settings"} 
              size={22} 
              color={showSettings ? "#87CEEB" : "#666"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
          >
            <Icon name="close" size={18} color="#87CEEB" />
          </TouchableOpacity>
        )}
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <View style={styles.settingsHeader}>
            <Icon name="settings" size={24} color="#87CEEB" />
            <Text style={styles.settingsTitle}>Notification Settings</Text>
          </View>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Icon name="notifications" size={20} color="#87CEEB" style={styles.preferenceIcon} />
              <View>
                <Text style={styles.preferenceText}>Enable Notifications</Text>
                <Text style={styles.preferenceDescription}>Receive all notifications</Text>
              </View>
            </View>
            <Switch
              value={preferences.notificationsEnabled}
              onValueChange={(value) => handlePreferenceChange('notificationsEnabled', value)}
              trackColor={{ false: '#E0E0E0', true: '#B0E0E6' }}
              thumbColor={preferences.notificationsEnabled ? '#87CEEB' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Icon name="assignment" size={20} color="#87CEEB" style={styles.preferenceIcon} />
              <View>
                <Text style={styles.preferenceText}>Report Updates</Text>
                <Text style={styles.preferenceDescription}>Status changes for your reports</Text>
              </View>
            </View>
            <Switch
              value={preferences.reportUpdates}
              onValueChange={(value) => handlePreferenceChange('reportUpdates', value)}
              trackColor={{ false: '#E0E0E0', true: '#B0E0E6' }}
              thumbColor={preferences.reportUpdates ? '#87CEEB' : '#f4f3f4'}
              disabled={!preferences.notificationsEnabled}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Icon name="eco" size={20} color="#87CEEB" style={styles.preferenceIcon} />
              <View>
                <Text style={styles.preferenceText}>Recycling Tips</Text>
                <Text style={styles.preferenceDescription}>Helpful recycling advice</Text>
              </View>
            </View>
            <Switch
              value={preferences.recyclingTips}
              onValueChange={(value) => handlePreferenceChange('recyclingTips', value)}
              trackColor={{ false: '#E0E0E0', true: '#B0E0E6' }}
              thumbColor={preferences.recyclingTips ? '#87CEEB' : '#f4f3f4'}
              disabled={!preferences.notificationsEnabled}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Icon name="info" size={20} color="#87CEEB" style={styles.preferenceIcon} />
              <View>
                <Text style={styles.preferenceText}>System Notifications</Text>
                <Text style={styles.preferenceDescription}>App updates and announcements</Text>
              </View>
            </View>
            <Switch
              value={preferences.systemNotifications}
              onValueChange={(value) => handlePreferenceChange('systemNotifications', value)}
              trackColor={{ false: '#E0E0E0', true: '#B0E0E6' }}
              thumbColor={preferences.systemNotifications ? '#87CEEB' : '#f4f3f4'}
              disabled={!preferences.notificationsEnabled}
            />
          </View>
        </View>
      )}

      {/* Unread Count Banner */}
      {unreadCount > 0 && !showSettings && (
        <View style={styles.unreadBanner}>
          <Icon name="notifications-active" size={16} color="#fff" />
          <Text style={styles.unreadBannerText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllLink}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results Info */}
      {searchQuery.length > 0 && (
        <View style={styles.searchResultsInfo}>
          <Icon name="search" size={16} color="#87CEEB" />
          <Text style={styles.searchResultsText}>
            Showing {filteredNotifications.length} result{filteredNotifications.length !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#87CEEB']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="notifications-off" size={64} color="#B0C4DE" />
            <Text style={styles.emptyTitle}>
              {searchQuery.length > 0 ? 'No results found' : 'No notifications'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 
                ? 'Try adjusting your search terms'
                : "You're all caught up! Check back later for updates."
              }
            </Text>
          </View>
        }
        contentContainerStyle={filteredNotifications.length === 0 && styles.emptyListContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#87CEEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  markAllText: {
    color: '#87CEEB',
    fontWeight: '600',
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
  },
  // Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  searchResultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  searchResultsText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '500',
  },
  // Settings Panel
  settingsPanel: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceIcon: {
    width: 24,
  },
  preferenceText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    color: '#666',
  },
  // Unread Banner
  unreadBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#87CEEB',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  unreadBannerText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
  markAllLink: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  // Notification Items
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#f8fbff',
    borderLeftWidth: 4,
    borderLeftColor: '#87CEEB',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  unreadText: {
    fontSize: 10,
    color: '#87CEEB',
    fontWeight: 'bold',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;