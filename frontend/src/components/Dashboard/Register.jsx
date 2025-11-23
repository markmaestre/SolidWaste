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
  Image
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
    
    if (field === 'email' && emailError) {
      setEmailError('');
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
    sliderWidth.setValue(0);
    checkmarkScale.setValue(0);
  };

  const handleCaptchaSuccess = () => {
    setCaptchaLoading(true);
    
    Animated.timing(sliderWidth, {
      toValue: 1,
      duration: 1000,
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      
      <LinearGradient
        colors={['#0D47A1', '#1565C0', '#1976D2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative Background */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/T.M.F.K.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>T.M.F.K. Waste Innovations</Text>
            <Text style={styles.subtitle}>Join the future of smart waste management</Text>
            <View style={styles.headerLine} />
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Create Your Account</Text>
              <Text style={styles.formSubtitle}>Fill in your details to get started</Text>
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor="#94A3B8"
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

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                {isCheckingEmail && (
                  <Text style={styles.checkingText}>Checking...</Text>
                )}
              </View>
              <TextInput
                placeholder="Enter your email address"
                placeholderTextColor="#94A3B8"
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
                <View style={styles.errorMessage}>
                  <Text style={styles.errorMessageText}>{emailError}</Text>
                </View>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                placeholder="Create a secure password"
                placeholderTextColor="#94A3B8"
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

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DATE OF BIRTH</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.selectInput,
                  focusedField === 'bod' && styles.inputFocused
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.selectText,
                  !form.bod && styles.placeholderText
                ]}>
                  {formatDisplayDate(form.bod)}
                </Text>
                <Text style={styles.selectArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>GENDER</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  styles.selectInput,
                  focusedField === 'gender' && styles.inputFocused
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
                <Text style={styles.selectArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADDRESS</Text>
              <TextInput
                placeholder="Enter your complete address"
                placeholderTextColor="#94A3B8"
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

            {/* General Error */}
            {error && (
              <View style={styles.generalError}>
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
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={(loading || isCheckingEmail) ? ['#64B5F6', '#64B5F6'] : ['#1E88E5', '#1565C0']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.registerButtonText}>
                  {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity 
                onPress={navigateToLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>
              By creating an account, you agree to our Terms & Privacy Policy
            </Text>
            <Text style={styles.copyrightText}>
              © 2025 T.M.F.K. Waste Innovations. All rights reserved.
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
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderPicker(false)}
        />
        
        <View style={styles.genderModal}>
          <View style={styles.modalHandle} />
          
          <View style={styles.genderModalHeader}>
            <Text style={styles.genderModalTitle}>Select Gender</Text>
            <TouchableOpacity
              onPress={() => setShowGenderPicker(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.genderOptions}
            showsVerticalScrollIndicator={false}
          >
            {genderOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.genderOption,
                  form.gender === option.value && styles.genderOptionSelected
                ]}
                onPress={() => selectGender(option.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.genderOptionText,
                  form.gender === option.value && styles.genderOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {form.gender === option.value && (
                  <View style={styles.checkIcon}>
                    <Text style={styles.checkIconText}>✓</Text>
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
        <View style={styles.verificationOverlay}>
          <View style={styles.verificationCard}>
            <Text style={styles.verificationTitle}>Human Verification</Text>
            <Text style={styles.verificationSubtitle}>
              Please verify you're not a robot to create your account
            </Text>

            <View style={styles.captchaBox}>
              {!isVerified ? (
                <>
                  <Text style={styles.captchaInstruction}>
                    Slide to complete verification
                  </Text>
                  
                  <View style={styles.sliderBox}>
                    <Animated.View 
                      style={[
                        styles.sliderProgress,
                        {
                          width: sliderWidth.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%']
                          })
                        }
                      ]}
                    />
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPressIn={handleCaptchaSuccess}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.sliderButtonText}>→</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {captchaLoading && (
                    <Text style={styles.verifyingText}>Verifying...</Text>
                  )}
                </>
              ) : (
                <View style={styles.verifiedBox}>
                  <Animated.View 
                    style={[
                      styles.verifiedIcon,
                      { transform: [{ scale: checkmarkScale }] }
                    ]}
                  >
                    <Text style={styles.verifiedIconText}>✓</Text>
                  </Animated.View>
                  <Text style={styles.verifiedText}>
                    Verification Complete!
                  </Text>
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
                  styles.submitButton,
                  !isVerified && styles.submitButtonDisabled
                ]}
                onPress={handleVerificationSubmit}
                disabled={!isVerified}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={!isVerified ? ['#BBDEFB', '#90CAF9'] : ['#1E88E5', '#1565C0']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {isVerified ? 'Create Account' : 'Complete Verification'}
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
  },
  gradient: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: -120,
    left: -80,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    bottom: 100,
    right: -60,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  headerLine: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  formHeader: {
    marginBottom: 25,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#607D8B',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#455A64',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  checkingText: {
    fontSize: 12,
    color: '#1976D2',
    fontStyle: 'italic',
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#1976D2',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  inputError: {
    borderColor: '#E53935',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  selectArrow: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: 'bold',
  },
  textArea: {
    height: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  errorMessage: {
    marginTop: 6,
  },
  errorMessageText: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 16,
  },
  generalError: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  generalErrorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
    lineHeight: 18,
  },
  registerButton: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loginContainer: {
    alignItems: 'center',
    paddingTop: 10,
  },
  loginText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  loginLink: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  footerDivider: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  
  // Gender Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  genderModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  genderModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  genderModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '300',
  },
  genderOptions: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  genderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  genderOptionSelected: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#0EA5E9',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  genderOptionTextSelected: {
    color: '#0369A1',
    fontWeight: '600',
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  
  // Verification Modal Styles
  verificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  verificationCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0D47A1',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  captchaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captchaInstruction: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  sliderBox: {
    width: '100%',
    height: 52,
    backgroundColor: '#E2E8F0',
    borderRadius: 26,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  sliderProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#10B981',
    borderRadius: 26,
  },
  sliderButton: {
    position: 'absolute',
    left: 3,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderButtonText: {
    fontSize: 20,
    color: '#0EA5E9',
    fontWeight: 'bold',
  },
  verifyingText: {
    fontSize: 13,
    color: '#0EA5E9',
    fontWeight: '600',
    marginTop: 16,
    letterSpacing: 0.3,
  },
  verifiedBox: {
    alignItems: 'center',
  },
  verifiedIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  verifiedIconText: {
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  verifiedText: {
    fontSize: 16,
    color: '#065F46',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  verificationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  submitButton: {
    flex: 2,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0.1,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});