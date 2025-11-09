import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { getNotifications, markAsRead, markAllAsRead } from '../../redux/slices/notificationSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';

const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { notifications, loading, unreadCount } = useSelector((state) => state.notification);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

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
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'report_created':
        return 'assignment';
      case 'report_processed':
        return 'check-circle';
      case 'recycling_tips':
        return 'eco';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
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
      <View style={styles.iconContainer}>
        <Icon
          name={getNotificationIcon(item.type)}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
      
      {!item.read && (
        <View style={styles.unreadIndicator} />
      )}
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
      {/* Header with Back Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity 
            onPress={handleMarkAllAsRead} 
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
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
            <Icon name="notifications_off" size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              You're all caught up! Check back later for updates.
            </Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 && styles.emptyListContainer}
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
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
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
  unreadBanner: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  unreadBannerText: {
    color: '#1976D2',
    fontWeight: '500',
    fontSize: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadItem: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    alignSelf: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default NotificationsScreen;