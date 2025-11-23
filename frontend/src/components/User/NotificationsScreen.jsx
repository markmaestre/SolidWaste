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
        return '#2196F3';
      case 'report_processed':
        return '#4CAF50';
      case 'recycling_tips':
        return '#FF9800';
      default:
        return '#9E9E9E';
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

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadItem]}
      onPress={() => handleMarkAsRead(item._id)}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) }]}>
            <Text style={styles.typeText}>{getNotificationType(item.type)}</Text>
          </View>
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          {!item.read && (
            <View style={styles.unreadIndicator}>
              <Text style={styles.unreadText}>NEW</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
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
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity 
              onPress={handleMarkAllAsRead} 
              style={styles.markAllButton}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => setShowSettings(!showSettings)}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
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
            <Text style={styles.clearSearchText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsTitle}>Notification Settings</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceText}>Enable Notifications</Text>
              <Text style={styles.preferenceDescription}>Receive all notifications</Text>
            </View>
            <Switch
              value={preferences.notificationsEnabled}
              onValueChange={(value) => handlePreferenceChange('notificationsEnabled', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={preferences.notificationsEnabled ? '#2196F3' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceText}>Report Updates</Text>
              <Text style={styles.preferenceDescription}>Status changes for your reports</Text>
            </View>
            <Switch
              value={preferences.reportUpdates}
              onValueChange={(value) => handlePreferenceChange('reportUpdates', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={preferences.reportUpdates ? '#2196F3' : '#f4f3f4'}
              disabled={!preferences.notificationsEnabled}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceText}>Recycling Tips</Text>
              <Text style={styles.preferenceDescription}>Helpful recycling advice</Text>
            </View>
            <Switch
              value={preferences.recyclingTips}
              onValueChange={(value) => handlePreferenceChange('recyclingTips', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={preferences.recyclingTips ? '#2196F3' : '#f4f3f4'}
              disabled={!preferences.notificationsEnabled}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceText}>System Notifications</Text>
              <Text style={styles.preferenceDescription}>App updates and announcements</Text>
            </View>
            <Switch
              value={preferences.systemNotifications}
              onValueChange={(value) => handlePreferenceChange('systemNotifications', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={preferences.systemNotifications ? '#2196F3' : '#f4f3f4'}
              disabled={!preferences.notificationsEnabled}
            />
          </View>
        </View>
      )}

      {/* Unread Count Banner */}
      {unreadCount > 0 && !showSettings && (
        <View style={styles.unreadBanner}>
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
            colors={['#2196F3']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
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
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearSearchButton: {
    padding: 8,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  searchResultsInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  searchResultsText: {
    color: '#1976D2',
    fontSize: 14,
    textAlign: 'center',
  },
  // Settings Panel
  settingsPanel: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
    textAlign: 'center',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceInfo: {
    flex: 1,
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
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  unreadBannerText: {
    color: '#1976D2',
    fontWeight: '500',
    fontSize: 14,
  },
  markAllLink: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  // Notification Items
  notificationItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  unreadItem: {
    backgroundColor: '#F8FBFF',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
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
    color: '#1A1A1A',
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
  date: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unreadText: {
    fontSize: 10,
    color: 'white',
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