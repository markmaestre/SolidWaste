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
        console.log('❌ Push notification permission not granted');
        return;
      }
      
      // Get the token that identifies this device
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📱 Expo Push Token:', token);
      setPushToken(token);
      
    } catch (error) {
      console.log('❌ Error getting push token:', error);
    }
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    try {
      // Basic validation
      if (!form.email || !form.password) {
        Alert.alert('Validation Error', 'Please enter both email and password');
        return;
      }

      console.log('🔄 Attempting login...');
      console.log('📱 Using push token:', pushToken ? `${pushToken.substring(0, 20)}...` : 'Not available');
      
      const resultAction = await dispatch(loginUser({
        email: form.email,
        password: form.password,
        pushToken: pushToken
      }));
      
      // Check if the login was successful
      if (loginUser.fulfilled.match(resultAction)) {
        const { user, token } = resultAction.payload;
        
        console.log('✅ Login successful, token received:', token ? 'Yes' : 'No');
        console.log('📱 User push token after login:', user.pushToken ? `${user.pushToken.substring(0, 20)}...` : 'Not set');
        
        // Save token to AsyncStorage
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          console.log('💾 Token saved to AsyncStorage');
        } else {
          console.warn('⚠️ No token received from server');
        }

        // Save user info to AsyncStorage
        await AsyncStorage.setItem('userInfo', JSON.stringify(user));
        console.log('💾 User info saved to AsyncStorage');

        // Save push token to AsyncStorage if available
        if (pushToken) {
          await AsyncStorage.setItem('userPushToken', pushToken);
          console.log('💾 Push token saved to AsyncStorage');
        }

        // Navigate based on user role
        if (user.role === 'admin') {
          console.log('👑 Navigating to AdminDashboard');
          navigation.navigate('AdminDashboard');
        } else if (user.role === 'user') {
          console.log('👤 Navigating to UserDashboard');
          navigation.navigate('UserDashboard');
        } else {
          Alert.alert('Login failed', 'Invalid role assigned to user');
        }
      } else {
        // The error message is already in the state from the rejected action
        console.log('❌ Login failed:', resultAction.error);
      }
    } catch (err) {
      console.log('❌ Login Error:', err);
      Alert.alert('Error', 'An unexpected error occurred during login');
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToDashboard = () => {
    navigation.navigate('Dashboard');
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
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />
      
      <LinearGradient
        colors={['#0D47A1', '#1565C0', '#1976D2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative Elements */}
        <View style={styles.topCircle} />
        <View style={styles.bottomCircle} />
        
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
              <Image 
                source={require('../assets/T.M.F.K.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
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
                  <Ionicons name="notifications" size={16} color="#4CAF50" />
                  <Text style={styles.pushTokenText}>Push notifications enabled</Text>
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
                  <Text style={styles.errorText}>
                    {isBannedAccount ? `Account Suspended: ${error}` : error}
                  </Text>
                  {isBannedAccount && (
                    <Text style={styles.adminContactText}>
                      Please contact admin at: {ADMIN_EMAIL}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused
                ]}
                value={form.email}
                onChangeText={(val) => handleChange('email', val)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  style={[
                    styles.passwordInput,
                    focusedField === 'password' && styles.inputFocused
                  ]}
                  value={form.password}
                  secureTextEntry={!showPassword}
                  onChangeText={(val) => handleChange('password', val)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
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
                    color={focusedField === 'password' ? '#1976D2' : '#64748B'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#64B5F6', '#64B5F6'] : ['#1E88E5', '#1565C0']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'SIGNING IN...' : 'SIGN IN'}
                </Text>
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
              >
                <Text style={styles.registerLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>
              Creating sustainable communities together
            </Text>
            <Text style={styles.copyrightText}>
              © 2025 T.M.F.K. Waste Innovations. All rights reserved.
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
  },
  gradient: {
    flex: 1,
  },
  topCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -120,
    right: -80,
  },
  bottomCircle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -80,
    left: -60,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  underline: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
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
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#64748B',
    letterSpacing: 0.2,
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
    color: '#0369A1',
    marginLeft: 6,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  bannedAccountContainer: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#D97706',
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  adminContactText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
    fontWeight: '500',
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
    fontWeight: '500',
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 14,
    zIndex: 10,
    padding: 4,
  },
  inputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
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
    alignItems: 'center',
    paddingTop: 10,
  },
  registerText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  registerLink: {
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
  footerLine: {
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
});