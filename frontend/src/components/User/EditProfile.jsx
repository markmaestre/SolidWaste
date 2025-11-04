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
import { styles } from '../../components/Styles/EditProfile';

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
      {/* Header - Changed to Sky Blue */}
      <LinearGradient
        colors={['#0284C7', '#0EA5E9', '#38BDF8']}
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
                    colors={['#7DD3FC', '#38BDF8']}
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
                  placeholderTextColor="#7DD3FC"
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
                  placeholderTextColor="#7DD3FC"
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
                  placeholderTextColor="#7DD3FC"
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
                  placeholderTextColor="#7DD3FC"
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
                  placeholderTextColor="#7DD3FC"
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
                    ? ['#BAE6FD', '#BAE6FD'] 
                    : ['#0284C7', '#0EA5E9']
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

export default EditProfile;