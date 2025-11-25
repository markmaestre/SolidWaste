import React, { useState, useEffect } from 'react';
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
  Image
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get('window');

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.auth);

  // Admin email for banned accounts
  const ADMIN_EMAIL = 'admin@tmfkwaste.com';

  // Get push token on component mount
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return;
      }
      
      // Get the token that identifies this device
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setPushToken(token);
      
    } catch (error) {
      // Silent error handling
    }
  };

  const validateField = (field, value) => {
    let error = '';
    
    switch (field) {
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
  };

  const handleBlur = (field, value) => {
    setFocusedField(null);
    validateField(field, value);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const validateAllFields = () => {
    const fields = ['email', 'password'];
    let isValid = true;
    
    fields.forEach(field => {
      if (!validateField(field, form[field])) {
        isValid = false;
      }
    });
    
    return isValid;
  };

  const handleLogin = async () => {
    try {
      // Validate all fields first
      if (!validateAllFields()) {
        Alert.alert('Validation Error', 'Please fill in all required fields correctly');
        return;
      }

      const resultAction = await dispatch(loginUser({
        email: form.email,
        password: form.password,
        pushToken: pushToken
      }));
      
      // Check if the login was successful
      if (loginUser.fulfilled.match(resultAction)) {
        const { user, token } = resultAction.payload;
        
        // Save token to AsyncStorage
        if (token) {
          await AsyncStorage.setItem('userToken', token);
        }

        // Save user info to AsyncStorage
        await AsyncStorage.setItem('userInfo', JSON.stringify(user));

        // Save push token to AsyncStorage if available
        if (pushToken) {
          await AsyncStorage.setItem('userPushToken', pushToken);
        }

        // Navigate based on user role
        if (user.role === 'admin') {
          navigation.navigate('AdminDashboard');
        } else if (user.role === 'user') {
          navigation.navigate('UserDashboard');
        } else {
          Alert.alert('Login failed', 'Invalid role assigned to user');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred during login');
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToDashboard = () => {
    navigation.navigate('Dashboard');
  };

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

  // Check if error indicates a banned account
  const isBannedAccount = error && (
    error.toLowerCase().includes('banned') || 
    error.toLowerCase().includes('suspended') ||
    error.toLowerCase().includes('disabled')
  );

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
        <View style={styles.floatingCircle1} />
        <View style={styles.floatingCircle2} />
        
        {/* Home Button */}
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={navigateToDashboard}
          activeOpacity={0.7}
        >
          <Text style={styles.homeButtonText}>HOME</Text>
        </TouchableOpacity>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Image 
                  source={require('../assets/T.M.F.K.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>T.M.F.K. Waste Innovations</Text>
            <Text style={styles.subtitle}>Building Cleaner Communities</Text>
            <View style={styles.underline} />
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtext}>Please sign in to continue</Text>
              {pushToken && (
                <View style={styles.pushTokenIndicator}>
                  
                </View>
              )}
            </View>
            
            {/* Error Message */}
            {error && (
              <View style={[
                styles.errorContainer,
                isBannedAccount && styles.bannedAccountContainer
              ]}>
                <View style={styles.errorTextContainer}>
                  <Ionicons 
                    name={isBannedAccount ? "warning" : "alert-circle"} 
                    size={18} 
                    color={isBannedAccount ? "#D97706" : "#DC2626"} 
                  />
                  <Text style={[
                    styles.errorText,
                    isBannedAccount && styles.bannedErrorText
                  ]}>
                    {isBannedAccount ? `Account Suspended: ${error}` : error}
                  </Text>
                </View>
                {isBannedAccount && (
                  <Text style={styles.adminContactText}>
                    Please contact admin at: {ADMIN_EMAIL}
                  </Text>
                )}
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="mail" size={16} color="#475569" />
                <Text style={styles.inputLabel}>EMAIL ADDRESS *</Text>
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
                autoCorrect={false}
              />
              {fieldErrors.email ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="close-circle" size={14} color="#DC2626" />
                  <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
                </View>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <Ionicons name="lock-closed" size={16} color="#475569" />
                <Text style={styles.inputLabel}>PASSWORD *</Text>
              </View>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.passwordInput,
                    fieldErrors.password ? styles.inputError : 
                    focusedField === 'password' ? styles.inputFocused : null
                  ]}
                  value={form.password}
                  secureTextEntry={!showPassword}
                  onChangeText={(val) => handleChange('password', val)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => handleBlur('password', form.password)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={toggleShowPassword}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color={focusedField === 'password' ? '#0284C7' : '#64748B'} 
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <View style={styles.fieldErrorContainer}>
                  <Ionicons name="close-circle" size={14} color="#DC2626" />
                  <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
                </View>
              ) : null}
            </View>

            {/* Required Fields Note */}
            <View style={styles.requiredNote}>
              <Text style={styles.requiredText}>* Required fields</Text>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={loading ? ['#93C5FD', '#93C5FD'] : ['#0284C7', '#0369A1']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <View style={styles.loadingContent}>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.loadingIcon} />
                    <Text style={styles.loginButtonText}>SIGNING IN...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="log-in" size={20} color="#FFFFFF" />
                    <Text style={styles.loginButtonText}>SIGN IN</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity 
                onPress={navigateToRegister}
                activeOpacity={0.7}
                style={styles.registerButton}
              >
                <Text style={styles.registerLink}>Create Account</Text>
                <Ionicons name="arrow-forward" size={16} color="#0284C7" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Creating sustainable communities together
            </Text>
            <Text style={styles.copyrightText}>
              © 2025 T.M.F.K. Waste Innovations
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default Login;

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
    right: -50,
  },
  floatingCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: '20%',
    left: -30,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  homeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 35,
    marginTop: 10,
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
  underline: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  formHeader: {
    marginBottom: 25,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  pushTokenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  pushTokenText: {
    fontSize: 12,
    color: '#0284C7',
    marginLeft: 6,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  bannedAccountContainer: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#D97706',
  },
  errorTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  bannedErrorText: {
    color: '#92400E',
  },
  adminContactText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 4,
  },
  fieldErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 16,
  },
  inputContainer: {
    marginBottom: 20,
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
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    height: 52,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontWeight: '500',
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 10,
    padding: 4,
  },
  requiredNote: {
    marginBottom: 16,
  },
  requiredText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  loginButton: {
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
  loginButtonDisabled: {
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
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 1,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerText: {
    fontSize: 15,
    color: '#64748B',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  registerLink: {
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
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});