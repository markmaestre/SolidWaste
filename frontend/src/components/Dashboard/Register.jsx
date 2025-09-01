import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Text, 
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, checkEmail } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const Register = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    bod: '',
    gender: '',
    address: '',
    role: 'user'
  });
  
  const [focusedField, setFocusedField] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector(state => state.auth);

  // Animation values
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const sliderWidth = useRef(new Animated.Value(0)).current;

  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
    { label: 'Prefer not to say', value: 'Prefer not to say' }
  ];

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    
    // Clear email error when user starts typing
    if (field === 'email' && emailError) {
      setEmailError('');
    }
  };

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if email is already registered
  const checkEmailAvailability = async (email) => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setIsCheckingEmail(true);
    try {
      const result = await dispatch(checkEmail(email));
      if (result?.payload?.exists) {
        setEmailError('This email is already registered. Please use a different email.');
        return false;
      }
      return true;
    } catch (err) {
      console.log('Email check error:', err);
      setEmailError('Error checking email availability. Please try again.');
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailBlur = async () => {
    setFocusedField(null);
    if (form.email) {
      await checkEmailAvailability(form.email);
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      handleChange('bod', formattedDate);
    }
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Select Birth Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const showGenderModal = () => {
    setShowGenderPicker(true);
  };

  const hideGenderModal = () => {
    setShowGenderPicker(false);
  };

  const selectGender = (value) => {
    handleChange('gender', value);
    setShowGenderPicker(false);
  };

  const getGenderDisplay = () => {
    return form.gender || 'Select Gender';
  };

  const handleRegisterClick = async () => {
    if (!form.username || !form.email || !form.password || !form.bod || !form.gender || !form.address) {
      Alert.alert('Incomplete Information', 'Please fill in all required fields.');
      return;
    }

    // Validate email format
    if (!validateEmail(form.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check if email is available
    const isEmailAvailable = await checkEmailAvailability(form.email);
    if (!isEmailAvailable) {
      return;
    }

    // Show verification modal instead of directly registering
    setShowVerificationModal(true);
    resetCaptcha();
  };

  const resetCaptcha = () => {
    setIsVerified(false);
    sliderWidth.setValue(0);
    checkmarkScale.setValue(0);
  };

  const handleCaptchaSuccess = () => {
    setCaptchaLoading(true);
    
    // Animate the slider
    Animated.timing(sliderWidth, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      // Show checkmark after slider completes
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start(() => {
        setCaptchaLoading(false);
        setIsVerified(true);
      });
    });
  };

  const handleVerificationSubmit = async () => {
    if (!isVerified) {
      Alert.alert('Verification Required', 'Please complete the human verification before creating your account.');
      return;
    }

    // If verification is successful, proceed with registration
    try {
      const res = await dispatch(registerUser(form));
      if (res?.payload === 'User registered successfully') {
        setShowVerificationModal(false);
        Alert.alert(
          'Registration Successful', 
          'Your WasteWise account has been created successfully. Please login to continue.',
          [
            {
              text: 'Continue to Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', 'Please verify your information and try again.');
      }
    } catch (err) {
      console.log('Register Error:', err);
      Alert.alert('Registration Error', 'An error occurred during registration. Please try again.');
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      
      <LinearGradient
        colors={['#0D47A1', '#1976D2', '#1E88E5']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>🌍</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the future of smart waste management</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#9E9E9E"
                style={[
                  styles.input,
                  focusedField === 'username' && styles.inputFocused
                ]}
                value={form.username}
                onChangeText={(val) => handleChange('username', val)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.emailLabelContainer}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                {isCheckingEmail && (
                  <Text style={styles.checkingText}>Checking...</Text>
                )}
              </View>
              <TextInput
                placeholder="Enter your email address"
                placeholderTextColor="#9E9E9E"
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                  emailError && styles.inputError
                ]}
                value={form.email}
                onChangeText={(val) => handleChange('email', val)}
                onFocus={() => setFocusedField('email')}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError ? (
                <View style={styles.emailErrorContainer}>
                  <Text style={styles.emailErrorIcon}>⚠️</Text>
                  <Text style={styles.emailErrorText}>{emailError}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <TextInput
                placeholder="Create a secure password"
                placeholderTextColor="#9E9E9E"
                style={[
                  styles.input,
                  focusedField === 'password' && styles.inputFocused
                ]}
                value={form.password}
                secureTextEntry
                onChangeText={(val) => handleChange('password', val)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth *</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dropdownButton,
                  focusedField === 'bod' && styles.inputFocused
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownContent}>
                  <View style={styles.dropdownLeft}>
                    <Text style={[
                      styles.dropdownText,
                      !form.bod && styles.placeholderText
                    ]}>
                      {formatDisplayDate(form.bod)}
                    </Text>
                  </View>
                  <Text style={styles.chevronIcon}>❯</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender *</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dropdownButton,
                  focusedField === 'gender' && styles.inputFocused
                ]}
                onPress={showGenderModal}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownContent}>
                  <View style={styles.dropdownLeft}>
                    <Text style={[
                      styles.dropdownText,
                      !form.gender && styles.placeholderText
                    ]}>
                      {getGenderDisplay()}
                    </Text>
                  </View>
                  <Text style={styles.chevronIcon}>❯</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                placeholder="Enter your complete address"
                placeholderTextColor="#9E9E9E"
                style={[
                  styles.input,
                  styles.textArea,
                  focusedField === 'address' && styles.inputFocused
                ]}
                value={form.address}
                onChangeText={(val) => handleChange('address', val)}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.registerButton,
                (loading || isCheckingEmail) && styles.registerButtonDisabled
              ]}
              onPress={handleRegisterClick}
              disabled={loading || isCheckingEmail}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={(loading || isCheckingEmail) ? ['#64B5F6', '#64B5F6'] : ['#42A5F5', '#1976D2']}
                style={styles.buttonGradient}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity 
                onPress={navigateToLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1950, 0, 1)}
        />
      )}

      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={styles.backdropTouchable} 
            onPress={() => setShowGenderPicker(false)}
            activeOpacity={1}
          />
        </View>
        
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            <TouchableOpacity
              onPress={() => setShowGenderPicker(false)}
              style={styles.modalCloseButton}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
            {genderOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionItem,
                  form.gender === option.value && styles.selectedOption
                ]}
                onPress={() => selectGender(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionText,
                    form.gender === option.value && styles.selectedOptionText
                  ]}>
                    {option.label}
                  </Text>
                </View>
                {form.gender === option.value && (
                  <View style={styles.checkmarkContainer}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.verificationModalContainer}>
            <View style={styles.verificationModalContent}>
              <Text style={styles.verificationModalTitle}>Human Verification</Text>
              <Text style={styles.verificationModalSubtitle}>
                Please verify you're not a robot to create your account
              </Text>

              <View style={styles.captchaContainer}>
                {!isVerified ? (
                  <>
                    <View style={styles.captchaInstruction}>
                      <Text style={styles.captchaInstructionText}>
                        Slide to complete verification
                      </Text>
                    </View>
                    
                    <View style={styles.sliderContainer}>
                      <Animated.View 
                        style={[
                          styles.sliderTrack,
                          {
                            width: sliderWidth.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%']
                            })
                          }
                        ]}
                      />
                      <TouchableOpacity
                        style={styles.sliderThumb}
                        onPressIn={handleCaptchaSuccess}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.sliderIcon}>→</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {captchaLoading && (
                      <View style={styles.captchaLoading}>
                        <Text style={styles.captchaLoadingText}>Verifying...</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.verificationSuccess}>
                    <Animated.View 
                      style={[
                        styles.checkmarkContainer,
                        { transform: [{ scale: checkmarkScale }] }
                      ]}
                    >
                      <Text style={styles.checkmark}>✓</Text>
                    </Animated.View>
                    <Text style={styles.verificationSuccessText}>
                      Verification Complete!
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.verificationButtons}>
                <TouchableOpacity
                  style={styles.verificationCancelButton}
                  onPress={() => {
                    setShowVerificationModal(false);
                    resetCaptcha();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.verificationCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.verificationSubmitButton,
                    !isVerified && styles.verificationSubmitButtonDisabled
                  ]}
                  onPress={handleVerificationSubmit}
                  disabled={!isVerified}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={!isVerified ? ['#BBDEFB', '#90CAF9'] : ['#42A5F5', '#1976D2']}
                    style={styles.verificationButtonGradient}
                  >
                    <Text style={styles.verificationSubmitText}>
                      {isVerified ? 'Create Account' : 'Complete Verification First'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '400',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  emailLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkingText: {
    fontSize: 12,
    color: '#1976D2',
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#333333',
    fontWeight: '400',
  },
  inputFocused: {
    borderColor: '#42A5F5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#42A5F5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#F44336',
  },
  textArea: {
    height: 80,
    paddingTop: 16,
  },
  dropdownButton: {
    justifyContent: 'center',
    paddingVertical: 0,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
    flex: 1,
  },
  placeholderText: {
    color: '#9E9E9E',
  },
  chevronIcon: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 8,
    transform: [{ rotate: '90deg' }],
  },
  emailErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  emailErrorIcon: {
    marginRight: 6,
  },
  emailErrorText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
  },
  loginLink: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.6,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  optionsList: {
    paddingTop: 8,
  },
  
    optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  selectedOption: {
    backgroundColor: '#E3F2FD',
    borderBottomColor: '#BBDEFB',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingLeft: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Verification Modal Styles
  verificationModalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  verificationModalContent: {
    alignItems: 'center',
  },
  verificationModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  verificationModalSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  // CAPTCHA Styles
  captchaContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  captchaInstruction: {
    marginBottom: 16,
  },
  captchaInstructionText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  sliderContainer: {
    width: '100%',
    height: 50,
    backgroundColor: '#E9ECEF',
    borderRadius: 25,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  sliderTrack: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 25,
  },
  sliderThumb: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  sliderIcon: {
    fontSize: 20,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  captchaLoading: {
    marginTop: 12,
  },
  captchaLoadingText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  verificationSuccess: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  verificationSuccessText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  verificationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  verificationCancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationCancelText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationSubmitButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  verificationSubmitButtonDisabled: {
    opacity: 0.6,
  },
  verificationButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});