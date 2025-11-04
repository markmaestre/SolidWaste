import React, { useState } from 'react';
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
  StatusBar
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.auth);

  // Admin email for banned accounts
  const ADMIN_EMAIL = 'admin@wastewise.com';

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async () => {
    try {
      const resultAction = await dispatch(loginUser(form));
      
      // Check if the login was successful
      if (loginUser.fulfilled.match(resultAction)) {
        const user = resultAction.payload.user;
        
        if (user.role === 'admin') {
          navigation.navigate('AdminDashboard');
        } else if (user.role === 'user') {
          navigation.navigate('UserDashboard');
        } else {
          Alert.alert('Login failed', 'Invalid role assigned to user');
        }
      } else {
        // The error message is already in the state from the rejected action
        console.log('Login failed:', resultAction.error);
      }
    } catch (err) {
      console.log('Login Error:', err);
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
              <View style={styles.logoBox}>
                <Text style={styles.logoLetter}>W</Text>
              </View>
            </View>
            <Text style={styles.title}>WasteWise</Text>
            <Text style={styles.subtitle}>Building Cleaner Communities</Text>
            <View style={styles.underline} />
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtext}>Please sign in to continue</Text>
            </View>
            
            {/* Error Message */}
            {error && (
              <View style={[
                styles.errorContainer,
                isBannedAccount && styles.bannedAccountContainer
              ]}>
                <View style={[
                  styles.errorDot,
                  isBannedAccount && styles.bannedAccountDot
                ]} />
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
                placeholderTextColor="#90A4AE"
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
                  placeholderTextColor="#90A4AE"
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
                    color={focusedField === 'password' ? '#1976D2' : '#607D8B'} 
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
              © 2025 WasteWise. All rights reserved.
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
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -100,
    right: -50,
  },
  bottomCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -50,
    left: -50,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
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
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  logoLetter: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0D47A1',
  },
  title: {
    fontSize: 38,
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
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  underline: {
    width: 70,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 2,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 15,
  },
  formHeader: {
    marginBottom: 28,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: '#607D8B',
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#E53935',
  },
  bannedAccountContainer: {
    backgroundColor: '#FFF3E0',
    borderLeftColor: '#FF9800',
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
    marginRight: 12,
    marginTop: 6,
  },
  bannedAccountDot: {
    backgroundColor: '#FF9800',
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  adminContactText: {
    color: '#E65100',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#455A64',
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    color: '#263238',
    fontWeight: '500',
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    height: 56,
    borderWidth: 2,
    borderColor: '#CFD8DC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 50, // Space for the eye icon
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    color: '#263238',
    fontWeight: '500',
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 4,
  },
  inputFocused: {
    borderColor: '#1976D2',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: '#9E9E9E',
    fontWeight: '600',
    letterSpacing: 1,
  },
  registerContainer: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 15,
    color: '#607D8B',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  registerLink: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 10,
  },
  footerLine: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    marginBottom: 14,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  copyrightText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});