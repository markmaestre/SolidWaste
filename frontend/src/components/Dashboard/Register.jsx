import React, { useState, useRef, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Alert,
  Text, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Modal, Animated, Easing,
  Image, PanResponder,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, checkEmail } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

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
  border:   '#D8E4EE',
  slate:    '#4E6B87',
  slateL:   '#8BA5BC',
  ghost:    'rgba(255,255,255,0.55)',
  green:    '#22C55E',
  red:      '#EF4444',
};

// ── Fade-in animation ─────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0 }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
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

const Register = () => {
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    bod: '', gender: '', address: '', role: 'user',
  });
  const [focusedField, setFocusedField]       = useState(null);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [selectedDate, setSelectedDate]       = useState(new Date());
  const [emailError, setEmailError]           = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified]           = useState(false);
  const [captchaLoading, setCaptchaLoading]   = useState(false);
  const [validationMessage, setValidationMessage] = useState('Slide to verify');
  const [showPassword, setShowPassword]       = useState(false);
  const [fieldErrors, setFieldErrors]         = useState({
    username: '', email: '', password: '', bod: '', gender: '', address: '',
  });

  const dispatch   = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((s) => s.auth);

  // ── Slider refs ──────────────────────────────────────────────────────────────
  const checkmarkScale  = useRef(new Animated.Value(0)).current;
  const sliderWidth     = useRef(new Animated.Value(0)).current;
  const sliderPosition  = useRef(new Animated.Value(0)).current;
  const iconOpacity     = useRef(new Animated.Value(1)).current;

  const SLIDER_MIN_VALID = width * 0.55;
  const sliderMax        = width - 144;

  const resetSlider = () => {
    Animated.parallel([
      Animated.timing(sliderPosition, { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(sliderWidth,    { toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(iconOpacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleCaptchaSuccess = () => {
    setCaptchaLoading(true);
    setValidationMessage('Verifying…');
    Animated.timing(sliderWidth, {
      toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: false,
    }).start(() => {
      Animated.spring(checkmarkScale, { toValue: 1, friction: 3, useNativeDriver: true }).start(() => {
        setCaptchaLoading(false);
        setIsVerified(true);
        setValidationMessage('Verification complete!');
      });
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderMove: (_, g) => {
        const x = Math.max(0, Math.min(g.dx, sliderMax));
        sliderPosition.setValue(x);
        sliderWidth.setValue(x / sliderMax);
        const pct = (x / sliderMax) * 100;
        setValidationMessage(
          pct < 30 ? 'Slide to verify' :
          pct < 60 ? 'Keep going…'    :
          pct < 80 ? 'Almost there…'  : 'Release to verify'
        );
        if (x > 10) iconOpacity.setValue(0);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx >= SLIDER_MIN_VALID) handleCaptchaSuccess();
        else { resetSlider(); setValidationMessage('Slide further to verify'); }
      },
    })
  ).current;

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const validateField = (field, value) => {
    let err = '';
    switch (field) {
      case 'username': if (!value.trim()) err = 'Full name is required'; else if (value.trim().length < 2) err = 'At least 2 characters'; break;
      case 'email':    if (!value.trim()) err = 'Email is required'; else if (!validateEmail(value)) err = 'Please enter a valid email'; break;
      case 'password': if (!value) err = 'Password is required'; else if (value.length < 6) err = 'At least 6 characters'; break;
      case 'bod':      if (!value) err = 'Date of birth is required'; break;
      case 'gender':   if (!value) err = 'Gender is required'; break;
      case 'address':  if (!value.trim()) err = 'Address is required'; else if (value.trim().length < 10) err = 'Please enter a complete address'; break;
    }
    setFieldErrors((p) => ({ ...p, [field]: err }));
    return !err;
  };

  const validateAll = () =>
    ['username','email','password','bod','gender','address']
      .map((f) => validateField(f, form[f])).every(Boolean);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((p) => ({ ...p, [field]: '' }));
    if (field === 'email' && emailError) setEmailError('');
  };

  const checkEmailAvailability = async (email) => {
    if (!validateEmail(email)) { setEmailError('Please enter a valid email'); return false; }
    setIsCheckingEmail(true);
    try {
      const result = await dispatch(checkEmail(email));
      if (result?.payload?.exists) {
        const msg = 'This email is already registered';
        setEmailError(msg);
        setFieldErrors((p) => ({ ...p, email: msg }));
        return false;
      }
      return true;
    } catch (_) {
      setEmailError('Error checking email. Please try again.');
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleBlur = (field, value) => {
    setFocusedField(null);
    validateField(field, value);
    if (field === 'email' && value) checkEmailAvailability(value);
  };

  // ── Date ─────────────────────────────────────────────────────────────────────
  const handleDateChange = (_, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      const formatted = date.toISOString().split('T')[0];
      handleChange('bod', formatted);
      validateField('bod', formatted);
    }
  };

  const formatDisplayDate = (d) => {
    if (!d) return 'Select Birth Date';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // ── Register flow ────────────────────────────────────────────────────────────
  const handleRegisterClick = async () => {
    if (!validateAll()) { Alert.alert('Incomplete', 'Please fill in all required fields correctly.'); return; }
    if (!validateEmail(form.email)) { setEmailError('Please enter a valid email'); return; }
    const ok = await checkEmailAvailability(form.email);
    if (!ok) return;
    setShowVerificationModal(true);
    resetCaptcha();
  };

  const resetCaptcha = () => {
    setIsVerified(false);
    setValidationMessage('Slide to verify');
    resetSlider();
    checkmarkScale.setValue(0);
  };

  const handleVerificationSubmit = async () => {
    if (!isVerified) { Alert.alert('Verification Required', 'Please complete the human verification.'); return; }
    try {
      const res = await dispatch(registerUser(form));
      if (res?.payload === 'User registered successfully') {
        setShowVerificationModal(false);
        Alert.alert(
          'Registration Successful',
          'Your account has been created. Please login to continue.',
          [{ text: 'Continue to Login', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Registration Failed', 'Please verify your information and try again.');
      }
    } catch (_) {
      Alert.alert('Error', 'An error occurred. Please try again.');
    }
  };

  const genderOptions = [
    { label: 'Male',             value: 'Male',             icon: 'male'   },
    { label: 'Female',           value: 'Female',           icon: 'female' },
    { label: 'Other',            value: 'Other',            icon: 'transgender' },
    { label: 'Prefer not to say',value: 'Prefer not to say',icon: 'eye-off-outline' },
  ];

  const inputStyle = (field) => [
    s.input,
    focusedField === field && s.inputFocused,
    fieldErrors[field]    && s.inputError,
  ];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      {/* Blobs */}
      <View style={s.blob1} />
      <View style={s.blob2} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <FadeIn delay={0}>
          <View style={s.header}>
            <View style={s.logoRing}>
              <Image source={require('../assets/T.M.F.K.png')} style={s.logoImg} resizeMode="contain" />
            </View>
            <Text style={s.brandName}>T.M.F.K</Text>
            <Text style={s.brandSub}>Waste Innovations</Text>
          </View>
        </FadeIn>

        <FadeIn delay={60}>
          <View style={s.badgeWrap}>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeText}>Create Account</Text>
            </View>
          </View>
        </FadeIn>

        {/* ── Form card ── */}
        <FadeIn delay={120}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Join SolidWaste</Text>
            <Text style={s.cardSub}>Fill in all required fields to get started</Text>

            {/* General error */}
            {error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={[s.errorBannerTxt, { marginLeft: 8 }]}>{error}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="person-outline" size={13} color={C.slateL} />
                <Text style={s.label}>Full Name <Text style={s.req}>*</Text></Text>
              </View>
              <TextInput
                style={inputStyle('username')}
                placeholder="Enter your full name"
                placeholderTextColor={C.slateL}
                value={form.username}
                onChangeText={(v) => handleChange('username', v)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => handleBlur('username', form.username)}
                autoCapitalize="words"
              />
              {fieldErrors.username ? <FieldError msg={fieldErrors.username} /> : null}
            </View>

            {/* Email */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="mail-outline" size={13} color={C.slateL} />
                <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
                {isCheckingEmail && (
                  <Text style={s.checkingTxt}>  Checking…</Text>
                )}
              </View>
              <TextInput
                style={inputStyle('email')}
                placeholder="your@email.com"
                placeholderTextColor={C.slateL}
                value={form.email}
                onChangeText={(v) => handleChange('email', v)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => handleBlur('email', form.email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {(fieldErrors.email || emailError) ? <FieldError msg={fieldErrors.email || emailError} /> : null}
            </View>

            {/* Password */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="lock-closed-outline" size={13} color={C.slateL} />
                <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
              </View>
              <View>
                <TextInput
                  style={inputStyle('password')}
                  placeholder="Create a secure password"
                  placeholderTextColor={C.slateL}
                  value={form.password}
                  secureTextEntry={!showPassword}
                  onChangeText={(v) => handleChange('password', v)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => handleBlur('password', form.password)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword((p) => !p)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.slateL} />
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? <FieldError msg={fieldErrors.password} /> : null}
            </View>

            {/* DOB + Gender row */}
            <View style={s.row}>
              <View style={[s.fieldWrap, { flex: 1 }]}>
                <View style={s.labelRow}>
                  <Ionicons name="calendar-outline" size={13} color={C.slateL} />
                  <Text style={s.label}>Date of Birth <Text style={s.req}>*</Text></Text>
                </View>
                <TouchableOpacity
                  style={[s.input, s.selectInput, fieldErrors.bod && s.inputError, focusedField === 'bod' && s.inputFocused]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.selectTxt, !form.bod && s.placeholderTxt]} numberOfLines={1}>
                    {form.bod ? formatDisplayDate(form.bod) : 'Select Date'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.slateL} />
                </TouchableOpacity>
                {fieldErrors.bod ? <FieldError msg={fieldErrors.bod} /> : null}
              </View>

              <View style={[s.fieldWrap, { flex: 1 }]}>
                <View style={s.labelRow}>
                  <Ionicons name="people-outline" size={13} color={C.slateL} />
                  <Text style={s.label}>Gender <Text style={s.req}>*</Text></Text>
                </View>
                <TouchableOpacity
                  style={[s.input, s.selectInput, fieldErrors.gender && s.inputError, focusedField === 'gender' && s.inputFocused]}
                  onPress={() => setShowGenderPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.selectTxt, !form.gender && s.placeholderTxt]}>
                    {form.gender || 'Select'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.slateL} />
                </TouchableOpacity>
                {fieldErrors.gender ? <FieldError msg={fieldErrors.gender} /> : null}
              </View>
            </View>

            {/* Address */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="location-outline" size={13} color={C.slateL} />
                <Text style={s.label}>Address <Text style={s.req}>*</Text></Text>
              </View>
              <TextInput
                style={[inputStyle('address'), s.textArea]}
                placeholder="Enter your complete address"
                placeholderTextColor={C.slateL}
                value={form.address}
                onChangeText={(v) => handleChange('address', v)}
                onFocus={() => setFocusedField('address')}
                onBlur={() => handleBlur('address', form.address)}
                multiline numberOfLines={3}
                textAlignVertical="top"
              />
              {fieldErrors.address ? <FieldError msg={fieldErrors.address} /> : null}
            </View>

            <Text style={s.requiredNote}>* Required fields</Text>

            {/* Create Account button */}
            <TouchableOpacity
              style={[s.btnPrimary, (loading || isCheckingEmail) && { opacity: 0.6 }]}
              onPress={handleRegisterClick}
              disabled={loading || isCheckingEmail}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <MaterialCommunityIcons name="loading" size={18} color={C.navy} />
                  <Text style={s.btnPrimaryTxt}>Creating Account…</Text>
                </>
              ) : (
                <>
                  <Text style={s.btnPrimaryTxt}>Create Account</Text>
                  <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Sign In link */}
            <View style={s.loginRow}>
              <Text style={s.loginTxt}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={s.loginBtn}
                activeOpacity={0.7}
              >
                <Text style={s.loginLink}>Sign In</Text>
                <Ionicons name="arrow-forward" size={14} color={C.teal} />
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>

        {/* Footer */}
        <FadeIn delay={200}>
          <View style={s.footer}>
            <Text style={s.footerTxt}>
              By creating an account, you agree to our{' '}
              <Text style={{ color: C.teal, fontWeight: '700' }}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{ color: C.teal, fontWeight: '700' }}>Privacy Policy</Text>
            </Text>
            <Text style={s.footerCopy}>© 2025 T.M.F.K. Waste Innovations</Text>
          </View>
        </FadeIn>
      </ScrollView>

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

      {/* ── Gender Modal ── */}
      <Modal visible={showGenderPicker} transparent animationType="slide" onRequestClose={() => setShowGenderPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={s.genderSheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select Gender</Text>
              <TouchableOpacity style={s.sheetClose} onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={20} color={C.slateL} />
              </TouchableOpacity>
            </View>
            {genderOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.genderOpt, form.gender === opt.value && s.genderOptActive]}
                onPress={() => { handleChange('gender', opt.value); validateField('gender', opt.value); setShowGenderPicker(false); }}
                activeOpacity={0.75}
              >
                <View style={[s.genderOptIcon, form.gender === opt.value && s.genderOptIconActive]}>
                  <Ionicons name={opt.icon} size={18} color={form.gender === opt.value ? C.teal : C.slateL} />
                </View>
                <Text style={[s.genderOptTxt, form.gender === opt.value && s.genderOptTxtActive]}>
                  {opt.label}
                </Text>
                {form.gender === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={C.teal} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Verification Modal ── */}
      <Modal visible={showVerificationModal} transparent animationType="fade" onRequestClose={() => setShowVerificationModal(false)}>
        <View style={s.verifyOverlay}>
          <View style={s.verifyCard}>
            {/* Icon */}
            <View style={s.verifyIconRing}>
              <Ionicons name="shield-checkmark-outline" size={28} color={C.teal} />
            </View>
            <Text style={s.verifyTitle}>Human Verification</Text>
            <Text style={s.verifySub}>Please verify you're not a robot to continue</Text>

            {/* Slider / verified state */}
            <View style={s.captchaBox}>
              {!isVerified ? (
                <View style={s.sliderWrap}>
                  <View style={s.sliderTrack}>
                    <Animated.View style={[s.sliderFill, {
                      width: sliderWidth.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
                    }]} />
                  </View>
                  <Animated.View
                    style={[s.sliderThumb, { transform: [{ translateX: sliderPosition }] }]}
                    {...panResponder.panHandlers}
                  >
                    <Animated.View style={{ opacity: iconOpacity }}>
                      <Ionicons name="chevron-forward-outline" size={20} color={C.teal} />
                    </Animated.View>
                  </Animated.View>
                  <Text style={s.sliderMsg}>{validationMessage}</Text>
                </View>
              ) : (
                <View style={s.verifiedState}>
                  <Animated.View style={[s.verifiedCircle, { transform: [{ scale: checkmarkScale }] }]}>
                    <Ionicons name="checkmark" size={32} color={C.navy} />
                  </Animated.View>
                  <Text style={s.verifiedTitle}>Verified!</Text>
                  <Text style={s.verifiedSub}>You're all set to continue</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={s.verifyActions}>
              <TouchableOpacity
                style={s.verifyCancel}
                onPress={() => { setShowVerificationModal(false); resetCaptcha(); }}
                activeOpacity={0.7}
              >
                <Text style={s.verifyCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.verifyConfirm, !isVerified && { opacity: 0.4 }]}
                onPress={handleVerificationSubmit}
                disabled={!isVerified}
                activeOpacity={0.85}
              >
                <Text style={s.verifyConfirmTxt}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ── Small helper ──────────────────────────────────────────────────────────────
const FieldError = ({ msg }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
    <Ionicons name="close-circle" size={13} color={C.red} />
    <Text style={{ fontSize: 12, color: C.red }}>{msg}</Text>
  </View>
);

export default Register;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.ink },

  blob1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: C.tealGlow, top: -100, right: -130,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(0,201,167,0.06)', bottom: 200, left: -70,
  },

  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },

  header: { alignItems: 'center', paddingTop: 64, marginBottom: 24 },
  logoRing: {
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
    borderRadius: 22, padding: 28, marginBottom: 8,
  },
  cardTitle: { fontSize: 24, fontWeight: '900', color: C.white, letterSpacing: -0.4, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: C.ghost, marginBottom: 28 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderLeftWidth: 3, borderLeftColor: C.red,
    borderRadius: 10, padding: 14, marginBottom: 18,
  },
  errorBannerTxt: { fontSize: 13, color: C.red, fontWeight: '600', flex: 1 },

  fieldWrap: { marginBottom: 18 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  label:     { fontSize: 11, fontWeight: '700', color: C.slateL, letterSpacing: 0.5, textTransform: 'uppercase' },
  req:       { color: C.teal },
  checkingTxt: { fontSize: 11, color: C.teal, fontStyle: 'italic' },

  input: {
    height: 50, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: C.borderDk,
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 15, color: C.white,
  },
  inputFocused: { borderColor: C.tealLine, backgroundColor: 'rgba(0,201,167,0.07)' },
  inputError:   { borderColor: C.red,      backgroundColor: 'rgba(239,68,68,0.08)'  },

  selectInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  selectTxt:     { fontSize: 14, color: C.white, flex: 1 },
  placeholderTxt: { color: C.slateL },

  textArea: { height: 90, paddingTop: 14 },

  row: { flexDirection: 'row', gap: 12 },

  eyeBtn: { position: 'absolute', right: 14, top: 14 },

  requiredNote: { fontSize: 12, color: C.slateL, fontStyle: 'italic', marginBottom: 20 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.teal, height: 52, borderRadius: 12, marginBottom: 20,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnPrimaryTxt: { color: C.navy, fontSize: 15, fontWeight: '800' },

  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  loginTxt:  { fontSize: 13, color: C.ghost },
  loginBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loginLink: { fontSize: 13, color: C.teal, fontWeight: '700' },

  footer:    { alignItems: 'center', paddingVertical: 28 },
  footerTxt: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18, marginBottom: 6 },
  footerCopy:{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },

  // ── Gender sheet ────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  genderSheet: {
    backgroundColor: C.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.borderDk,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.borderDk, alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 18, fontWeight: '800', color: C.white },
  sheetClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  genderOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: C.borderDk,
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  genderOptActive: { borderColor: C.tealLine, backgroundColor: C.tealDim },
  genderOptIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  genderOptIconActive: { backgroundColor: C.tealDim },
  genderOptTxt:       { fontSize: 15, color: C.ghost, fontWeight: '500' },
  genderOptTxtActive: { color: C.teal, fontWeight: '700' },

  // ── Verification modal ──────────────────────────────────────────────────────
  verifyOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  verifyCard: {
    backgroundColor: C.navy, borderRadius: 22, padding: 28,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center',
  },
  verifyIconRing: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  verifyTitle: { fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 6 },
  verifySub:   { fontSize: 13, color: C.ghost, textAlign: 'center', marginBottom: 28 },

  captchaBox: { width: '100%', marginBottom: 28 },

  sliderWrap:  { position: 'relative', height: 64, justifyContent: 'center' },
  sliderTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  sliderFill:  { height: '100%', backgroundColor: C.teal, borderRadius: 4 },
  sliderThumb: {
    position: 'absolute', width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', left: 0,
  },
  sliderMsg: { textAlign: 'center', marginTop: 10, fontSize: 13, color: C.ghost },

  verifiedState:  { alignItems: 'center', paddingVertical: 16 },
  verifiedCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  verifiedTitle: { fontSize: 20, fontWeight: '900', color: C.teal, marginBottom: 4 },
  verifiedSub:   { fontSize: 13, color: C.ghost },

  verifyActions: { flexDirection: 'row', gap: 12, width: '100%' },
  verifyCancel: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center',
  },
  verifyCancelTxt: { color: C.ghost, fontSize: 14, fontWeight: '600' },
  verifyConfirm: {
    flex: 2, height: 48, borderRadius: 12,
    backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center',
  },
  verifyConfirmTxt: { color: C.navy, fontSize: 14, fontWeight: '800' },
});