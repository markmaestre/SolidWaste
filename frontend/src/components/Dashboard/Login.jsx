import React, { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Alert,
  Text, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';

// Complete silence - override all console methods
const noop = () => {};
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;

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

// ── No-signal banner ──────────────────────────────────────────────────────────
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

// ── Fade-in animation ─────────────────────────────────────────────────────────
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

const Login = () => {
  const [form, setForm]                 = useState({ email: '', password: '' });
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pushToken, setPushToken]       = useState(null);
  const [fieldErrors, setFieldErrors]   = useState({ email: '', password: '' });
  const [isOffline, setIsOffline]       = useState(false);

  const dispatch   = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.auth);

  const ADMIN_EMAIL = 'admin@tmfkwaste.com';

  // ── Network listener with error handling ─────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let unsubscribe = null;
    
    const setupNetInfo = async () => {
      try {
        // Initial fetch
        const state = await NetInfo.fetch().catch(() => ({ isConnected: true }));
        if (isMounted) {
          setIsOffline(!state.isConnected);
        }
        
        // Add event listener with try-catch
        try {
          unsubscribe = NetInfo.addEventListener((state) => {
            if (isMounted) {
              setIsOffline(!state.isConnected);
            }
          });
        } catch (listenerError) {
          // Silently handle listener error
          if (isMounted) {
            setIsOffline(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          setIsOffline(false);
        }
      }
    };
    
    setupNetInfo();
    
    return () => {
      isMounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // ── Push notifications with error handling ───────────────────────────────────────
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
        if (isMounted) {
          setPushToken(token);
        }
      } catch (_) {
        // Silently ignore — push token is optional
      }
    };
    
    registerForPushNotifications();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────
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

  // ── Login success handler ────────────────────────────────────────────────────
  const handleLoginSuccess = async ({ user, token }) => {
    try {
      if (token) await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      if (pushToken) await AsyncStorage.setItem('userPushToken', pushToken);
    } catch (_) {
      // Storage errors are non-fatal — still proceed to navigate
    }

    if (user.role === 'admin')     navigation.navigate('AdminDashboard');
    else if (user.role === 'user') navigation.navigate('UserDashboard');
    else Alert.alert('Login failed', 'Invalid role assigned to user');
  };

  // ── Email/password login ─────────────────────────────────────────────────────
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
    } catch (_) {
      // Error is handled by Redux state - silent catch
    }
  };

  // ── Input style helper ───────────────────────────────────────────────────────
  const inputStyle = (field) => [
    s.input,
    focusedField === field && s.inputFocused,
    fieldErrors[field]    && s.inputError,
  ];

  const isBanned = error && typeof error === 'string' && ['banned', 'suspended', 'disabled'].some((w) =>
    error.toLowerCase().includes(w)
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />
      
      <KeyboardAvoidingView
        style={s.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Offline banner (slides from top) ── */}
        <OfflineBanner visible={isOffline} />

        {/* Decorative blobs */}
        <View style={s.blob1} />
        <View style={s.blob2} />

        {/* Home button */}
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
          {/* ── Header ── */}
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

          {/* Badge */}
          <FadeIn delay={60}>
            <View style={s.badgeWrap}>
              <View style={s.badge}>
                <View style={s.badgeDot} />
                <Text style={s.badgeText}>Secure Login</Text>
              </View>
            </View>
          </FadeIn>

          {/* ── Card ── */}
          <FadeIn delay={120}>
            <View style={s.card}>
              <Text style={s.cardTitle}>Welcome Back</Text>
              <Text style={s.cardSub}>Sign in to your account to continue</Text>

              {/* Error banner */}
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
                      <Text style={s.errorContact}>
                        Contact admin: {ADMIN_EMAIL}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Email */}
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

              {/* Password */}
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

              {/* Forgot password */}
              <TouchableOpacity style={s.forgotWrap} activeOpacity={0.7}>
                <Text style={s.forgotTxt}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Sign In button */}
              <TouchableOpacity
                style={[s.btnPrimary, (loading || isOffline) && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading || isOffline}
                activeOpacity={0.85}
              >
                {loading ? (
                  <>
                    <MaterialCommunityIcons name="loading" size={18} color={C.navy} />
                    <Text style={s.btnPrimaryTxt}>Signing In…</Text>
                  </>
                ) : (
                  <>
                    <Text style={s.btnPrimaryTxt}>Sign In</Text>
                    <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>

              {/* Register link */}
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

          {/* Footer */}
          <FadeIn delay={200}>
            <View style={s.footer}>
              <Text style={s.footerTxt}>Creating sustainable communities together</Text>
              <Text style={s.footerCopy}>© 2026 T.M.F.K. Waste Innovations</Text>
            </View>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: C.ink 
  },
  keyboardView: {
    flex: 1,
  },

  // ── Offline banner ────────────────────────────────────────────────────────
  offlineBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 28,
    left: 20, 
    right: 20,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1, 
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingVertical: 11, 
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, 
    shadowRadius: 12,
    elevation: 10,
  },
  offlineTextWrap: { 
    flex: 1 
  },
  offlineTitle: {
    fontSize: 13, 
    fontWeight: '700',
    color: '#78350F', 
    letterSpacing: 0.1,
  },
  offlineSub: {
    fontSize: 11, 
    color: '#92400E', 
    marginTop: 1,
  },
  offlineDot: {
    width: 7, 
    height: 7, 
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },

  blob1: {
    position: 'absolute', 
    width: 320, 
    height: 320, 
    borderRadius: 160,
    backgroundColor: C.tealGlow, 
    top: -100, 
    right: -130,
  },
  blob2: {
    position: 'absolute', 
    width: 200, 
    height: 200, 
    borderRadius: 100,
    backgroundColor: 'rgba(0,201,167,0.06)', 
    bottom: 160, 
    left: -70,
  },

  homeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    right: 20, 
    zIndex: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, 
    paddingVertical: 8, 
    paddingHorizontal: 16,
  },
  homeBtnTxt: { 
    color: C.white, 
    fontSize: 12, 
    fontWeight: '700', 
    letterSpacing: 1 
  },

  scroll: { 
    flexGrow: 1, 
    paddingHorizontal: 24, 
    paddingBottom: 48,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
  },

  header: { 
    alignItems: 'center', 
    paddingTop: 80, 
    marginBottom: 24 
  },
  logoRing: {
    width: 72, 
    height: 72, 
    borderRadius: 20,
    backgroundColor: C.navyMid, 
    borderWidth: 1, 
    borderColor: C.borderDk,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 14,
  },
  logoImg:   { 
    width: 46, 
    height: 46 
  },
  brandName: { 
    fontSize: 20, 
    fontWeight: '900', 
    color: C.white, 
    letterSpacing: 1.5, 
    marginBottom: 4 
  },
  brandSub: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: C.teal, 
    letterSpacing: 0.8, 
    textTransform: 'uppercase' 
  },

  badgeWrap: { 
    alignItems: 'center', 
    marginBottom: 20 
  },
  badge: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    backgroundColor: C.tealDim, 
    borderRadius: 20,
    paddingVertical: 5, 
    paddingHorizontal: 14,
  },
  badgeDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    backgroundColor: C.teal 
  },
  badgeText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: C.teal, 
    letterSpacing: 1, 
    textTransform: 'uppercase' 
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, 
    borderColor: C.borderDk,
    borderRadius: 22, 
    padding: 28,
  },
  cardTitle: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: C.white, 
    letterSpacing: -0.4, 
    marginBottom: 4 
  },
  cardSub: { 
    fontSize: 13, 
    color: C.ghost, 
    marginBottom: 28 
  },

  errorBanner: {
    flexDirection: 'row', 
    alignItems: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderLeftWidth: 3, 
    borderLeftColor: C.red,
    borderRadius: 10, 
    padding: 14, 
    marginBottom: 18,
  },
  errorBannerWarn: { 
    backgroundColor: 'rgba(217,119,6,0.12)', 
    borderLeftColor: '#D97706' 
  },
  errorText: { 
    fontSize: 13, 
    color: C.red, 
    fontWeight: '600' 
  },
  errorTextWarn: { 
    color: '#D97706' 
  },
  errorContact: { 
    fontSize: 12, 
    color: '#D97706', 
    marginTop: 3 
  },

  fieldWrap: { 
    marginBottom: 18 
  },
  fieldLabelRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    marginBottom: 8 
  },
  fieldLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: C.slateL, 
    letterSpacing: 0.5, 
    textTransform: 'uppercase' 
  },
  req: { 
    color: C.teal 
  },

  input: {
    height: 50, 
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, 
    borderColor: C.borderDk,
    borderRadius: 12, 
    paddingHorizontal: 16,
    fontSize: 15, 
    color: C.white,
  },
  inputFocused: { 
    borderColor: C.tealLine, 
    backgroundColor: 'rgba(0,201,167,0.07)' 
  },
  inputError: { 
    borderColor: C.red, 
    backgroundColor: 'rgba(239,68,68,0.08)' 
  },

  eyeBtn: { 
    position: 'absolute', 
    right: 14, 
    top: 14 
  },

  fieldErr: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    marginTop: 6 
  },
  fieldErrTxt: { 
    fontSize: 12, 
    color: C.red 
  },

  forgotWrap: { 
    alignItems: 'flex-end', 
    marginTop: -6, 
    marginBottom: 22 
  },
  forgotTxt: { 
    fontSize: 12, 
    color: C.teal, 
    fontWeight: '600' 
  },

  btnPrimary: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: C.teal, 
    height: 52, 
    borderRadius: 12, 
    marginBottom: 20,
    shadowColor: C.teal, 
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, 
    shadowRadius: 12, 
    elevation: 6,
  },
  btnPrimaryTxt: { 
    color: C.navy, 
    fontSize: 15, 
    fontWeight: '800' 
  },

  registerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6 
  },
  registerTxt: { 
    fontSize: 13, 
    color: C.ghost 
  },
  registerBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  registerLink: { 
    fontSize: 13, 
    color: C.teal, 
    fontWeight: '700' 
  },

  footer: { 
    alignItems: 'center', 
    paddingVertical: 32 
  },
  footerTxt: { 
    fontSize: 11, 
    color: 'rgba(255,255,255,0.4)', 
    marginBottom: 4 
  },
  footerCopy: { 
    fontSize: 11, 
    color: 'rgba(255,255,255,0.2)' 
  },
});