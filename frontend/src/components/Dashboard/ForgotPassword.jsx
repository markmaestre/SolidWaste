// screens/ForgotPassword.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Alert,
  Text, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { 
  forgotPasswordRequest, 
  verifyResetCode, 
  resetPassword 
} from '../../redux/slices/authSlice';

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
  borderDk: 'rgba(255,255,255,0.09)',
  slate:    '#4E6B87',
  slateL:   '#8BA5BC',
  ghost:    'rgba(255,255,255,0.55)',
  green:    '#22C55E',
  red:      '#EF4444',
};

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Verify Code, 3: Reset Password
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    code: '',
    password: '',
    confirmPassword: '',
  });

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((state) => state.auth);

  // Network listener
  useEffect(() => {
    let isMounted = true;
    NetInfo.fetch().then((state) => {
      if (isMounted) setIsOffline(!state.isConnected);
    }).catch(() => {});
    
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (isMounted) setIsOffline(!state.isConnected);
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Resend timer
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

  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validateField = (field, value) => {
    let err = '';
    switch (field) {
      case 'email':
        if (!value.trim()) err = 'Email is required';
        else if (!validateEmail(value)) err = 'Please enter a valid email';
        break;
      case 'code':
        if (!value.trim()) err = 'Verification code is required';
        else if (value.length !== 6) err = 'Code must be 6 digits';
        break;
      case 'password':
        if (!value) err = 'Password is required';
        else if (value.length < 6) err = 'At least 6 characters';
        break;
      case 'confirmPassword':
        if (!value) err = 'Please confirm your password';
        else if (value !== newPassword) err = 'Passwords do not match';
        break;
    }
    setFieldErrors((p) => ({ ...p, [field]: err }));
    return !err;
  };

  const handleSendCode = async () => {
    if (isOffline) {
      Alert.alert('No Connection', 'Please check your internet connection');
      return;
    }
    
    if (!validateField('email', email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      const result = await dispatch(forgotPasswordRequest({ email })).unwrap();
      Alert.alert('Code Sent', `A verification code has been sent to ${email}`);
      setStep(2);
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      Alert.alert('Error', error || 'Failed to send verification code');
    }
  };

  const handleVerifyCode = async () => {
    if (!validateField('code', verificationCode)) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      const result = await dispatch(verifyResetCode({ email, code: verificationCode })).unwrap();
      Alert.alert('Success', 'Code verified! Please set your new password.');
      setStep(3);
    } catch (error) {
      Alert.alert('Verification Failed', error || 'Invalid or expired code');
    }
  };

  const handleResetPassword = async () => {
    if (!validateField('password', newPassword)) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }
    if (!validateField('confirmPassword', confirmPassword)) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    try {
      const result = await dispatch(resetPassword({ 
        email, 
        code: verificationCode, 
        newPassword 
      })).unwrap();
      
      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset. Please login with your new password.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Reset Failed', error || 'Failed to reset password');
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;
    try {
      await dispatch(forgotPasswordRequest({ email })).unwrap();
      Alert.alert('Code Resent', 'A new verification code has been sent to your email');
      setResendTimer(60);
      setCanResend(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    }
  };

  const renderStep1 = () => (
    <>
      <View style={s.iconRing}>
        <Ionicons name="key-outline" size={32} color={C.teal} />
      </View>
      <Text style={s.title}>Forgot Password</Text>
      <Text style={s.subtitle}>
        Enter your email address and we'll send you a verification code to reset your password.
      </Text>

      {error && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={C.red} />
          <Text style={[s.errorBannerTxt, { marginLeft: 8 }]}>{error}</Text>
        </View>
      )}

      <View style={s.fieldWrap}>
        <View style={s.labelRow}>
          <Ionicons name="mail-outline" size={13} color={C.slateL} />
          <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
        </View>
        <TextInput
          style={[s.input, fieldErrors.email && s.inputError]}
          placeholder="your@email.com"
          placeholderTextColor={C.slateL}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {fieldErrors.email && <Text style={s.errorText}>{fieldErrors.email}</Text>}
      </View>

      <TouchableOpacity
        style={[s.btnPrimary, (loading || isOffline) && { opacity: 0.5 }]}
        onPress={handleSendCode}
        disabled={loading || isOffline}
        activeOpacity={0.85}
      >
        {loading ? (
          <>
            <MaterialCommunityIcons name="loading" size={18} color={C.navy} />
            <Text style={s.btnPrimaryTxt}>Sending Code…</Text>
          </>
        ) : (
          <>
            <Text style={s.btnPrimaryTxt}>Send Verification Code</Text>
            <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.backBtn}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back-outline" size={16} color={C.ghost} />
        <Text style={s.backTxt}>Back to Login</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={s.iconRing}>
        <Ionicons name="mail-outline" size={28} color={C.teal} />
      </View>
      <Text style={s.title}>Verify Code</Text>
      <Text style={s.subtitle}>
        We've sent a 6-digit verification code to{'\n'}
        <Text style={{ color: C.teal, fontWeight: 'bold' }}>{email}</Text>
      </Text>

      <View style={s.fieldWrap}>
        <View style={s.labelRow}>
          <Ionicons name="keypad-outline" size={13} color={C.slateL} />
          <Text style={s.label}>Verification Code <Text style={s.req}>*</Text></Text>
        </View>
        <TextInput
          style={[s.input, s.codeInput, fieldErrors.code && s.inputError]}
          placeholder="Enter 6-digit code"
          placeholderTextColor={C.slateL}
          value={verificationCode}
          onChangeText={(v) => {
            setVerificationCode(v);
            if (fieldErrors.code) setFieldErrors((p) => ({ ...p, code: '' }));
          }}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          autoFocus
        />
        {fieldErrors.code && <Text style={s.errorText}>{fieldErrors.code}</Text>}
      </View>

      <TouchableOpacity
        style={[s.btnPrimary, (loading || isOffline) && { opacity: 0.5 }]}
        onPress={handleVerifyCode}
        disabled={loading || isOffline}
        activeOpacity={0.85}
      >
        {loading ? (
          <>
            <MaterialCommunityIcons name="loading" size={18} color={C.navy} />
            <Text style={s.btnPrimaryTxt}>Verifying…</Text>
          </>
        ) : (
          <>
            <Text style={s.btnPrimaryTxt}>Verify Code</Text>
            <Ionicons name="checkmark-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.resendBtn}
        onPress={handleResendCode}
        disabled={!canResend || isOffline}
        activeOpacity={0.7}
      >
        <Text style={[s.resendTxt, !canResend && { opacity: 0.5 }]}>
          {canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.backBtn}
        onPress={() => setStep(1)}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back-outline" size={16} color={C.ghost} />
        <Text style={s.backTxt}>Back to Email</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep3 = () => (
    <>
      <View style={s.iconRing}>
        <Ionicons name="lock-open-outline" size={28} color={C.teal} />
      </View>
      <Text style={s.title}>Reset Password</Text>
      <Text style={s.subtitle}>
        Enter your new password below.
      </Text>

      {error && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={C.red} />
          <Text style={[s.errorBannerTxt, { marginLeft: 8 }]}>{error}</Text>
        </View>
      )}

      <View style={s.fieldWrap}>
        <View style={s.labelRow}>
          <Ionicons name="lock-closed-outline" size={13} color={C.slateL} />
          <Text style={s.label}>New Password <Text style={s.req}>*</Text></Text>
        </View>
        <View>
          <TextInput
            style={[s.input, fieldErrors.password && s.inputError]}
            placeholder="Enter new password"
            placeholderTextColor={C.slateL}
            value={newPassword}
            secureTextEntry={!showPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={s.eyeBtn} 
            onPress={() => setShowPassword((p) => !p)}
            activeOpacity={0.7}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.slateL} />
          </TouchableOpacity>
        </View>
        {fieldErrors.password && <Text style={s.errorText}>{fieldErrors.password}</Text>}
      </View>

      <View style={s.fieldWrap}>
        <View style={s.labelRow}>
          <Ionicons name="lock-closed-outline" size={13} color={C.slateL} />
          <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
        </View>
        <View>
          <TextInput
            style={[s.input, fieldErrors.confirmPassword && s.inputError]}
            placeholder="Confirm new password"
            placeholderTextColor={C.slateL}
            value={confirmPassword}
            secureTextEntry={!showConfirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: '' }));
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={s.eyeBtn} 
            onPress={() => setShowConfirmPassword((p) => !p)}
            activeOpacity={0.7}
          >
            <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.slateL} />
          </TouchableOpacity>
        </View>
        {fieldErrors.confirmPassword && <Text style={s.errorText}>{fieldErrors.confirmPassword}</Text>}
      </View>

      <TouchableOpacity
        style={[s.btnPrimary, (loading || isOffline) && { opacity: 0.5 }]}
        onPress={handleResetPassword}
        disabled={loading || isOffline}
        activeOpacity={0.85}
      >
        {loading ? (
          <>
            <MaterialCommunityIcons name="loading" size={18} color={C.navy} />
            <Text style={s.btnPrimaryTxt}>Resetting…</Text>
          </>
        ) : (
          <>
            <Text style={s.btnPrimaryTxt}>Reset Password</Text>
            <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.backBtn}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back-outline" size={16} color={C.ghost} />
        <Text style={s.backTxt}>Back to Login</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.header}>
            <View style={s.logoRing}>
              <Image source={require('../assets/TMFK.png')} style={s.logoImg} resizeMode="contain" />
            </View>
            <Text style={s.brandName}>T.M.F.K</Text>
            <Text style={s.brandSub}>Waste Innovations</Text>
          </View>

          <View style={s.card}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.ink },
  root: { flex: 1, backgroundColor: C.ink },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  
  header: { alignItems: 'center', paddingTop: 32, marginBottom: 24 },
  logoRing: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoImg: { width: 46, height: 46 },
  brandName: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: 1.5, marginBottom: 4 },
  brandSub: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 0.8, textTransform: 'uppercase' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: C.borderDk,
    borderRadius: 22, padding: 28,
  },

  iconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  title: {
    fontSize: 24, fontWeight: '900', color: C.white,
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: C.ghost,
    textAlign: 'center', marginBottom: 24,
    lineHeight: 20,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderLeftWidth: 3, borderLeftColor: C.red,
    borderRadius: 10, padding: 14, marginBottom: 18,
  },
  errorBannerTxt: { fontSize: 13, color: C.red, fontWeight: '600', flex: 1 },

  fieldWrap: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: C.slateL, letterSpacing: 0.5, textTransform: 'uppercase' },
  req: { color: C.teal },

  input: {
    height: 50, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: C.borderDk,
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 15, color: C.white,
  },
  inputError: { borderColor: C.red, backgroundColor: 'rgba(239,68,68,0.08)' },
  codeInput: { letterSpacing: 4, fontSize: 18 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },

  errorText: { fontSize: 12, color: C.red, marginTop: 6 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.teal, height: 52, borderRadius: 12,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnPrimaryTxt: { color: C.navy, fontSize: 15, fontWeight: '800' },

  resendBtn: { paddingVertical: 12, alignItems: 'center' },
  resendTxt: { color: C.teal, fontSize: 14, fontWeight: '600' },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, marginTop: 8,
  },
  backTxt: { color: C.ghost, fontSize: 14, marginLeft: 6 },
});

export default ForgotPassword;