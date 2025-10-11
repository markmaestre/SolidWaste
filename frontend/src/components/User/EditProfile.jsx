import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { editProfile } from '../../redux/slices/authSlice';

const EditProfile = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user, profileUpdateLoading } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bod: user?.bod ? new Date(user.bod).toISOString().split('T')[0] : '',
    gender: user?.gender || '',
    address: user?.address || '',
  });
  
  const [profileImage, setProfileImage] = useState(user?.profile || null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageChanged, setImageChanged] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setProfileImage(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
        setImageChanged(true);
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera access to take your photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setProfileImage(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
        setImageChanged(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.username.trim()) {
      Alert.alert('Validation Error', 'Username is required');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }

    try {
      const updateData = new FormData();
      
      updateData.append('username', formData.username.trim());
      updateData.append('email', formData.email.trim());
      if (formData.bod) updateData.append('bod', formData.bod);
      if (formData.gender) updateData.append('gender', formData.gender.trim());
      if (formData.address) updateData.append('address', formData.address.trim());

      if (imageChanged) {
        if (profileImage && imageBase64) {
          updateData.append('profile', `data:image/jpeg;base64,${imageBase64}`);
        } else if (!profileImage) {
          updateData.append('profile', '');
        }
      }

      const result = await dispatch(editProfile(updateData)).unwrap();
      
      Alert.alert('Success!', 'Your profile has been updated successfully', [
        { 
          text: 'OK', 
          onPress: () => navigation.goBack() 
        }
      ]);
      
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Update Failed', error || 'Failed to update profile. Please try again.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Update Profile Photo',
      'Choose how you want to update your photo',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickImage,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const removeProfilePicture = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile picture?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setProfileImage(null);
            setImageBase64(null);
            setImageChanged(true);
          },
        },
      ]
    );
  };

  const hasChanges = () => {
    const textFieldsChanged = 
      formData.username !== user?.username ||
      formData.email !== user?.email ||
      formData.bod !== (user?.bod ? new Date(user.bod).toISOString().split('T')[0] : '') ||
      formData.gender !== user?.gender ||
      formData.address !== user?.address;
    
    return textFieldsChanged || imageChanged;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#2D6A4F', '#40916C', '#52B788']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>Update your information</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View 
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Profile Picture Section */}
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Profile Photo</Text>
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={showImagePickerOptions}
              activeOpacity={0.85}
            >
              <View style={styles.imageWrapper}>
                {profileImage ? (
                  <>
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.4)']}
                      style={styles.imageOverlay}
                    >
                      <Text style={styles.imageOverlayText}>TAP TO CHANGE</Text>
                    </LinearGradient>
                  </>
                ) : (
                  <LinearGradient
                    colors={['#74C69D', '#52B788']}
                    style={styles.profileImagePlaceholder}
                  >
                    <Text style={styles.placeholderInitial}>
                      {formData.username ? formData.username[0].toUpperCase() : '?'}
                    </Text>
                    <Text style={styles.placeholderText}>Add Photo</Text>
                  </LinearGradient>
                )}
              </View>
            </TouchableOpacity>
            
            {profileImage && (
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={removeProfilePicture}
                activeOpacity={0.7}
              >
                <Text style={styles.removePhotoText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Container */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Personal Information</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredText}>* Required</Text>
              </View>
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedField === 'username' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={styles.input}
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter username"
                  placeholderTextColor="#95D5B2"
                />
                {formData.username.length > 0 && (
                  <View style={styles.inputBadge}>
                    <Text style={styles.inputBadgeText}>{formData.username.length}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="your@email.com"
                  placeholderTextColor="#95D5B2"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'bod' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={styles.input}
                  value={formData.bod}
                  onChangeText={(text) => setFormData({ ...formData, bod: text })}
                  onFocus={() => setFocusedField('bod')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#95D5B2"
                />
              </View>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'gender' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={styles.input}
                  value={formData.gender}
                  onChangeText={(text) => setFormData({ ...formData, gender: text })}
                  onFocus={() => setFocusedField('gender')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter gender"
                  placeholderTextColor="#95D5B2"
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <View style={[
                styles.inputWrapper,
                styles.textAreaWrapper,
                focusedField === 'address' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your full address"
                  placeholderTextColor="#95D5B2"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>

          {/* Changes Indicator */}
          {hasChanges() && (
            <View style={styles.changesIndicator}>
              <View style={styles.changesDot} />
              <Text style={styles.changesText}>You have unsaved changes</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              disabled={profileUpdateLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.saveButton,
                (!hasChanges() || profileUpdateLoading) && styles.saveButtonDisabled
              ]}
              onPress={handleUpdateProfile}
              disabled={!hasChanges() || profileUpdateLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  !hasChanges() || profileUpdateLoading 
                    ? ['#B7E4C7', '#B7E4C7'] 
                    : ['#2D6A4F', '#40916C']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {profileUpdateLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {hasChanges() ? 'Save Changes' : 'No Changes'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1FAEE',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  headerPlaceholder: {
    width: 42,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  contentWrapper: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D6A4F',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    borderBottomLeftRadius: 65,
    borderBottomRightRadius: 65,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 8,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  profileImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  placeholderInitial: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  removePhotoButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#FFB4B4',
  },
  removePhotoText: {
    color: '#D62828',
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E8F5E9',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D6A4F',
    letterSpacing: 0.3,
  },
  requiredBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  requiredText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D62828',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D6A4F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#D62828',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '700',
  },
  inputWrapper: {
    position: 'relative',
    backgroundColor: '#F1FAEE',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D8F3DC',
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: '#52B788',
    backgroundColor: '#FFFFFF',
    shadowColor: '#52B788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#1B4332',
    fontWeight: '500',
  },
  textAreaWrapper: {
    minHeight: 100,
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 16,
    minHeight: 100,
  },
  inputBadge: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: '#52B788',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  inputBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  changesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  changesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F4A261',
    marginRight: 8,
  },
  changesText: {
    color: '#D68A3D',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D8F3DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#40916C',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveButton: {
    flex: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default EditProfile;