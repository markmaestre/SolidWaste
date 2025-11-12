import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  getConversations,
  getUsers,
  getAdmins,
  searchUsers,
  setActiveChat,
  clearSearchResults
} from '../../redux/slices/messageSlice';

const MessageList = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { conversations, users, admins, searchResults, loading, error } = useSelector(state => state.message);
  
  // Redux state access
  const authState = useSelector(state => state.auth);
  const currentUser = authState.user || authState.userInfo;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (currentUser && currentUser.id) {
        console.log('Screen focused, reloading data...');
        loadData();
      }
    }, [currentUser])
  );

  useEffect(() => {
    if (currentUser && currentUser.id) {
      console.log('Current user found:', currentUser.username);
      loadData();
    } else {
      console.log('No user found in Redux state');
    }
  }, [currentUser]);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const timer = setTimeout(() => {
        dispatch(searchUsers(searchQuery));
        setShowSearchResults(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowSearchResults(false);
      dispatch(clearSearchResults());
    }
  }, [searchQuery]);

  const loadData = async () => {
    if (!currentUser?.id) {
      console.log('Cannot load data: No user ID available');
      return;
    }

    console.log('Loading data for user:', currentUser.id);
    
    try {
      if (currentUser?.role === 'admin') {
        await dispatch(getUsers()).unwrap();
      } else {
        await dispatch(getAdmins()).unwrap();
      }
      
      await dispatch(getConversations(currentUser.id)).unwrap();
      console.log('Data loaded successfully. Conversations:', conversations.length);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load messages');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const startChat = (otherUser) => {
    if (!otherUser || !otherUser._id) {
      Alert.alert('Error', 'User information is incomplete');
      return;
    }
    
    if (!currentUser?.id) {
      Alert.alert('Error', 'Your user information is not available. Please make sure you are logged in.');
      return;
    }
    
    console.log('Starting chat with:', otherUser.username);
    
    // Ensure we have all required user data
    const userToChat = {
      _id: otherUser._id,
      username: otherUser.username || 'Unknown User',
      email: otherUser.email || '',
      role: otherUser.role,
      profile: otherUser.profile
    };
    
    dispatch(setActiveChat(userToChat));
    navigation.navigate('ChatScreen', { 
      user: userToChat 
    });
  };

  const renderConversationItem = ({ item }) => {
    if (!item.user) {
      console.log('Invalid conversation item:', item);
      return null;
    }

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => startChat(item.user)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.conversationInfo}>
          <Text style={styles.username}>{item.user?.username || 'Unknown User'}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage?.text || 'No messages yet'}
          </Text>
        </View>
        <View style={styles.conversationMeta}>
          <Text style={styles.timestamp}>
            {item.lastMessage ? formatTime(item.lastMessage.timestamp) : ''}
          </Text>
          {item.unread && <View style={styles.unreadBadge} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => startChat(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.username?.charAt(0)?.toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username || 'Unknown User'}</Text>
        <Text style={styles.email}>{item.email || ''}</Text>
      </View>
      <Icon name="chat" size={20} color="#2196F3" />
    </TouchableOpacity>
  );

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return '';
    }
  };

  // Add user profile section
  const renderUserProfile = () => (
    <View style={styles.profileContainer}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>
          {currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{currentUser?.username || 'User'}</Text>
        <Text style={styles.profileRole}>{currentUser?.role || 'User'}</Text>
      </View>
      <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
        <Icon name="refresh" size={24} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );

  // Debug info
  console.log('MessageList Debug:', {
    currentUserId: currentUser?.id,
    conversationsCount: conversations?.length,
    usersCount: users?.length,
    adminsCount: admins?.length,
    conversations: conversations
  });

  if (!currentUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text>Loading user information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* User Profile Header */}
      {renderUserProfile()}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chats' && styles.activeTab]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, activeTab === 'chats' && styles.activeTabText]}>
            Chats ({conversations?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            {currentUser?.role === 'admin' ? 'Users' : 'Admins'} 
            ({currentUser?.role === 'admin' ? users?.length || 0 : admins?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {showSearchResults ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id || `user-${Math.random()}`}
          renderItem={renderUserItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      ) : activeTab === 'chats' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.user?._id || `conv-${Math.random()}`}
          renderItem={renderConversationItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="chat" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Start a chat with {currentUser?.role === 'admin' ? 'users' : 'admins'} from the Users tab
              </Text>
              <TouchableOpacity style={styles.refreshButtonLarge} onPress={loadData}>
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={currentUser?.role === 'admin' ? users : admins}
          keyExtractor={(item) => item._id || `user-${Math.random()}`}
          renderItem={renderUserItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="people" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                No {currentUser?.role === 'admin' ? 'users' : 'admins'} found
              </Text>
              <Text style={styles.emptySubtext}>
                {currentUser?.role === 'admin' 
                  ? 'There are no users in the system' 
                  : 'There are no admins available'
                }
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  conversationMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButtonLarge: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MessageList;