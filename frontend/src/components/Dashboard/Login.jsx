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
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.auth);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      <LinearGradient
        colors={['#1976D2', '#1E88E5', '#42A5F5']}
        style={styles.gradient}
      >
        {/* Home Icon in Top Right */}
        <TouchableOpacity 
          style={styles.homeIcon}
          onPress={navigateToDashboard}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.logo}>🌍</Text>
            <Text style={styles.title}>WasteWise</Text>
            <Text style={styles.subtitle}>Building Cleaner Communities</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor="#90CAF9"
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
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#90CAF9"
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

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

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
                colors={loading ? ['#64B5F6', '#64B5F6'] : ['#42A5F5', '#1976D2']}
                style={styles.buttonGradient}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? '♻️ Logging in...' : 'Login'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity 
                onPress={navigateToRegister}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLink}>Register here</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Creating sustainable communities together 
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
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  homeIcon: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    height: 55,
    borderWidth: 2,
    borderColor: '#BBDEFB',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
  },
  inputFocused: {
    borderColor: '#42A5F5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#42A5F5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#1976D2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#BBDEFB',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#64B5F6',
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  registerText: {
    fontSize: 16,
    color: '#666666',
    marginRight: 5,
  },
  registerLink: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#E3F2FD',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});