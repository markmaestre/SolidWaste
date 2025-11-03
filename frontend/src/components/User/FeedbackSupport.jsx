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
import { styles } from '../../components/Styles/FeedbackSupport';

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

export default FeedbackSupport;