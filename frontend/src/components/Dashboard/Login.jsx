// screens/Login.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Alert,
  Text, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, Image, Animated, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { 
  loginUser, 
  googleEmailLogin, 
  verifyGoogleEmail, 
  resendGoogleEmailCode 
} from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import Svg, { Path, G, ClipPath, Rect, Defs } from 'react-native-svg';

// ============================================================
// DISABLE LOGS
// ============================================================

const noop = () => {};
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;

// ============================================================
// CONSTANTS & STYLES
// ============================================================

const { width } = Dimensions.get('window');

const C = {
  ink:      '#071B2E',
  navy:     '#0A2540',
  navyMid:  '#103559',
  teal:     '#00C9A7',
  tealDark: '#009E84',
  tealDim:  'rgba(0,201,167,0.13)',
  tealGlow: 'rgba(0,201,167,0.22)',
  tealLine: 'rgba(0,201,167,0.35)',
  white:    '#FFFFFF',
  offWhite: '#F7FAFB',
  border:   '#D8E4EE',
  borderDk: 'rgba(255,255,255,0.09)',
  slate:    '#4E6B87',
  slateL:   '#8BA5BC',
  ghost:    'rgba(255,255,255,0.55)',
  red:      '#EF4444',
};

// ============================================================
// OFFLINE BANNER
// ============================================================

const OfflineBanner = ({ visible }) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: visible ? 0 : -80,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      style={[s.offlineBanner, { transform: [{ translateY }], opacity }]}
      pointerEvents="none"
    >
      <Ionicons name="wifi-outline" size={15} color="#92400E" style={{ opacity: 0.85 }} />
      <View style={s.offlineTextWrap}>
        <Text style={s.offlineTitle}>No Connection</Text>
        <Text style={s.offlineSub}>Check your internet and try again</Text>
      </View>
      <View style={s.offlineDot} />
    </Animated.View>
  );
};

// ============================================================
// FADE IN ANIMATION
// ============================================================

const FadeIn = ({ children, delay = 0 }) => {
  const opacity    = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ============================================================
// GOOGLE ICON SVG
// ============================================================

const GoogleIcon = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <ClipPath id="clip">
        <Rect width="48" height="48" rx="24" />
      </ClipPath>
    </Defs>
    <G clipPath="url(#clip)">
      <Path d="M47.532 24.552c0-1.636-.132-3.2-.388-4.688H24v9.02h13.196c-.576 3.036-2.296 5.608-4.876 7.332v6.1h7.888c4.616-4.252 7.324-10.52 7.324-17.764z" fill="#4285F4"/>
      <Path d="M24 48c6.636 0 12.204-2.196 16.272-5.952l-7.888-6.1c-2.196 1.468-5.004 2.34-8.384 2.34-6.444 0-11.9-4.352-13.852-10.192H2.056v6.3C6.112 42.824 14.436 48 24 48z" fill="#34A853"/>
      <Path d="M10.148 28.096A14.96 14.96 0 0 1 9.6 24c0-1.42.196-2.8.548-4.096v-6.3H2.056A23.964 23.964 0 0 0 0 24c0 3.876.932 7.54 2.056 10.396l8.092-6.3z" fill="#FBBC05"/>
      <Path d="M24 9.712c3.624 0 6.876 1.244 9.436 3.692l7.08-7.08C36.196 2.196 30.628 0 24 0 14.436 0 6.112 5.176 2.056 13.604l8.092 6.3C12.1 14.064 17.556 9.712 24 9.712z" fill="#EA4335"/>
    </G>
  </Svg>
);

// ============================================================
// LOGIN COMPONENT
// ============================================================

const Login = () => {
  const [form, setForm]                   = useState({ email: '', password: '' });
  const [focusedField, setFocusedField]   = useState(null);
  const [showPassword, setShowPassword]   = useState(false);
  const [pushToken, setPushToken]         = useState(null);
  const [fieldErrors, setFieldErrors]     = useState({ email: '', password: '' });
  const [isOffline, setIsOffline]         = useState(false);

  // Google Email Modal States
  const [showGoogleEmailModal, setShowGoogleEmailModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

  // OTP Verification States
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);

  const dispatch   = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.auth);

  const ADMIN_EMAIL = 'admin@tmfkwaste.com';

  // ============================================================
  // NETWORK MONITORING
  // ============================================================

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;

    const setupNetInfo = async () => {
      try {
        const state = await NetInfo.fetch().catch(() => ({ isConnected: true }));
        if (isMounted) setIsOffline(!state.isConnected);
        try {
          unsubscribe = NetInfo.addEventListener((state) => {
            if (isMounted) setIsOffline(!state.isConnected);
          });
        } catch {
          if (isMounted) setIsOffline(false);
        }
      } catch {
        if (isMounted) setIsOffline(false);
      }
    };

    setupNetInfo();
    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        try { unsubscribe(); } catch {}
      }
    };
  }, []);

  // ============================================================
  // PUSH NOTIFICATIONS
  // ============================================================

  useEffect(() => {
    let isMounted = true;
    const registerForPushNotifications = async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        const { status } = existing !== 'granted'
          ? await Notifications.requestPermissionsAsync()
          : { status: existing };
        if (status !== 'granted') return;
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (isMounted) setPushToken(token);
      } catch {}
    };
    registerForPushNotifications();
    return () => { isMounted = false; };
  }, []);

  // ============================================================
  // RESEND TIMER
  // ============================================================

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ============================================================
  // VALIDATION FUNCTIONS
  // ============================================================

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validateField = (field, value) => {
    let err = '';
    if (field === 'email') {
      if (!value.trim())              err = 'Email is required';
      else if (!validateEmail(value)) err = 'Please enter a valid email address';
    }
    if (field === 'password') {
      if (!value)                err = 'Password is required';
      else if (value.length < 6) err = 'Password must be at least 6 characters';
    }
    setFieldErrors((p) => ({ ...p, [field]: err }));
    return !err;
  };

  const validateAll = () =>
    ['email', 'password'].map((f) => validateField(f, form[f])).every(Boolean);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((p) => ({ ...p, [field]: '' }));
  };

  // ============================================================
  // LOGIN HANDLERS
  // ============================================================

  const handleLoginSuccess = async ({ user, token }) => {
    try {
      if (token) await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      if (pushToken) await AsyncStorage.setItem('userPushToken', pushToken);
    } catch {}

    if (user.role === 'admin')     navigation.navigate('AdminDashboard');
    else if (user.role === 'user') navigation.navigate('UserDashboard');
    else Alert.alert('Login failed', 'Invalid role assigned to user');
  };

  const handleLogin = async () => {
    if (isOffline) {
      Alert.alert('No Connection', 'Please check your internet connection');
      return;
    }
    if (!validateAll()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly');
      return;
    }
    try {
      const resultAction = await dispatch(
        loginUser({ email: form.email, password: form.password, pushToken })
      ).unwrap();
      await handleLoginSuccess(resultAction);
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password');
    }
  };

  // ============================================================
  // GOOGLE EMAIL LOGIN - SHOW MODAL
  // ============================================================

  const handleGoogleEmailPress = () => {
    setShowGoogleEmailModal(true);
    setGoogleEmail('');
  };

  // ============================================================
  // GOOGLE EMAIL LOGIN - SEND OTP
  // ============================================================

  const handleSendCode = async () => {
    if (isOffline) {
      Alert.alert('No Connection', 'Please check your internet connection');
      return;
    }

    if (!googleEmail.trim()) {
      Alert.alert('Error', 'Please enter your Gmail address');
      return;
    }

    if (!validateEmail(googleEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!googleEmail.toLowerCase().endsWith('@gmail.com')) {
      Alert.alert('Error', 'Please use a Gmail address (@gmail.com)');
      return;
    }

    setIsSendingCode(true);

    try {
      await dispatch(googleEmailLogin({ email: googleEmail })).unwrap();

      // Close Google Email Modal
      setShowGoogleEmailModal(false);
      
      // Show OTP verification modal
      setShowVerificationModal(true);
      setVerificationCode('');
      setResendTimer(60);
      setCanResend(false);

      Alert.alert('Code Sent', `A verification code has been sent to ${googleEmail}`);

    } catch (error) {
      Alert.alert('Error', error || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // ============================================================
  // VERIFY OTP CODE
  // ============================================================

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await dispatch(verifyGoogleEmail({
        email: googleEmail,
        verificationCode
      })).unwrap();

      setShowVerificationModal(false);
      await handleLoginSuccess(result);

    } catch (error) {
      Alert.alert('Verification Failed', error || 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ============================================================
  // RESEND OTP CODE
  // ============================================================

  const handleResendCode = async () => {
    if (!canResend) return;
    if (!googleEmail) {
      Alert.alert('Error', 'Please enter your email address again');
      return;
    }

    setCanResend(false);
    setResendTimer(60);
    try {
      await dispatch(resendGoogleEmailCode({ email: googleEmail })).unwrap();
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
      setCanResend(true);
      setResendTimer(0);
    }
  };

  // ============================================================
  // STYLES
  // ============================================================

  const inputStyle = (field) => [
    s.input,
    focusedField === field && s.inputFocused,
    fieldErrors[field]    && s.inputError,
  ];

  const isBanned = error && typeof error === 'string' &&
    ['banned', 'suspended', 'disabled'].some((w) => error.toLowerCase().includes(w));

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />

      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <OfflineBanner visible={isOffline} />

        <View style={s.blob1} />
        <View style={s.blob2} />

        <TouchableOpacity
          style={s.homeBtn}
          onPress={() => navigation.navigate('Dashboard')}
          activeOpacity={0.8}
        >
          <Text style={s.homeBtnTxt}>HOME</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FadeIn delay={0}>
            <View style={s.header}>
              <View style={s.logoRing}>
                <Image
                  source={require('../assets/TMFK.png')}
                  style={s.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.brandName}>T.M.F.K</Text>
              <Text style={s.brandSub}>Waste Innovations</Text>
            </View>
          </FadeIn>

          <FadeIn delay={60}>
            <View style={s.badgeWrap}>
              <View style={s.badge}>
                <View style={s.badgeDot} />
                <Text style={s.badgeText}>Secure Login</Text>
              </View>
            </View>
          </FadeIn>

          <FadeIn delay={120}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Welcome Back</Text>
              <Text style={s.cardSub}>Sign in to your account to continue</Text>

              {error && typeof error === 'string' && (
                <View style={[s.errorBanner, isBanned && s.errorBannerWarn]}>
                  <Ionicons
                    name={isBanned ? 'warning' : 'alert-circle'}
                    size={16}
                    color={isBanned ? '#D97706' : C.red}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[s.errorText, isBanned && s.errorTextWarn]}>
                      {isBanned ? `Account Suspended: ${error}` : error}
                    </Text>
                    {isBanned && (
                      <Text style={s.errorContact}>Contact admin: {ADMIN_EMAIL}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* ============================================================
                  GOOGLE SIGN IN BUTTON - SIMPLE AND CLEAN
                  ============================================================ */}
              <TouchableOpacity
                style={[s.btnGoogle, (isSendingCode || isOffline) && { opacity: 0.55 }]}
                onPress={handleGoogleEmailPress}
                disabled={isSendingCode || isOffline}
                activeOpacity={0.82}
              >
                <View style={s.googleLogoWrap}>
                  <GoogleIcon size={22} />
                </View>
                <Text style={s.btnGoogleTxt}>Sign in with Google Email</Text>
              </TouchableOpacity>

              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerTxt}>or sign in with email & password</Text>
                <View style={s.dividerLine} />
              </View>

              <View style={s.fieldWrap}>
                <View style={s.fieldLabelRow}>
                  <Ionicons name="mail-outline" size={13} color={C.slateL} />
                  <Text style={s.fieldLabel}>Email Address <Text style={s.req}>*</Text></Text>
                </View>
                <TextInput
                  style={inputStyle('email')}
                  placeholder="your@email.com"
                  placeholderTextColor={C.slateL}
                  value={form.email}
                  onChangeText={(v) => handleChange('email', v)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => { setFocusedField(null); validateField('email', form.email); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {fieldErrors.email ? (
                  <View style={s.fieldErr}>
                    <Ionicons name="close-circle" size={13} color={C.red} />
                    <Text style={s.fieldErrTxt}>{fieldErrors.email}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.fieldWrap}>
                <View style={s.fieldLabelRow}>
                  <Ionicons name="lock-closed-outline" size={13} color={C.slateL} />
                  <Text style={s.fieldLabel}>Password <Text style={s.req}>*</Text></Text>
                </View>
                <View>
                  <TextInput
                    style={inputStyle('password')}
                    placeholder="Enter your password"
                    placeholderTextColor={C.slateL}
                    value={form.password}
                    secureTextEntry={!showPassword}
                    onChangeText={(v) => handleChange('password', v)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => { setFocusedField(null); validateField('password', form.password); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={s.eyeBtn}
                    onPress={() => setShowPassword((p) => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={C.slateL}
                    />
                  </TouchableOpacity>
                </View>
                {fieldErrors.password ? (
                  <View style={s.fieldErr}>
                    <Ionicons name="close-circle" size={13} color={C.red} />
                    <Text style={s.fieldErrTxt}>{fieldErrors.password}</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity 
                style={s.forgotWrap} 
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
                <Text style={s.forgotTxt}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btnPrimary, (loading || isOffline) && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading || isOffline}
                activeOpacity={0.85}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color={C.navy} />
                    <Text style={s.btnPrimaryTxt}>Signing In…</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.btnPrimaryTxt}>Sign In</Text>
                    <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              <View style={s.registerRow}>
                <Text style={s.registerTxt}>Don't have an account?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.7}
                  style={s.registerBtn}
                >
                  <Text style={s.registerLink}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={14} color={C.teal} />
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>

          <FadeIn delay={200}>
            <View style={s.footer}>
              <Text style={s.footerTxt}>Creating sustainable communities together</Text>
              <Text style={s.footerCopy}>© 2026 T.M.F.K. Waste Innovations</Text>
            </View>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ============================================================
          GOOGLE EMAIL INPUT MODAL
          ============================================================ */}
      <Modal 
        visible={showGoogleEmailModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowGoogleEmailModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconRing}>
              <Ionicons name="mail-outline" size={28} color={C.teal} />
            </View>
            <Text style={s.modalTitle}>Sign in with Google</Text>
            <Text style={s.modalSub}>
              Enter your Gmail address to receive a verification code
            </Text>

            <View style={s.fieldWrap}>
              <View style={s.fieldLabelRow}>
                <Ionicons name="mail-outline" size={13} color={C.slateL} />
                <Text style={s.fieldLabel}>Gmail Address <Text style={s.req}>*</Text></Text>
              </View>
              <TextInput
                style={[s.input, s.googleInput]}
                placeholder="your.email@gmail.com"
                placeholderTextColor={C.slateL}
                value={googleEmail}
                onChangeText={setGoogleEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[s.btnGoogle, s.btnSendCode, (isSendingCode || isOffline) && { opacity: 0.55 }]}
              onPress={handleSendCode}
              disabled={isSendingCode || isOffline}
              activeOpacity={0.82}
            >
              {isSendingCode ? (
                <>
                  <ActivityIndicator size="small" color={C.navy} />
                  <Text style={s.btnGoogleTxt}>Sending Code…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="arrow-forward-outline" size={18} color={C.navy} />
                  <Text style={s.btnGoogleTxt}>Send Verification Code</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => setShowGoogleEmailModal(false)}
              activeOpacity={0.7}
            >
              <Text style={s.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================
          OTP VERIFICATION MODAL
          ============================================================ */}
      <Modal 
        visible={showVerificationModal} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setShowVerificationModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.verifyCard}>
            <View style={s.verifyIconRing}>
              <Ionicons name="mail-outline" size={28} color={C.teal} />
            </View>
            <Text style={s.verifyTitle}>Email Verification</Text>
            <Text style={s.verifySub}>
              We've sent a 6-digit code to{'\n'}
              <Text style={{ color: C.teal, fontWeight: 'bold' }}>
                {googleEmail || 'your email'}
              </Text>
            </Text>
            <View style={s.verificationCodeInput}>
              <TextInput
                style={s.codeInput}
                placeholder="Enter 6-digit code"
                placeholderTextColor={C.slateL}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[s.verifyConfirm, isVerifying && { opacity: 0.5 }]}
              onPress={handleVerifyCode}
              disabled={isVerifying}
            >
              <Text style={s.verifyConfirmTxt}>
                {isVerifying ? 'Verifying...' : 'Verify & Continue'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.resendButton}
              onPress={handleResendCode}
              disabled={!canResend}
            >
              <Text style={[s.resendText, !canResend && { opacity: 0.5 }]}>
                {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.verifyCancel}
              onPress={() => { 
                setShowVerificationModal(false); 
                setVerificationCode('');
                setGoogleEmail('');
              }}
            >
              <Text style={s.verifyCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Login;

// ============================================================
// STYLESHEET
// ============================================================

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.ink },
  keyboardView:{ flex: 1 },

  offlineBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 28,
    left: 20, right: 20, zIndex: 50,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1, borderColor: '#FCD34D',
    borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 10,
  },
  offlineTextWrap: { flex: 1 },
  offlineTitle:    { fontSize: 13, fontWeight: '700', color: '#78350F', letterSpacing: 0.1 },
  offlineSub:      { fontSize: 11, color: '#92400E', marginTop: 1 },
  offlineDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F59E0B' },

  blob1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: C.tealGlow, top: -100, right: -130,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(0,201,167,0.06)', bottom: 160, left: -70,
  },

  homeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    right: 20, zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
  },
  homeBtnTxt: { color: C.white, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  scroll: {
    flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },

  header:    { alignItems: 'center', paddingTop: 80, marginBottom: 24 },
  logoRing:  {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoImg:   { width: 46, height: 46 },
  brandName: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: 1.5, marginBottom: 4 },
  brandSub:  { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 0.8, textTransform: 'uppercase' },

  badgeWrap: { alignItems: 'center', marginBottom: 20 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.tealDim, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 14,
  },
  badgeDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  badgeText: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 1, textTransform: 'uppercase' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.borderDk,
    borderRadius: 22, padding: 28,
  },
  cardTitle: { fontSize: 24, fontWeight: '900', color: C.white, letterSpacing: -0.4, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: C.ghost, marginBottom: 24 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderLeftWidth: 3, borderLeftColor: C.red,
    borderRadius: 10, padding: 14, marginBottom: 18,
  },
  errorBannerWarn: { backgroundColor: 'rgba(217,119,6,0.12)', borderLeftColor: '#D97706' },
  errorText:       { fontSize: 13, color: C.red, fontWeight: '600' },
  errorTextWarn:   { color: '#D97706' },
  errorContact:    { fontSize: 12, color: '#D97706', marginTop: 3 },

  // ============================================================
  // GOOGLE BUTTON STYLES
  // ============================================================
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    height: 56,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  googleLogoWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGoogleTxt: {
    color: '#3C4043',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // ============================================================
  // MODAL STYLES
  // ============================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: C.navy,
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: C.borderDk,
    alignItems: 'center',
  },
  modalIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.tealDim,
    borderWidth: 1,
    borderColor: C.tealLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.white,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: C.ghost,
    textAlign: 'center',
    marginBottom: 24,
  },
  googleInput: {
    borderColor: C.tealLine,
    backgroundColor: 'rgba(0,201,167,0.05)',
  },
  btnSendCode: {
    width: '100%',
    backgroundColor: C.teal,
    marginBottom: 12,
    borderWidth: 0,
    height: 50,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalCancelTxt: {
    color: C.ghost,
    fontSize: 14,
    fontWeight: '600',
  },

  // ============================================================
  // DIVIDER
  // ============================================================
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerTxt:  { fontSize: 11, color: C.slateL, fontWeight: '600' },

  // ============================================================
  // FORM STYLES
  // ============================================================
  fieldWrap:     { marginBottom: 18, width: '100%' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  fieldLabel:    { fontSize: 11, fontWeight: '700', color: C.slateL, letterSpacing: 0.5, textTransform: 'uppercase' },
  req:           { color: C.teal },

  input: {
    height: 50, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: C.borderDk,
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 15, color: C.white,
  },
  inputFocused: { borderColor: C.tealLine, backgroundColor: 'rgba(0,201,167,0.07)' },
  inputError:   { borderColor: C.red, backgroundColor: 'rgba(239,68,68,0.08)' },

  eyeBtn: { position: 'absolute', right: 14, top: 14 },

  fieldErr:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  fieldErrTxt: { fontSize: 12, color: C.red },

  forgotWrap: { alignItems: 'flex-end', marginTop: -6, marginBottom: 22, width: '100%' },
  forgotTxt:  { fontSize: 12, color: C.teal, fontWeight: '600' },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.teal, height: 52, borderRadius: 12, marginBottom: 20,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnPrimaryTxt: { color: C.navy, fontSize: 15, fontWeight: '800' },

  registerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  registerTxt:  { fontSize: 13, color: C.ghost },
  registerBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  registerLink: { fontSize: 13, color: C.teal, fontWeight: '700' },

  footer:    { alignItems: 'center', paddingVertical: 32 },
  footerTxt: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  footerCopy:{ fontSize: 11, color: 'rgba(255,255,255,0.2)' },

  // ============================================================
  // OTP VERIFICATION MODAL STYLES
  // ============================================================
  verifyCard: {
    backgroundColor: C.navy,
    borderRadius: 22,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: C.borderDk,
    alignItems: 'center',
  },
  verifyIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.tealDim,
    borderWidth: 1,
    borderColor: C.tealLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.white,
    marginBottom: 6,
  },
  verifySub: {
    fontSize: 13,
    color: C.ghost,
    textAlign: 'center',
    marginBottom: 28,
  },
  verificationCodeInput: {
    width: '100%',
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    borderColor: C.borderDk,
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    color: C.white,
    textAlign: 'center',
    letterSpacing: 4,
  },
  resendButton: {
    marginTop: 15,
    padding: 10,
  },
  resendText: {
    color: C.teal,
    fontSize: 14,
    textAlign: 'center',
  },
  verifyConfirm: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: C.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyConfirmTxt: {
    color: C.navy,
    fontSize: 14,
    fontWeight: '800',
  },
  verifyCancel: {
    marginTop: 12,
    padding: 10,
  },
  verifyCancelTxt: {
    color: C.ghost,
    fontSize: 14,
    fontWeight: '600',
  },
});