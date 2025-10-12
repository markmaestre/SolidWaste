import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { submitFeedback, getUserFeedback, clearFeedbackError } from '../../redux/slices/authSlice';

const FeedbackSupport = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { 
    user, 
    feedback, 
    feedbackLoading, 
    feedbackSubmitLoading, 
    feedbackSubmitSuccess,
    feedbackError 
  } = useSelector((state) => state.auth);

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' or 'history'

  // Clear errors when component mounts
  useEffect(() => {
    dispatch(clearFeedbackError());
  }, []);

  useEffect(() => {
    if (feedbackSubmitSuccess) {
      console.log('✅ Feedback submitted successfully');
      setShowLoadingModal(false);
      setShowSuccessModal(true);
      setRating(0);
      setMessage('');
      setCategory('general');
      // Refresh feedback history
      dispatch(getUserFeedback());
    }
  }, [feedbackSubmitSuccess]);

  useEffect(() => {
    if (feedbackError) {
      console.log('❌ Feedback error:', feedbackError);
      setShowLoadingModal(false);
      Alert.alert('Submission Failed', feedbackError);
    }
  }, [feedbackError]);

  useEffect(() => {
    // Load user's feedback history when component mounts
    console.log('📥 Loading user feedback history...');
    dispatch(getUserFeedback());
  }, []);

  const handleSubmitFeedback = async () => {
    console.log('🔄 Submit feedback triggered');
    console.log('📊 Current state:', { 
      rating, 
      messageLength: message.length, 
      messagePreview: message.substring(0, 50) + '...',
      category 
    });

    // Validation
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating for the app.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Message Required', 'Please provide your feedback message.');
      return;
    }

    if (message.trim().length < 10) {
      Alert.alert('Message Too Short', 'Please provide more detailed feedback (at least 10 characters).');
      return;
    }

    try {
      console.log('🚀 Starting feedback submission...');
      
      const feedbackData = {
        rating,
        message: message.trim(),
        category
      };

      console.log('📤 Feedback data to send:', feedbackData);
      
      // Show loading modal
      setShowLoadingModal(true);
      
      // Dispatch the feedback submission
      const result = await dispatch(submitFeedback(feedbackData));
      
      console.log('📨 Dispatch result:', result);
      
      if (submitFeedback.fulfilled.match(result)) {
        console.log('✅ Feedback submission fulfilled');
      } else if (submitFeedback.rejected.match(result)) {
        console.log('❌ Feedback submission rejected:', result.error);
        setShowLoadingModal(false);
        Alert.alert(
          'Submission Failed', 
          result.payload || 'Failed to submit feedback. Please try again.'
        );
      }
      
    } catch (error) {
      console.error('💥 Unexpected error in handleSubmitFeedback:', error);
      setShowLoadingModal(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={styles.starsLabel}>How would you rate our app? *</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
              activeOpacity={0.7}
            >
              <Icon
                name={star <= rating ? 'star' : 'star-outline'}
                size={36}
                color={star <= rating ? '#FFD700' : '#CCCCCC'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>
          {rating === 0 ? 'Select a rating' : `${rating} star${rating !== 1 ? 's' : ''}`}
        </Text>
      </View>
    );
  };

  const renderCategorySelector = () => {
    const categories = [
      { value: 'general', label: 'General', icon: 'chat' },
      { value: 'bug', label: 'Bug Report', icon: 'bug-report' },
      { value: 'feature', label: 'Feature Request', icon: 'lightbulb' },
      { value: 'improvement', label: 'Improvement', icon: 'trending-up' },
      { value: 'support', label: 'Support', icon: 'help' },
    ];

    return (
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <View style={styles.categoriesRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryButton,
                  category === cat.value && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat.value)}
                activeOpacity={0.7}
              >
                <Icon
                  name={cat.icon}
                  size={20}
                  color={category === cat.value ? '#FFFFFF' : '#1976D2'}
                />
                <Text style={[
                  styles.categoryButtonText,
                  category === cat.value && styles.categoryButtonTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderFeedbackForm = () => (
    <View style={styles.formContainer}>
      {renderStars()}
      {renderCategorySelector()}

      <View style={styles.messageContainer}>
        <Text style={styles.messageLabel}>
          Your Feedback * ({message.length}/1000)
        </Text>
        <TextInput
          style={[
            styles.messageInput,
            message.length > 1000 && styles.messageInputError
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us about your experience, suggestions, or issues..."
          placeholderTextColor="#95A5A6"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        {message.length > 1000 && (
          <Text style={styles.errorText}>
            Maximum 1000 characters reached
          </Text>
        )}
        {message.length > 0 && message.length < 10 && (
          <Text style={styles.warningText}>
            Minimum 10 characters required ({10 - message.length} more needed)
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          (rating === 0 || !message.trim() || message.length < 10 || feedbackSubmitLoading) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmitFeedback}
        disabled={rating === 0 || !message.trim() || message.length < 10 || feedbackSubmitLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            rating === 0 || !message.trim() || message.length < 10 || feedbackSubmitLoading
              ? ['#B7E4C7', '#B7E4C7']
              : ['#1976D2', '#42A5F5']
          }
          style={styles.submitButtonGradient}
        >
          {feedbackSubmitLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Debug Info - Remove in production */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Debug Info:</Text>
          <Text style={styles.debugText}>Rating: {rating}</Text>
          <Text style={styles.debugText}>Message Length: {message.length}</Text>
          <Text style={styles.debugText}>Category: {category}</Text>
          <Text style={styles.debugText}>Loading: {feedbackSubmitLoading ? 'Yes' : 'No'}</Text>
          <Text style={styles.debugText}>Error: {feedbackError || 'None'}</Text>
        </View>
      )}
    </View>
  );

  const renderFeedbackHistory = () => {
    if (feedbackLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading your feedback history...</Text>
        </View>
      );
    }

    if (!feedback || feedback.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="feedback" size={64} color="#BDC3C7" />
          <Text style={styles.emptyTitle}>No Feedback Yet</Text>
          <Text style={styles.emptyText}>
            You haven't submitted any feedback yet. Your feedback helps us improve the app!
          </Text>
          <TouchableOpacity
            style={styles.submitFirstButton}
            onPress={() => setActiveTab('submit')}
            activeOpacity={0.7}
          >
            <Text style={styles.submitFirstButtonText}>Submit Your First Feedback</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Your Feedback History</Text>
          <Text style={styles.historySubtitle}>{feedback.length} submission(s)</Text>
        </View>
        
        {feedback.map((item) => (
          <View key={item._id} style={styles.feedbackItem}>
            <View style={styles.feedbackHeader}>
              <View style={styles.ratingContainer}>
                {[...Array(5)].map((_, index) => (
                  <Icon
                    key={index}
                    name={index < item.rating ? 'star' : 'star-outline'}
                    size={16}
                    color={index < item.rating ? '#FFD700' : '#CCCCCC'}
                  />
                ))}
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) }
              ]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.feedbackMessage}>{item.message}</Text>
            
            <View style={styles.feedbackMeta}>
              <View style={styles.categoryBadge}>
                <Icon name={getCategoryIcon(item.category)} size={12} color="#1976D2" />
                <Text style={styles.categoryText}>
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </Text>
              </View>
              <Text style={styles.dateText}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {item.adminReply && (
              <View style={styles.adminReplyContainer}>
                <Text style={styles.adminReplyLabel}>Admin Response:</Text>
                <Text style={styles.adminReplyText}>{item.adminReply}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA000';
      case 'reviewed': return '#2196F3';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#757575';
      default: return '#BDC3C7';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'bug': return 'bug-report';
      case 'feature': return 'lightbulb';
      case 'improvement': return 'trending-up';
      case 'support': return 'help';
      default: return 'chat';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      {/* Header */}
      <LinearGradient
        colors={['#1976D2', '#1E88E5', '#42A5F5']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Feedback & Support</Text>
          <Text style={styles.headerSubtitle}>We value your opinion</Text>
        </View>
        
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submit' && styles.activeTab]}
          onPress={() => setActiveTab('submit')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'submit' && styles.activeTabText]}>
            Submit Feedback
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            My Feedback ({feedback.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {activeTab === 'submit' ? renderFeedbackForm() : renderFeedbackHistory()}
      </KeyboardAvoidingView>

      {/* Loading Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLoadingModal}
        onRequestClose={() => setShowLoadingModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingModalTitle}>Submitting Feedback</Text>
            <Text style={styles.loadingModalMessage}>
              Please wait while we send your feedback...
            </Text>
            <View style={styles.loadingDots}>
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Icon name="check-circle" size={64} color="#4CAF50" />
            </View>
            <Text style={styles.modalTitle}>Thank You!</Text>
            <Text style={styles.modalMessage}>
              Your feedback has been submitted successfully. We appreciate your input and will use it to improve WasteWise.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#1976D2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  activeTabText: {
    color: '#1976D2',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  starsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  starsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  categoriesScroll: {
    marginHorizontal: -5,
  },
  categoriesRow: {
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#1976D2',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  categoryButtonActive: {
    backgroundColor: '#1976D2',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 6,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  messageContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 2,
    borderColor: '#ECF0F1',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  messageInputError: {
    borderColor: '#E74C3C',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  warningText: {
    color: '#FF9800',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Debug styles - Remove in production
  debugContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
    marginTop: 10,
  },
  debugText: {
    fontSize: 10,
    color: '#E74C3C',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 20,
  },
  submitFirstButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
    padding: 20,
  },
  historyHeader: {
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  historySubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  feedbackItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  adminReplyContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  adminReplyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  adminReplyText: {
    fontSize: 12,
    color: '#2C3E50',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
  },
  loadingModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingModalMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
    marginHorizontal: 4,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FeedbackSupport;