import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Dimensions, Modal, Animated,
  Platform, Image, BackHandler, TextInput,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllPosts,
  toggleLike,
  addComment,
  selectAllPosts,
  selectPostsLoading,
  selectPostsError,
  selectPagination,
  setSelectedCategory,
  selectSelectedCategory,
  clearPostError,
} from '../../redux/slices/postSlice';

const { width, height } = Dimensions.get('window');

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

// Helper to get user's barangay from user object
const getUserBarangay = (user) => {
  // Check multiple possible locations for barangay info
  if (user?.barangay) return user.barangay;
  if (user?.assignedBarangay) return user.assignedBarangay;
  if (user?.assignedBarangayLabel) return user.assignedBarangayLabel;
  if (user?.profile?.barangay) return user.profile.barangay;
  
  // Default based on role if no specific barangay
  if (user?.role === 'southadmin') return 'South Signal';
  if (user?.role === 'centraladmin') return 'Central Bicutan';
  
  return null;
};

// Helper to check if user can see all posts (super admin)
const canSeeAllPosts = (user) => {
  return user?.role === 'superadmin';
};

// Helper to filter posts by barangay
const filterPostsByBarangay = (posts, user) => {
  if (!posts || posts.length === 0) return [];
  if (canSeeAllPosts(user)) return posts;
  
  const userBarangay = getUserBarangay(user);
  if (!userBarangay) return posts;
  
  // Filter posts where targetBarangay matches user's barangay
  return posts.filter(post => {
    // Check if post has targetBarangay field
    if (post.targetBarangay) {
      return post.targetBarangay === userBarangay;
    }
    // If no targetBarangay, check admin's barangay from post
    if (post.admin?.assignedBarangayLabel) {
      return post.admin.assignedBarangayLabel === userBarangay;
    }
    // Default: show only if admin role matches
    if (post.adminRole === 'southadmin' && userBarangay === 'South Signal') return true;
    if (post.adminRole === 'centraladmin' && userBarangay === 'Central Bicutan') return true;
    
    return false;
  });
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

// Helper function for category colors
const getCategoryColor = (category) => {
  const colors = {
    announcement: C.teal,
    update: C.amber,
    tip: C.green,
    alert: C.red,
    event: '#8B5CF6',
    advisory: C.amber,
    recycling_tip: C.green,
    cleanup_drive: '#8B5CF6',
    news: C.teal,
    general: C.slate,
  };
  return colors[category?.toLowerCase()] || C.slate;
};

// ── Image Viewer Modal Component ──────────────────────────────────────────────
const ImageViewer = ({ visible, imageUrl, onClose }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  const handleZoom = (event) => {
    const { scale: newScale } = event.nativeEvent;
    scale.setValue(Math.min(Math.max(newScale, 1), 3));
  };

  const handlePan = (event) => {
    if (scale._value > 1) {
      translateX.setValue(event.nativeEvent.translationX);
      translateY.setValue(event.nativeEvent.translationY);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.imageViewerOverlay}>
        <TouchableOpacity 
          style={s.imageViewerCloseBtn} 
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color={C.white} />
        </TouchableOpacity>
        
        <Animated.Image
          source={{ uri: imageUrl }}
          style={[
            s.imageViewerImage,
            {
              transform: [
                { scale },
                { translateX },
                { translateY },
              ],
            },
          ]}
          resizeMode="contain"
          onTouchStart={() => {}}
        />
        
        <View style={s.imageViewerFooter}>
          <Text style={s.imageViewerFooterText}>Pinch to zoom • Tap to close</Text>
        </View>
      </View>
    </Modal>
  );
};

// ── Post Card Component ───────────────────────────────────────────────────────
const PostCard = ({ post, onLike, onComment, currentUser }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [textLines, setTextLines] = useState(0);
  const textRef = useRef(null);

  const [liked, setLiked] = useState(!!post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? post.likes?.length ?? 0);
  const [comments, setComments] = useState(post.comments || []);
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength || expanded) return text;
    return text.substring(0, maxLength) + '...';
  };

  const needsTruncation = post.content?.length > 200;

  const handleLike = async () => {
    if (isLiking) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    setIsLiking(true);
    try {
      await onLike(post._id);
    } catch (error) {
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
      Alert.alert('Error', 'Failed to like post. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || isCommenting) return;
    const text = commentText.trim();

    const optimistic = {
      _id: `temp-${Date.now()}`,
      user: {
        _id: currentUser?._id,
        username: currentUser?.username || 'You',
      },
      content: text,
      createdAt: new Date().toISOString(),
    };

    setComments(prev => [...prev, optimistic]);
    setCommentText('');
    setIsCommenting(true);
    try {
      await onComment(post._id, text);
    } catch (error) {
      setComments(prev => prev.filter(c => c._id !== optimistic._id));
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setIsCommenting(false);
    }
  };

  // Get barangay display info
  const postBarangay = post.targetBarangay || post.admin?.assignedBarangayLabel;
  const isUserBarangay = () => {
    const userBarangay = getUserBarangay(currentUser);
    return !userBarangay || userBarangay === postBarangay;
  };

  return (
    <View style={s.postCard}>
      {/* Post Header */}
      <View style={s.postHeader}>
        <View style={s.postAvatar}>
          <Text style={s.postAvatarLetter}>
            {post.admin?.username?.charAt(0)?.toUpperCase() || 'A'}
          </Text>
        </View>
        <View style={s.postHeaderInfo}>
          <Text style={s.postAuthor}>{post.admin?.username || 'T.M.F.K Advisory'}</Text>
          <Text style={s.postDate}>{formatDate(post.createdAt)}</Text>
        </View>
        {post.isPinned && (
          <View style={s.pinnedBadge}>
            <Ionicons name="pin" size={12} color={C.teal} />
            <Text style={s.pinnedText}>Pinned</Text>
          </View>
        )}
        {post.category && (
          <View style={[s.categoryBadge, { backgroundColor: getCategoryColor(post.category) + '22' }]}>
            <Text style={[s.categoryText, { color: getCategoryColor(post.category) }]}>
              {post.category.replace('_', ' ')}
            </Text>
          </View>
        )}
      </View>

      {/* Barangay Badge - shows which barangay this post is for */}
      {postBarangay && (
        <View style={s.barangayBadge}>
          <Ionicons name="location-outline" size={12} color={C.teal} />
          <Text style={s.barangayBadgeText}>For: {postBarangay}</Text>
        </View>
      )}

      {/* Post Content */}
      {post.title && <Text style={s.postTitle}>{post.title}</Text>}
      
      <Text style={s.postContent}>
        {truncateText(post.content, 200)}
      </Text>
      
      {needsTruncation && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={s.seeMoreBtn}>
          <Text style={s.seeMoreText}>{expanded ? 'See less' : 'See more'}</Text>
        </TouchableOpacity>
      )}

      {/* Post Image */}
      {post.image && (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => setImageViewerVisible(true)}
        >
          <Image source={{ uri: post.image }} style={s.postImage} resizeMode="cover" />
          <View style={s.imageOverlayIcon}>
            <Ionicons name="expand-outline" size={24} color={C.white} />
          </View>
        </TouchableOpacity>
      )}

      <ImageViewer 
        visible={imageViewerVisible}
        imageUrl={post.image}
        onClose={() => setImageViewerVisible(false)}
      />

      {/* Post Actions */}
      <View style={s.postActions}>
        <TouchableOpacity
          onPress={handleLike}
          style={s.actionBtn}
          disabled={isLiking}
          activeOpacity={0.7}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? C.red : C.slate}
          />
          <Text style={[s.actionText, liked && { color: C.red, fontWeight: '700' }]}>
            {likeCount} Likes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowComments(!showComments)}
          style={s.actionBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={22} color={C.slate} />
          <Text style={s.actionText}>{comments.length} Comments</Text>
        </TouchableOpacity>
      </View>

      {/* Comments Section */}
      {showComments && (
        <View style={s.commentsSection}>
          <View style={s.commentInputContainer}>
            <TextInput
              style={s.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={C.slateL}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              editable={!isCommenting}
            />
            <TouchableOpacity
              onPress={handleAddComment}
              style={[
                s.commentSendBtn,
                (!commentText.trim() || isCommenting) && s.commentSendBtnDisabled,
              ]}
              disabled={!commentText.trim() || isCommenting}
              activeOpacity={0.7}
            >
              {isCommenting ? (
                <ActivityIndicator size="small" color={C.teal} />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={commentText.trim() ? C.teal : C.slateL}
                />
              )}
            </TouchableOpacity>
          </View>

          {comments.length > 0 ? (
            <View style={s.commentsList}>
              {comments.slice(0, 5).map((comment, idx) => (
                <View key={comment._id || idx} style={s.commentItem}>
                  <View style={s.commentAvatar}>
                    <Text style={s.commentAvatarLetter}>
                      {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={s.commentContent}>
                    <Text style={s.commentAuthor}>
                      {comment.user?.username || 'User'}
                    </Text>
                    <Text style={s.commentText}>{comment.content}</Text>
                    <Text style={s.commentDate}>{formatDate(comment.createdAt)}</Text>
                  </View>
                </View>
              ))}
              {comments.length > 5 && (
                <TouchableOpacity
                  onPress={() => Alert.alert('Comments', `Total: ${comments.length} comments`)}
                  style={s.viewMoreComments}
                >
                  <Text style={s.viewMoreCommentsText}>
                    View all {comments.length} comments
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={s.noCommentsContainer}>
              <Text style={s.noCommentsText}>No comments yet. Be the first to comment!</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const UserDashboard = () => {
  const dispatch   = useDispatch();
  const navigation = useNavigation();
  const route      = useRoute();
  const { user }   = useSelector((st) => st.auth);
  const { unreadCount }   = useSelector((st) => st.notification || { unreadCount: 0 });
  const { conversations } = useSelector((st) => st.message || { conversations: [] });

  const allPosts          = useSelector(selectAllPosts);
  const postsLoading      = useSelector(selectPostsLoading);
  const postsError        = useSelector(selectPostsError);
  const pagination        = useSelector(selectPagination);
  const selectedCategory  = useSelector(selectSelectedCategory);

  // Filtered posts based on user's barangay
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [activeTab,          setActiveTab]          = useState('Home');
  const [sidebarVisible,     setSidebarVisible]     = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [refreshing,         setRefreshing]         = useState(false);
  const [currentPage,        setCurrentPage]        = useState(1);

  const sidebarAnim = useRef(new Animated.Value(-width * 0.78)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const fadeAnim    = useRef(new Animated.Value(1)).current;

  const unreadMessages = conversations?.filter((c) => c.unread).length || 0;

  const categories = ['all', 'announcement', 'event', 'cleanup_drive', 'advisory', 'recycling_tip', 'news', 'alert', 'general'];

  // Get user's barangay info
  const userBarangay = getUserBarangay(user);
  const isSuperAdmin = canSeeAllPosts(user);

  // Apply barangay filtering whenever posts or user changes
  useEffect(() => {
    const filtered = filterPostsByBarangay(allPosts, user);
    setFilteredPosts(filtered);
  }, [allPosts, user]);

  // ── Fetch posts ─────────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async (page = 1, refresh = false) => {
    try {
      const filters = {
        page,
        limit: 10,
        category: selectedCategory === 'all' ? '' : selectedCategory,
        status: 'published',
      };
      await dispatch(getAllPosts(filters)).unwrap();
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      Alert.alert('Error', 'Failed to load posts. Please check your connection.');
    }
  }, [dispatch, selectedCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setCurrentPage(1);
    await fetchPosts(1, true);
    setRefreshing(false);
  }, [fetchPosts]);

  const loadMorePosts = useCallback(() => {
    if (!postsLoading && pagination?.hasNext && currentPage < pagination?.totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPosts(nextPage);
    }
  }, [postsLoading, pagination, currentPage, fetchPosts]);

  // ── Post interactions ───────────────────────────────────────────────────────
  const handleLike = useCallback(async (postId) => {
    await dispatch(toggleLike(postId)).unwrap();
  }, [dispatch]);

  const handleComment = useCallback(async (postId, content) => {
    await dispatch(addComment({ postId, content })).unwrap();
  }, [dispatch]);

  const handleCategoryChange = useCallback((category) => {
    dispatch(setSelectedCategory(category));
    setCurrentPage(1);
    fetchPosts(1, true);
  }, [dispatch, fetchPosts]);

  // ── Focus sync ──────────────────────────────────────────────────────────────
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
      if (route.name === 'UserDashboard') fetchPosts(1, true);
      dispatch(clearPostError());
    }, [route.name, fetchPosts, dispatch])
  );

  // ── Back handler ────────────────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarVisible) { 
        toggleSidebar(); 
        return true; 
      }
      if (logoutModalVisible) { 
        setLogoutModalVisible(false); 
        return true; 
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      showLogoutConfirmation();
      return true;
    });
    return () => sub.remove();
  }, [sidebarVisible, logoutModalVisible, navigation]);

  // ── Sidebar ─────────────────────────────────────────────────────────────────
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

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigateTo = (screen) => {
    setActiveTab(screen);
    if (sidebarVisible) toggleSidebar();
    setTimeout(() => {
      const map = {
        EditProfile:        'EditProfile',
        FeedbackSupport:    'FeedbackSupport',
        WasteDetection:     'WasteClassifier',
        ReportHistory:      'ReportHistory',
        DisposalGuidance:   'DisposalGuidance',
        EducationalSection: 'Learning',
        Notifications:      'NotificationsScreen',
        Maps:               'Maps',
        Messages:           'MessageList',
        WasteAnalytics:     'WasteAnalytics',
        Learning:           'Learning',
      };
      if (map[screen]) { navigation.navigate(map[screen]); return; }
      if (screen === 'Home' && route.name !== 'UserDashboard') navigation.navigate('UserDashboard');
    }, 300);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getProfilePicture = () => {
    if (!user?.profile) return null;
    if (typeof user.profile === 'string') return { uri: user.profile };
    if (user.profile.url) return { uri: user.profile.url };
    if (user.profile.uri) return { uri: user.profile.uri };
    return null;
  };
  const getDisplayName = () => user?.username || user?.name || 'T.M.F.K User';
  const getDisplayRole = () => {
    if (user?.role) {
      if (user.role === 'superadmin') return 'Super Admin';
      if (user.role === 'southadmin') return 'South Signal Admin';
      if (user.role === 'centraladmin') return 'Central Bicutan Admin';
      return user.role.charAt(0).toUpperCase() + user.role.slice(1);
    }
    return 'User';
  };

  // ── Render posts feed ───────────────────────────────────────────────────────
  const renderPostsFeed = () => (
    <View style={s.postsFeed}>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.categoryFilter}
        contentContainerStyle={s.categoryFilterContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.categoryChip, selectedCategory === cat && s.categoryChipActive]}
            onPress={() => handleCategoryChange(cat)}
            activeOpacity={0.7}
          >
            <Text style={[s.categoryChipText, selectedCategory === cat && s.categoryChipTextActive]}>
              {cat.replace('_', ' ').charAt(0).toUpperCase() + cat.replace('_', ' ').slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Barangay Info Banner */}
      {!isSuperAdmin && userBarangay && (
        <View style={s.barangayInfoBanner}>
          <Ionicons name="location" size={16} color={C.teal} />
          <Text style={s.barangayInfoText}>
            Showing posts for <Text style={s.barangayInfoHighlight}>{userBarangay}</Text>
          </Text>
        </View>
      )}

      {isSuperAdmin && (
        <View style={s.barangayInfoBanner}>
          <Ionicons name="shield-checkmark" size={16} color={C.amber} />
          <Text style={s.barangayInfoText}>
            Super Admin Mode: Viewing all barangay posts
          </Text>
        </View>
      )}

      {/* Posts List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} />
        }
        onScroll={({ nativeEvent }) => {
          const isCloseToBottom =
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - 200;
          if (isCloseToBottom && !postsLoading && pagination?.hasNext) {
            loadMorePosts();
          }
        }}
        scrollEventThrottle={400}
      >
        {postsError && (
          <View style={s.errorContainer}>
            <Ionicons name="alert-circle-outline" size={50} color={C.red} />
            <Text style={s.errorText}>
              {postsError?.error || 'Failed to load posts'}
            </Text>
            <TouchableOpacity onPress={() => fetchPosts(1, true)} style={s.retryBtn}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!postsLoading && filteredPosts.length === 0 && !postsError && (
          <View style={s.emptyContainer}>
            <Ionicons name="newspaper-outline" size={60} color={C.slateL} />
            <Text style={s.emptyTitle}>No Posts Available</Text>
            <Text style={s.emptyText}>
              {!isSuperAdmin && userBarangay 
                ? `No announcements yet for ${userBarangay}. Check back later for updates from your barangay admin.`
                : 'No posts available at the moment. Check back later for announcements.'}
            </Text>
          </View>
        )}

        {filteredPosts.map((post, index) => (
          <FadeIn key={post._id || index} delay={Math.min(index * 50, 300)}>
            <PostCard
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              currentUser={user}
            />
          </FadeIn>
        ))}

        {postsLoading && (
          <View style={s.loadingMore}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={s.loadingMoreText}>Loading posts...</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );

  // ── Render home ─────────────────────────────────────────────────────────────
  const renderHome = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={s.heroWrap}>
        <View style={s.heroBlob1} />
        <View style={s.heroBlob2} />

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
      </View>

      {/* Posts Section */}
      <View style={s.aboutSection}>
        <FadeIn delay={0}>
          <Badge label="Announcements & Updates" />
          <Text style={s.aboutTitle}>Latest{'\n'}From T.M.F.K</Text>
          <Text style={s.aboutBody}>
            Stay updated with the latest announcements, tips, and community news from your waste management team.
          </Text>
        </FadeIn>

        <FadeIn delay={60}>
          {renderPostsFeed()}
        </FadeIn>
      </View>
    </ScrollView>
  );

  // ── Render settings ─────────────────────────────────────────────────────────
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
              { icon: 'person-outline',       label: 'Edit Profile',  sub: 'Update your personal information',  screen: 'EditProfile', color: C.teal },
              { icon: 'chatbubbles-outline',   label: 'Messages',      sub: unreadMessages > 0 ? `${unreadMessages} unread message${unreadMessages > 1 ? 's' : ''}` : 'Manage your conversations', screen: 'Messages', color: '#A855F7', badge: unreadMessages },
              { icon: 'notifications-outline', label: 'Notifications', sub: unreadCount > 0 ? `${unreadCount} unread` : 'Manage notification preferences', screen: 'Notifications', color: C.amber, badge: unreadCount },
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
              { label: 'Barangay',     value: userBarangay || 'Not assigned' },
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
              { label: 'Last Login',   value: user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A' },
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

  // ── Sidebar sections ────────────────────────────────────────────────────────
  const SIDEBAR_SECTIONS = [
    {
      title: null,
      items: [{ icon: 'home-outline', label: 'Home Dashboard', screen: 'Home' }],
    },
   
    {
      title: 'Communication',
      items: [
        { icon: 'chatbubbles-outline',   label: 'Messages',           screen: 'Messages',       badge: unreadMessages },
        { icon: 'notifications-outline', label: 'Notifications',      screen: 'Notifications',  badge: unreadCount    },
      ],
    },

     {
      title: 'Waste Management',
      items: [
        { icon: 'scan-outline',      label: 'Waste Detection', screen: 'WasteDetection' },
        { icon: 'list-outline',      label: 'Report History',  screen: 'ReportHistory'  },
        { icon: 'bar-chart-outline', label: 'Waste Analytics', screen: 'WasteAnalytics' },
      ],
    },
    {
      title: 'Facilities & Guidance',
      items: [
        { icon: 'map-outline',    label: 'Recycling Map',         screen: 'Maps'    },
        { icon: 'school-outline', label: 'Educational Resources', screen: 'Learning' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'person-outline',   label: 'Edit Profile', screen: 'EditProfile' },
        { icon: 'settings-outline', label: 'Settings',     screen: 'Settings'    },
                { icon: 'megaphone-outline',     label: 'Feedback & Support', screen: 'FeedbackSupport'                       },
      ],
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />
      
      <View style={s.container}>
        {/* Header */}
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

        {/* Main Content */}
        <Animated.View style={[{ flex: 1 }, { transform: [{ scale: scaleAnim }] }]}>
          {renderContent()}
        </Animated.View>
      </View>

      {/* Sidebar */}
      {sidebarVisible && (
        <>
          <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={toggleSidebar} activeOpacity={1} />
          </Animated.View>

          <Animated.View style={[s.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
            <View style={s.sidebarBlob1} />
            <View style={s.sidebarBlob2} />

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
              {userBarangay && !isSuperAdmin && (
                <View style={s.sidebarBarangayPill}>
                  <Ionicons name="location" size={10} color={C.teal} />
                  <Text style={s.sidebarBarangayTxt}>{userBarangay}</Text>
                </View>
              )}
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

              <TouchableOpacity style={s.sidebarLogout} onPress={showLogoutConfirmation} activeOpacity={0.75}>
                <Ionicons name="log-out-outline" size={20} color={C.red} />
                <Text style={s.sidebarLogoutTxt}>Logout</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </>
      )}

      {/* Logout Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
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
  root: { 
    flex: 1, 
    backgroundColor: C.offWhite 
  },
  container: {
    flex: 1,
  },
  // Header
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row', 
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 14, 
    paddingHorizontal: 20,
    borderBottomWidth: 1, 
    borderBottomColor: C.borderDk,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute', 
    width: 180, 
    height: 180, 
    borderRadius: 90,
    backgroundColor: C.tealGlow, 
    top: -80, 
    right: -60,
  },
  menuBtn: { 
    padding: 4, 
    marginRight: 12 
  },
  headerCenter: { 
    flex: 1 
  },
  headerBrand: { 
    fontSize: 16, 
    fontWeight: '900', 
    color: C.white, 
    letterSpacing: 1.5 
  },
  headerSub: { 
    fontSize: 10, 
    color: C.teal, 
    fontWeight: '700', 
    letterSpacing: 0.6, 
    textTransform: 'uppercase' 
  },
  headerIconBtn: { 
    padding: 6, 
    position: 'relative' 
  },
  headerBadge: {
    position: 'absolute', 
    top: 2, 
    right: 2,
    minWidth: 16, 
    height: 16, 
    borderRadius: 8,
    backgroundColor: C.red, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 3,
  },
  headerBadgeTxt: { 
    fontSize: 9, 
    color: C.white, 
    fontWeight: '800' 
  },

  // Hero
  heroWrap: {
    backgroundColor: C.ink, 
    paddingHorizontal: 20,
    paddingTop: 24, 
    paddingBottom: 32, 
    overflow: 'hidden', 
    position: 'relative',
  },
  heroBlob1: {
    position: 'absolute', 
    width: 260, 
    height: 260, 
    borderRadius: 130,
    backgroundColor: C.tealGlow, 
    top: -100, 
    right: -100,
  },
  heroBlob2: {
    position: 'absolute', 
    width: 160, 
    height: 160, 
    borderRadius: 80,
    backgroundColor: 'rgba(0,201,167,0.06)', 
    bottom: -60, 
    left: -40,
  },
  profileStrip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    marginBottom: 22 
  },
  profileAvatar: {
    width: 52, 
    height: 52, 
    borderRadius: 16,
    backgroundColor: C.navyMid, 
    borderWidth: 1, 
    borderColor: C.tealLine,
    alignItems: 'center', 
    justifyContent: 'center', 
    position: 'relative',
  },
  profileAvatarImg: { 
    width: 52, 
    height: 52, 
    borderRadius: 16 
  },
  profileAvatarLetter: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: C.teal 
  },
  onlineDot: {
    position: 'absolute', 
    bottom: 2, 
    right: 2,
    width: 10, 
    height: 10, 
    borderRadius: 5,
    backgroundColor: C.green, 
    borderWidth: 2, 
    borderColor: C.ink,
  },
  profileHello: { 
    fontSize: 11, 
    color: C.ghost, 
    fontWeight: '500' 
  },
  profileName: { 
    fontSize: 17, 
    fontWeight: '900', 
    color: C.white, 
    letterSpacing: -0.2 
  },
  rolePill: {
    backgroundColor: C.tealDim, 
    borderRadius: 20,
    paddingVertical: 4, 
    paddingHorizontal: 12,
    borderWidth: 1, 
    borderColor: C.tealLine,
  },
  rolePillTxt: { 
    fontSize: 11, 
    color: C.teal, 
    fontWeight: '700' 
  },
  content: { 
    flex: 1, 
    backgroundColor: C.offWhite 
  },

  // About section
  aboutSection: { 
    paddingHorizontal: 20, 
    paddingTop: 28 
  },
  badge: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    backgroundColor: C.tealDim, 
    borderRadius: 20,
    paddingVertical: 5, 
    paddingHorizontal: 12,
    alignSelf: 'flex-start', 
    marginBottom: 14,
  },
  badgeDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: C.teal 
  },
  badgeText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: C.teal, 
    letterSpacing: 1, 
    textTransform: 'uppercase' 
  },
  aboutTitle: {
    fontSize: 28, 
    fontWeight: '900', 
    color: C.navy,
    letterSpacing: -0.6, 
    lineHeight: 36, 
    marginBottom: 14,
  },
  aboutBody: { 
    fontSize: 14, 
    color: C.slate, 
    lineHeight: 22, 
    marginBottom: 28 
  },

  // Settings
  settingsGroup: {
    backgroundColor: C.white, 
    borderRadius: 18, 
    marginBottom: 8,
    borderWidth: 1, 
    borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.06)', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, 
    shadowRadius: 8, 
    elevation: 1, 
    overflow: 'hidden',
  },
  settingsGroupTitle: {
    fontSize: 11, 
    fontWeight: '700', 
    color: C.slateL,
    letterSpacing: 0.8, 
    textTransform: 'uppercase',
    paddingHorizontal: 18, 
    paddingTop: 16, 
    paddingBottom: 8,
  },
  settingsItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 14,
    paddingHorizontal: 18, 
    paddingVertical: 16,
    borderBottomWidth: 1, 
    borderBottomColor: C.border,
  },
  settingsIconBox: {
    width: 38, 
    height: 38, 
    borderRadius: 10,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  settingsLabel: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: C.navy, 
    marginBottom: 2 
  },
  settingsSub: { 
    fontSize: 12, 
    color: C.slate 
  },
  settingsBadge: { 
    backgroundColor: C.red, 
    borderRadius: 10, 
    paddingVertical: 2, 
    paddingHorizontal: 7, 
    marginRight: 4 
  },
  settingsBadgeTxt: { 
    fontSize: 11, 
    color: C.white, 
    fontWeight: '800' 
  },
  infoRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 18, 
    paddingVertical: 14,
    borderBottomWidth: 1, 
    borderBottomColor: C.border,
  },
  infoLabel: { 
    fontSize: 13, 
    color: C.slate 
  },
  infoValue: { 
    fontSize: 13, 
    color: C.navy, 
    fontWeight: '600' 
  },
  statusPill: { 
    borderRadius: 8, 
    paddingVertical: 3, 
    paddingHorizontal: 10 
  },
  statusPillTxt: { 
    fontSize: 12, 
    fontWeight: '700' 
  },

  // Barangay Badge Styles
  barangayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.tealDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  barangayBadgeText: {
    fontSize: 10,
    color: C.teal,
    fontWeight: '600',
  },
  barangayInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.tealDim,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.tealLine,
  },
  barangayInfoText: {
    fontSize: 12,
    color: C.slate,
    textAlign: 'center',
  },
  barangayInfoHighlight: {
    fontWeight: '700',
    color: C.teal,
  },
  sidebarBarangayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.tealDim,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  sidebarBarangayTxt: {
    fontSize: 11,
    color: C.teal,
    fontWeight: '600',
  },

  // Sidebar
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)', 
    zIndex: 10,
  },
  sidebar: {
    position: 'absolute', 
    top: 0, 
    left: 0, 
    bottom: 0,
    width: width * 0.78, 
    backgroundColor: C.ink,
    zIndex: 20, 
    overflow: 'hidden',
    borderRightWidth: 1, 
    borderRightColor: C.borderDk,
  },
  sidebarBlob1: {
    position: 'absolute', 
    width: 220, 
    height: 220, 
    borderRadius: 110,
    backgroundColor: C.tealGlow, 
    top: -80, 
    right: -80,
  },
  sidebarBlob2: {
    position: 'absolute', 
    width: 150, 
    height: 150, 
    borderRadius: 75,
    backgroundColor: 'rgba(0,201,167,0.05)', 
    bottom: 100, 
    left: -60,
  },
  sidebarUser: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 24, 
    paddingBottom: 24,
    borderBottomWidth: 1, 
    borderBottomColor: C.borderDk,
  },
  sidebarAvatar: {
    width: 64, 
    height: 64, 
    borderRadius: 18,
    backgroundColor: C.navyMid, 
    borderWidth: 1.5, 
    borderColor: C.tealLine,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12, 
    position: 'relative',
  },
  sidebarAvatarImg: { 
    width: 64, 
    height: 64, 
    borderRadius: 18 
  },
  sidebarAvatarLetter: { 
    fontSize: 26, 
    fontWeight: '900', 
    color: C.teal 
  },
  sidebarOnlineDot: {
    position: 'absolute', 
    bottom: 2, 
    right: 2,
    width: 12, 
    height: 12, 
    borderRadius: 6,
    backgroundColor: C.green, 
    borderWidth: 2, 
    borderColor: C.ink,
  },
  sidebarName: { 
    fontSize: 17, 
    fontWeight: '900', 
    color: C.white, 
    marginBottom: 3 
  },
  sidebarEmail: { 
    fontSize: 12, 
    color: C.ghost, 
    marginBottom: 10 
  },
  sidebarRolePill: {
    alignSelf: 'flex-start', 
    backgroundColor: C.tealDim,
    borderRadius: 20, 
    paddingVertical: 4, 
    paddingHorizontal: 12,
    borderWidth: 1, 
    borderColor: C.tealLine,
  },
  sidebarRoleTxt: { 
    fontSize: 10, 
    color: C.teal, 
    fontWeight: '700', 
    letterSpacing: 0.6 
  },
  sidebarMenu: { 
    flex: 1, 
    paddingTop: 8 
  },
  sidebarSection: {
    fontSize: 9, 
    fontWeight: '800', 
    color: C.slateL,
    letterSpacing: 1.2, 
    textTransform: 'uppercase',
    paddingHorizontal: 24, 
    paddingTop: 20, 
    paddingBottom: 8,
  },
  sidebarItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    paddingHorizontal: 24, 
    paddingVertical: 13, 
    position: 'relative',
  },
  sidebarItemActive: { 
    backgroundColor: C.tealDim 
  },
  sidebarItemIcon: {
    width: 36, 
    height: 36, 
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  sidebarItemIconActive: { 
    backgroundColor: C.tealDim, 
    borderWidth: 1, 
    borderColor: C.tealLine 
  },
  sidebarItemTxt: { 
    flex: 1, 
    fontSize: 14, 
    color: C.ghost, 
    fontWeight: '500' 
  },
  sidebarItemTxtActive: { 
    color: C.teal, 
    fontWeight: '700' 
  },
  sidebarBadge: { 
    backgroundColor: C.red, 
    borderRadius: 10, 
    paddingVertical: 2, 
    paddingHorizontal: 7 
  },
  sidebarBadgeTxt: { 
    fontSize: 10, 
    color: C.white, 
    fontWeight: '800' 
  },
  sidebarActiveBar: {
    position: 'absolute', 
    right: 0, 
    top: 8, 
    bottom: 8,
    width: 3, 
    borderRadius: 2, 
    backgroundColor: C.teal,
  },
  sidebarLogout: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    marginTop: 8,
    borderTopWidth: 1, 
    borderTopColor: C.borderDk,
  },
  sidebarLogoutTxt: { 
    fontSize: 14, 
    color: C.red, 
    fontWeight: '600' 
  },

  // Logout modal
  modalOverlay: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.navy, 
    borderRadius: 22, 
    padding: 28,
    width: '100%', 
    maxWidth: 360,
    borderWidth: 1, 
    borderColor: C.borderDk, 
    alignItems: 'center',
  },
  modalIconRing: {
    width: 64, 
    height: 64, 
    borderRadius: 32,
    backgroundColor: C.tealDim, 
    borderWidth: 1, 
    borderColor: C.tealLine,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: C.white, 
    marginBottom: 8 
  },
  modalMsg: { 
    fontSize: 13, 
    color: C.ghost, 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: 28 
  },
  modalBtns: { 
    flexDirection: 'row', 
    gap: 12, 
    width: '100%' 
  },
  modalCancel: {
    flex: 1, 
    height: 48, 
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, 
    borderColor: C.borderDk,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  modalCancelTxt: { 
    color: C.ghost, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  modalLogout: {
    flex: 1, 
    height: 48, 
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1, 
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  modalLogoutTxt: { 
    color: C.red, 
    fontSize: 14, 
    fontWeight: '800' 
  },

  // Post Feed
  postsFeed: { 
    marginTop: 8 
  },
  categoryFilter: { 
    marginBottom: 16 
  },
  categoryFilterContent: { 
    gap: 8, 
    paddingHorizontal: 2 
  },
  categoryChip: {
    paddingHorizontal: 16, 
    paddingVertical: 8,
    borderRadius: 20, 
    backgroundColor: C.white,
    borderWidth: 1, 
    borderColor: C.border,
  },
  categoryChipActive: { 
    backgroundColor: C.teal, 
    borderColor: C.teal 
  },
  categoryChipText: { 
    fontSize: 13, 
    color: C.slate, 
    fontWeight: '600' 
  },
  categoryChipTextActive: { 
    color: C.white 
  },

  // Post Card
  postCard: {
    backgroundColor: C.white, 
    borderRadius: 16,
    marginBottom: 16, 
    padding: 16,
    borderWidth: 1, 
    borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.06)', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, 
    shadowRadius: 8, 
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 8, 
    flexWrap: 'wrap', 
    gap: 8,
  },
  postAvatar: {
    width: 40, 
    height: 40, 
    borderRadius: 12,
    backgroundColor: C.tealDim, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1, 
    borderColor: C.tealLine,
  },
  postAvatarLetter: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: C.teal 
  },
  postHeaderInfo: { 
    flex: 1 
  },
  postAuthor: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: C.navy 
  },
  postDate: { 
    fontSize: 11, 
    color: C.slateL, 
    marginTop: 2 
  },
  pinnedBadge: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: C.tealDim, 
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 12, 
    gap: 4,
  },
  pinnedText: { 
    fontSize: 10, 
    color: C.teal, 
    fontWeight: '700' 
  },
  categoryBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  categoryText: { 
    fontSize: 10, 
    fontWeight: '700' 
  },
  postTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: C.navy, 
    marginBottom: 8, 
    marginTop: 4,
  },
  postContent: { 
    fontSize: 14, 
    color: C.slate, 
    lineHeight: 20, 
    marginBottom: 8 
  },
  seeMoreBtn: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  seeMoreText: {
    fontSize: 13,
    color: C.teal,
    fontWeight: '600',
  },
  imageOverlayIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
  postImage: { 
    width: '100%', 
    height: 200, 
    borderRadius: 12, 
    marginBottom: 12 
  },
  postActions: {
    flexDirection: 'row', 
    borderTopWidth: 1, 
    borderTopColor: C.border,
    paddingTop: 12, 
    marginTop: 8, 
    gap: 24,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingVertical: 4 
  },
  actionText: { 
    fontSize: 13, 
    color: C.slate, 
    fontWeight: '500' 
  },

  // Comments
  commentsSection: {
    marginTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: C.border, 
    paddingTop: 12,
  },
  commentInputContainer: {
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 8, 
    marginBottom: 12,
  },
  commentInput: {
    flex: 1, 
    backgroundColor: C.offWhite, 
    borderRadius: 12,
    paddingHorizontal: 12, 
    paddingVertical: 8,
    fontSize: 13, 
    color: C.navy, 
    maxHeight: 80,
    borderWidth: 1, 
    borderColor: C.border,
  },
  commentSendBtn: {
    width: 36, 
    height: 36, 
    borderRadius: 10,
    backgroundColor: C.tealDim, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  commentSendBtnDisabled: { 
    opacity: 0.5 
  },
  commentsList: { 
    gap: 12 
  },
  commentItem: { 
    flexDirection: 'row', 
    gap: 10 
  },
  commentAvatar: {
    width: 28, 
    height: 28, 
    borderRadius: 8,
    backgroundColor: C.tealDim, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  commentAvatarLetter: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: C.teal 
  },
  commentContent: { 
    flex: 1 
  },
  commentAuthor: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: C.navy, 
    marginBottom: 2 
  },
  commentText: { 
    fontSize: 12, 
    color: C.slate, 
    lineHeight: 16, 
    marginBottom: 2 
  },
  commentDate: { 
    fontSize: 10, 
    color: C.slateL 
  },
  viewMoreComments: { 
    marginTop: 8, 
    alignItems: 'center', 
    paddingVertical: 8 
  },
  viewMoreCommentsText: { 
    fontSize: 12, 
    color: C.teal, 
    fontWeight: '600' 
  },
  noCommentsContainer: { 
    alignItems: 'center', 
    paddingVertical: 20 
  },
  noCommentsText: { 
    fontSize: 12, 
    color: C.slateL, 
    fontStyle: 'italic' 
  },

  // Image Viewer
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageViewerImage: {
    width: width,
    height: height * 0.7,
  },
  imageViewerFooter: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  imageViewerFooterText: {
    color: C.white,
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  // Loading & Error States
  errorContainer: { 
    alignItems: 'center', 
    padding: 32, 
    gap: 12 
  },
  errorText: { 
    fontSize: 14, 
    color: C.slate, 
    textAlign: 'center' 
  },
  retryBtn: { 
    backgroundColor: C.teal, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 12 
  },
  retryBtnText: { 
    color: C.white, 
    fontSize: 14, 
    fontWeight: '600' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    padding: 48, 
    gap: 12 
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: C.navy 
  },
  emptyText: { 
    fontSize: 14, 
    color: C.slate, 
    textAlign: 'center' 
  },
  loadingMore: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center', 
    padding: 20, 
    gap: 12,
  },
  loadingMoreText: { 
    fontSize: 13, 
    color: C.slate 
  },
});