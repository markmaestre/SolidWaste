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
  Easing,
  Image,
  PanResponder
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, checkEmail } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
  const [validationMessage, setValidationMessage] = useState('Slide to verify');
  const [fieldErrors, setFieldErrors] = useState({
    username: '',
    email: '',
    password: '',
    bod: '',
    gender: '',
    address: ''
  });
  
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector(state => state.auth);

  // Animation values
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const sliderWidth = useRef(new Animated.Value(0)).current;
  const sliderPosition = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Slider validation
  const SLIDER_MIN_VALID_POSITION = width * 0.6;
  const sliderMaxPosition = width - 120;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx, sliderMaxPosition));
        
        sliderPosition.setValue(newX);
        sliderWidth.setValue(newX / sliderMaxPosition);
        
        const progress = (newX / sliderMaxPosition) * 100;
        if (progress < 30) {
          setValidationMessage('Slide to verify');
        } else if (progress < 60) {
          setValidationMessage('Keep going...');
        } else if (progress < 80) {
          setValidationMessage('Almost there...');
        } else {
          setValidationMessage('Release to verify');
        }
        
        if (newX > 10) {
          iconOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const finalX = gestureState.dx;
        
        if (finalX >= SLIDER_MIN_VALID_POSITION) {
          handleCaptchaSuccess();
        } else {
          resetSlider();
          setValidationMessage('Slide further to verify');
        }
      },
    })
  ).current;

  const resetSlider = () => {
    Animated.parallel([
      Animated.timing(sliderPosition, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(sliderWidth, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const validateField = (field, value) => {
    let error = '';
    
    switch (field) {
      case 'username':
        if (!value.trim()) {
          error = 'Full name is required';
        } else if (value.trim().length < 2) {
          error = 'Full name must be at least 2 characters';
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (!validateEmail(value)) {
          error = 'Please enter a valid email address';
        }
        break;
        
      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 6) {
          error = 'Password must be at least 6 characters';
        }
        break;
        
      case 'bod':
        if (!value) {
          error = 'Date of birth is required';
        }
        break;
        
      case 'gender':
        if (!value) {
          error = 'Gender is required';
        }
        break;
        
      case 'address':
        if (!value.trim()) {
          error = 'Address is required';
        } else if (value.trim().length < 10) {
          error = 'Please enter a complete address';
        }
        break;
        
      default:
        break;
    }
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
    
    return !error;
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    
    if (field === 'email' && emailError) {
      setEmailError('');
    }
  };

  const handleBlur = (field, value) => {
    setFocusedField(null);
    validateField(field, value);
    
    if (field === 'email' && value) {
      checkEmailAvailability(value);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
        setFieldErrors(prev => ({
          ...prev,
          email: 'This email is already registered'
        }));
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

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      handleChange('bod', formattedDate);
      validateField('bod', formattedDate);
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
    validateField('gender', value);
    setShowGenderPicker(false);
  };

  const getGenderDisplay = () => {
    return form.gender || 'Select Gender';
  };

  const validateAllFields = () => {
    const fields = ['username', 'email', 'password', 'bod', 'gender', 'address'];
    let isValid = true;
    
    fields.forEach(field => {
      if (!validateField(field, form[field])) {
        isValid = false;
      }
    });
    
    return isValid;
  };

  const handleRegisterClick = async () => {
    // Validate all fields first
    if (!validateAllFields()) {
      Alert.alert('Incomplete Information', 'Please fill in all required fields correctly.');
      return;
    }

    if (!validateEmail(form.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    const isEmailAvailable = await checkEmailAvailability(form.email);
    if (!isEmailAvailable) {
      return;
    }

    setShowVerificationModal(true);
    resetCaptcha();
  };

  const resetCaptcha = () => {
    setIsVerified(false);
    setValidationMessage('Slide to verify');
    resetSlider();
    checkmarkScale.setValue(0);
  };

  const handleCaptchaSuccess = () => {
    setCaptchaLoading(true);
    setValidationMessage('Verifying...');
    
    Animated.timing(sliderWidth, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      Animated.spring(checkmarkScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start(() => {
        setCaptchaLoading(false);
        setIsVerified(true);
        setValidationMessage('Verification complete!');
      });
    });
  };

  const handleVerificationSubmit = async () => {
    if (!isVerified) {
      Alert.alert('Verification Required', 'Please complete the human verification before creating your account.');
      return;
    }

    try {
      const res = await dispatch(registerUser(form));
      if (res?.payload === 'User registered successfully') {
        setShowVerificationModal(false);
        Alert.alert(
          'Registration Successful', 
          'Your T.M.F.K. Waste Innovations account has been created successfully. Please login to continue.',
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

  const genderOptions = [
    { label: 'Male', value: 'Male', icon: 'male' },
    { label: 'Female', value: 'Female', icon: 'female' },
    { label: 'Other', value: 'Other', icon: 'transgender' },
    { label: 'Prefer not to say', value: 'Prefer not to say', icon: 'visibility-off' }
  ];

  const getInputStyle = (field) => {
    const hasError = fieldErrors[field];
    const isFocused = focusedField === field;
    
    if (hasError) {
      return [styles.input, styles.inputError];
    }
    if (isFocused) {
      return [styles.input, styles.inputFocused];
    }
    return styles.input;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0284C7" />
      
      <LinearGradient
        colors={['#0284C7', '#38BDF8', '#BAE6FD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Background Elements */}
        <Animated.View style={[styles.floatingCircle1, { opacity: fadeAnim }]} />
        <Animated.View style={[styles.floatingCircle2, { opacity: fadeAnim }]} />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Image 
                  source={require('../assets/T.M.F.K.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>Join T.M.F.K. Waste Innovations</Text>
            <Text style={styles.subtitle}>Create your account and start your eco-friendly journey</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>Fill in all required fields</Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formFields}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="person" size={16} color="#475569" />
                  <Text style={styles.inputLabel}>FULL NAME *</Text>
                </View>
                <TextInput
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  style={getInputStyle('username')}
                  value={form.username}
                  onChangeText={(val) => handleChange('username', val)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => handleBlur('username', form.username)}
                  autoCapitalize="words"
                />
                {fieldErrors.username ? (
                  <View style={styles.errorContainer}>
                    <Icon name="error" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{fieldErrors.username}</Text>
                  </View>
                ) : null}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="email" size={16} color="#475569" />
                  <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
                  {isCheckingEmail && (
                    <View style={styles.checkingContainer}>
                      <Icon name="autorenew" size={14} color="#0284C7" />
                      <Text style={styles.checkingText}>Checking...</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  placeholder="your@email.com"
                  placeholderTextColor="#94A3B8"
                  style={getInputStyle('email')}
                  value={form.email}
                  onChangeText={(val) => handleChange('email', val)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => handleBlur('email', form.email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {(fieldErrors.email || emailError) ? (
                  <View style={styles.errorContainer}>
                    <Icon name="error" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{fieldErrors.email || emailError}</Text>
                  </View>
                ) : null}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="lock" size={16} color="#475569" />
                  <Text style={styles.inputLabel}>PASSWORD *</Text>
                </View>
                <TextInput
                  placeholder="Create a secure password"
                  placeholderTextColor="#94A3B8"
                  style={getInputStyle('password')}
                  value={form.password}
                  secureTextEntry
                  onChangeText={(val) => handleChange('password', val)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => handleBlur('password', form.password)}
                  autoCapitalize="none"
                />
                {fieldErrors.password ? (
                  <View style={styles.errorContainer}>
                    <Icon name="error" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{fieldErrors.password}</Text>
                  </View>
                ) : null}
              </View>

              {/* Date of Birth & Gender Row */}
              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <View style={styles.inputLabelContainer}>
                    <Icon name="" size={16} color="#475569" />
                    <Text style={styles.inputLabel}>DATE OF BIRTH *</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.selectInput,
                      fieldErrors.bod ? styles.inputError : 
                      focusedField === 'bod' ? styles.inputFocused : null
                    ]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.selectText,
                      !form.bod && styles.placeholderText
                    ]}>
                      {form.bod ? formatDisplayDate(form.bod) : 'Select Date'}
                    </Text>
                    <Icon name="calendar-today" size={18} color="#64748B" />
                  </TouchableOpacity>
                  {fieldErrors.bod ? (
                    <View style={styles.errorContainer}>
                      <Icon name="error" size={14} color="#DC2626" />
                      <Text style={styles.errorText}>{fieldErrors.bod}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.inputGroup, styles.halfInput]}>
                  <View style={styles.inputLabelContainer}>
                    <Icon name="" size={16} color="#475569" />
                    <Text style={styles.inputLabel}>GENDER *</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.selectInput,
                      fieldErrors.gender ? styles.inputError : 
                      focusedField === 'gender' ? styles.inputFocused : null
                    ]}
                    onPress={showGenderModal}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.selectText,
                      !form.gender && styles.placeholderText
                    ]}>
                      {getGenderDisplay()}
                    </Text>
                    <Icon name="arrow-drop-down" size={20} color="#64748B" />
                  </TouchableOpacity>
                  {fieldErrors.gender ? (
                    <View style={styles.errorContainer}>
                      <Icon name="error" size={14} color="#DC2626" />
                      <Text style={styles.errorText}>{fieldErrors.gender}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelContainer}>
                  <Icon name="home" size={16} color="#475569" />
                  <Text style={styles.inputLabel}>ADDRESS *</Text>
                </View>
                <TextInput
                  placeholder="Enter your complete address"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.input,
                    styles.textArea,
                    fieldErrors.address ? styles.inputError : 
                    focusedField === 'address' ? styles.inputFocused : null
                  ]}
                  value={form.address}
                  onChangeText={(val) => handleChange('address', val)}
                  onFocus={() => setFocusedField('address')}
                  onBlur={() => handleBlur('address', form.address)}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {fieldErrors.address ? (
                  <View style={styles.errorContainer}>
                    <Icon name="error" size={14} color="#DC2626" />
                    <Text style={styles.errorText}>{fieldErrors.address}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Required Fields Note */}
            <View style={styles.requiredNote}>
              <Text style={styles.requiredText}>* Required fields</Text>
            </View>

            {/* General Error */}
            {error && (
              <View style={styles.generalError}>
                <Icon name="warning" size={18} color="#DC2626" />
                <Text style={styles.generalErrorText}>{error}</Text>
              </View>
            )}

            {/* Register Button */}
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
                colors={(loading || isCheckingEmail) ? ['#93C5FD', '#93C5FD'] : ['#0284C7', '#0369A1']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <View style={styles.loadingContent}>
                    <Icon name="autorenew" size={20} color="#FFFFFF" style={styles.loadingIcon} />
                    <Text style={styles.registerButtonText}>CREATING ACCOUNT...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Icon name="person-add" size={20} color="#FFFFFF" />
                    <Text style={styles.registerButtonText}>CREATE ACCOUNT</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity 
                onPress={navigateToLogin}
                activeOpacity={0.7}
                style={styles.loginButton}
              >
                <Text style={styles.loginLink}>Sign In</Text>
                <Icon name="arrow-forward" size={16} color="#0284C7" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Date Picker */}
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

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={hideGenderModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.genderModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={hideGenderModal} style={styles.closeButton}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.genderOptions}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderOption,
                    form.gender === option.value && styles.genderOptionSelected
                  ]}
                  onPress={() => selectGender(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.genderOptionContent}>
                    <Icon 
                      name={option.icon} 
                      size={20} 
                      color={form.gender === option.value ? '#0284C7' : '#64748B'} 
                    />
                    <Text style={[
                      styles.genderOptionText,
                      form.gender === option.value && styles.genderOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </View>
                  {form.gender === option.value && (
                    <Icon name="check-circle" size={20} color="#0284C7" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={styles.verificationOverlay}>
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <View style={styles.verificationIcon}>
                <Icon name="security" size={28} color="#0284C7" />
              </View>
              <Text style={styles.verificationTitle}>Human Verification</Text>
              <Text style={styles.verificationSubtitle}>
                Please verify you're not a robot to continue
              </Text>
            </View>

            <View style={styles.captchaContainer}>
              {!isVerified ? (
                <>
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                      <Animated.View 
                        style={[
                          styles.sliderProgress,
                          { width: sliderWidth.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%']
                          })}
                        ]}
                      />
                    </View>
                    
                    <Animated.View 
                      style={[
                        styles.sliderHandle,
                        { transform: [{ translateX: sliderPosition }] }
                      ]}
                      {...panResponder.panHandlers}
                    >
                      <Animated.View style={{ opacity: iconOpacity }}>
                        <Icon name="double-arrow" size={20} color="#0284C7" />
                      </Animated.View>
                    </Animated.View>
                    
                    <Text style={styles.sliderText}>{validationMessage}</Text>
                  </View>
                  
                  {captchaLoading && (
                    <View style={styles.loadingState}>
                      <Icon name="autorenew" size={20} color="#0284C7" style={styles.spinningIcon} />
                      <Text style={styles.verifyingText}>Verifying...</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.verifiedState}>
                  <Animated.View 
                    style={[
                      styles.verifiedIcon,
                      { transform: [{ scale: checkmarkScale }] }
                    ]}
                  >
                    <Icon name="check" size={32} color="#FFFFFF" />
                  </Animated.View>
                  <Text style={styles.verifiedTitle}>Verified!</Text>
                  <Text style={styles.verifiedText}>You're all set to continue</Text>
                </View>
              )}
            </View>

            <View style={styles.verificationActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowVerificationModal(false);
                  resetCaptcha();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !isVerified && styles.confirmButtonDisabled
                ]}
                onPress={handleVerificationSubmit}
                disabled={!isVerified}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={!isVerified ? ['#CBD5E1', '#94A3B8'] : ['#0284C7', '#0369A1']}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>
                    Continue
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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
    backgroundColor: '#0284C7',
  },
  gradient: {
    flex: 1,
  },
  floatingCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: '10%',
    left: -50,
  },
  floatingCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: '20%',
    right: -30,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  formHeader: {
    marginBottom: 28,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  formFields: {
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.5,
  },
  checkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  checkingText: {
    fontSize: 12,
    color: '#0284C7',
    fontStyle: 'italic',
  },
  input: {
    height: 52,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  textArea: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 16,
  },
  requiredNote: {
    marginBottom: 16,
  },
  requiredText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  generalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  generalErrorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingIcon: {
    transform: [{ rotate: '0deg' }],
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginText: {
    fontSize: 15,
    color: '#64748B',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loginLink: {
    fontSize: 15,
    color: '#0284C7',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Gender Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  genderModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: height * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptions: {
    padding: 16,
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  genderOptionSelected: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  genderOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genderOptionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  genderOptionTextSelected: {
    color: '#0284C7',
    fontWeight: '600',
  },

  // Verification Modal Styles
  verificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verificationIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  captchaContainer: {
    marginBottom: 24,
  },
  sliderContainer: {
    position: 'relative',
    height: 60,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderProgress: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 4,
  },
  sliderHandle: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    left: 0,
  },
  sliderText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  spinningIcon: {
    transform: [{ rotate: '0deg' }],
  },
  verifyingText: {
    fontSize: 14,
    color: '#0284C7',
    fontStyle: 'italic',
  },
  verifiedState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  verifiedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifiedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  verifiedText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  verificationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});