import React, { useState, useRef, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, Alert,
  Text, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Modal, Animated, Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, checkEmail, verifyEmail, resendVerificationCode } from '../../redux/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

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

const barangayOptions = [
  { label: 'South Signal', value: 'South Signal', icon: 'location' },
  { label: 'Central Bicutan', value: 'Central Bicutan', icon: 'location' },
];

const getMaxDOBDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 10);
  return d;
};

const Register = () => {
  const [form, setForm] = useState({
    username: '', email: '', password: '',
    bod: '', gender: '', barangay: '', fullAddress: '', role: 'user',
  });
  const [focusedField, setFocusedField] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getMaxDOBDate());
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    username: '', email: '', password: '', bod: '', gender: '', barangay: '', fullAddress: '',
  });
  const [isOffline, setIsOffline] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsError, setTermsError] = useState('');

  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { loading, error } = useSelector((s) => s.auth);

  useEffect(() => {
    NetInfo.fetch().then((state) => setIsOffline(!state.isConnected)).catch(() => {});
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return unsubscribe;
  }, []);

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
      case 'username': if (!value.trim()) err = 'Full name is required'; else if (value.trim().length < 2) err = 'At least 2 characters'; break;
      case 'email': if (!value.trim()) err = 'Email is required'; else if (!validateEmail(value)) err = 'Please enter a valid email'; break;
      case 'password': if (!value) err = 'Password is required'; else if (value.length < 6) err = 'At least 6 characters'; break;
      case 'bod': if (!value) err = 'Date of birth is required'; break;
      case 'gender': if (!value) err = 'Gender is required'; break;
      case 'barangay': if (!value) err = 'Barangay is required'; break;
      case 'fullAddress': if (!value.trim()) err = 'Complete address is required'; else if (value.trim().length < 5) err = 'Please enter a complete address (house number, street, etc.)'; break;
    }
    setFieldErrors((p) => ({ ...p, [field]: err }));
    return !err;
  };

  const validateAll = () =>
    ['username', 'email', 'password', 'bod', 'gender', 'barangay', 'fullAddress']
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
      const result = await dispatch(checkEmail(email)).unwrap();
      return true;
    } catch (rejectedPayload) {
      const msg = 'This email is already registered';
      setEmailError(msg);
      setFieldErrors((p) => ({ ...p, email: msg }));
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

  const handleDateChange = (_, date) => {
    setShowDatePicker(false);
    if (date) {
      const maxAllowed = getMaxDOBDate();
      if (date > maxAllowed) {
        Alert.alert('Age Requirement', 'You must be at least 10 years old to register.', [{ text: 'OK' }]);
        return;
      }
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

  const handleRegisterClick = async () => {
    if (isOffline) {
      Alert.alert('No Connection', 'Please check your internet connection');
      return;
    }
    
    // Validate barangay is selected
    if (!form.barangay) {
      Alert.alert('Barangay Required', 'Please select a barangay (South Signal or Central Bicutan)');
      return;
    }
    
    // Validate barangay is valid
    if (form.barangay !== 'South Signal' && form.barangay !== 'Central Bicutan') {
      Alert.alert('Invalid Barangay', 'Please select either South Signal or Central Bicutan');
      return;
    }
    
    if (!validateAll()) {
      Alert.alert('Incomplete', 'Please fill in all required fields correctly.');
      return;
    }
    
    if (!validateEmail(form.email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    
    if (!termsAccepted) {
      setTermsError('You must agree to the Terms & Conditions to continue.');
      Alert.alert('Terms & Conditions', 'Please read and accept the Terms & Conditions before creating your account.');
      return;
    }
    
    const ok = await checkEmailAvailability(form.email);
    if (!ok) return;
    
    setShowVerificationModal(true);
  };

  const sendVerificationCode = async () => {
    // Double-check barangay is selected before sending
    if (!form.barangay || (form.barangay !== 'South Signal' && form.barangay !== 'Central Bicutan')) {
      Alert.alert('Error', 'Please select a valid barangay (South Signal or Central Bicutan)');
      setShowVerificationModal(false);
      return;
    }
    
    // Create submission data with proper barangay field
    const submissionData = {
      username: form.username,
      email: form.email,
      password: form.password,
      bod: form.bod,
      gender: form.gender,
      barangay: form.barangay, // Send barangay as separate field
      fullAddress: form.fullAddress,
      address: `${form.fullAddress}, ${form.barangay}`,
      role: form.role,
    };
    
    console.log('📤 Submitting registration with data:', {
      ...submissionData,
      password: '***HIDDEN***'
    });
    
    try {
      const result = await dispatch(registerUser(submissionData)).unwrap();
      console.log('✅ Registration successful:', result);
      Alert.alert(
        'Verification Code Sent',
        `We've sent a 6-digit verification code to ${form.email}. Please check your inbox.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Registration error:', error);
      // Show specific error message
      let errorMessage = 'Failed to register. Please try again.';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Registration Failed',
        errorMessage,
        [{ text: 'OK', onPress: () => setShowVerificationModal(false) }]
      );
    }
  };

  useEffect(() => {
    if (showVerificationModal) {
      sendVerificationCode();
    }
  }, [showVerificationModal]);

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }
    setIsVerifying(true);
    try {
      await dispatch(verifyEmail({ email: form.email, verificationCode })).unwrap();
      setShowVerificationModal(false);
      Alert.alert(
        'Registration Successful!',
        'Your email has been verified. Please login to continue.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('❌ Verification error:', error);
      Alert.alert('Verification Failed', 'Invalid or expired verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (isUnderMaintenance) {
      Alert.alert('Under Maintenance', 'The resend verification feature is currently under maintenance. Please try again later.');
      return;
    }
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(60);
    try {
      await dispatch(resendVerificationCode({ email: form.email })).unwrap();
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } catch (error) {
      console.error('❌ Resend error:', error);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
      setCanResend(true);
      setResendTimer(0);
    }
  };

  const genderOptions = [
    { label: 'Male', value: 'Male', icon: 'male' },
    { label: 'Female', value: 'Female', icon: 'female' },
    { label: 'Other', value: 'Other', icon: 'transgender' },
    { label: 'Prefer not to say', value: 'Prefer not to say', icon: 'eye-off-outline' },
  ];

  const inputStyle = (field) => [
    s.input,
    focusedField === field && s.inputFocused,
    fieldErrors[field] && s.inputError,
  ];

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="light-content" backgroundColor={C.ink} />

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

          <View style={s.badgeWrap}>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeText}>Create Account</Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Join SolidWaste</Text>
            <Text style={s.cardSub}>Fill in all required fields to get started</Text>

            {error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={[s.errorBannerTxt, { marginLeft: 8 }]}>{error}</Text>
              </View>
            )}

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
              {fieldErrors.username ? <Text style={s.errorText}>{fieldErrors.username}</Text> : null}
            </View>

            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="mail-outline" size={13} color={C.slateL} />
                <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
                {isCheckingEmail && <Text style={s.checkingTxt}>  Checking…</Text>}
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
              {(fieldErrors.email || emailError) ? <Text style={s.errorText}>{fieldErrors.email || emailError}</Text> : null}
            </View>

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
              {fieldErrors.password ? <Text style={s.errorText}>{fieldErrors.password}</Text> : null}
            </View>

            <View style={s.row}>
              <View style={[s.fieldWrap, { flex: 1 }]}>
                <View style={s.labelRow}>
                  <Ionicons name="calendar-outline" size={13} color={C.slateL} />
                  <Text style={s.label}>Date of Birth <Text style={s.req}>*</Text></Text>
                </View>
                <TouchableOpacity
                  style={[s.input, s.selectInput, fieldErrors.bod && s.inputError]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.selectTxt, !form.bod && s.placeholderTxt]} numberOfLines={1}>
                    {form.bod ? formatDisplayDate(form.bod) : 'Select Date'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.slateL} />
                </TouchableOpacity>
                {fieldErrors.bod ? <Text style={s.errorText}>{fieldErrors.bod}</Text> : null}
              </View>

              <View style={[s.fieldWrap, { flex: 1 }]}>
                <View style={s.labelRow}>
                  <Ionicons name="people-outline" size={13} color={C.slateL} />
                  <Text style={s.label}>Gender <Text style={s.req}>*</Text></Text>
                </View>
                <TouchableOpacity
                  style={[s.input, s.selectInput, fieldErrors.gender && s.inputError]}
                  onPress={() => setShowGenderPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.selectTxt, !form.gender && s.placeholderTxt]}>
                    {form.gender || 'Select'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.slateL} />
                </TouchableOpacity>
                {fieldErrors.gender ? <Text style={s.errorText}>{fieldErrors.gender}</Text> : null}
              </View>
            </View>

            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="home-outline" size={13} color={C.slateL} />
                <Text style={s.label}>Complete Address <Text style={s.req}>*</Text></Text>
              </View>
              <TextInput
                style={[inputStyle('fullAddress'), { height: 'auto', minHeight: 50, textAlignVertical: 'top' }]}
                placeholder="House number, street, subdivision, etc."
                placeholderTextColor={C.slateL}
                value={form.fullAddress}
                onChangeText={(v) => handleChange('fullAddress', v)}
                onFocus={() => setFocusedField('fullAddress')}
                onBlur={() => handleBlur('fullAddress', form.fullAddress)}
                multiline={true}
                numberOfLines={3}
              />
              {fieldErrors.fullAddress ? <Text style={s.errorText}>{fieldErrors.fullAddress}</Text> : null}
            </View>

            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="location-outline" size={13} color={C.slateL} />
                <Text style={s.label}>Barangay <Text style={s.req}>*</Text></Text>
              </View>
              <TouchableOpacity
                style={[s.input, s.selectInput, fieldErrors.barangay && s.inputError]}
                onPress={() => setShowBarangayPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[s.selectTxt, !form.barangay && s.placeholderTxt]}>
                  {form.barangay || 'Select your barangay'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={C.slateL} />
              </TouchableOpacity>
              {fieldErrors.barangay ? <Text style={s.errorText}>{fieldErrors.barangay}</Text> : null}
            </View>

            <Text style={s.addressNote}>Your complete address will be: {form.fullAddress ? form.fullAddress : '[Your address]'}, {form.barangay ? form.barangay : '[Barangay]'}</Text>
            <Text style={s.requiredNote}>* Required fields</Text>

            <View style={s.termsRow}>
              <TouchableOpacity
                style={[s.checkbox, termsAccepted && s.checkboxChecked]}
                onPress={() => { setTermsAccepted((p) => !p); if (termsError) setTermsError(''); }}
                activeOpacity={0.7}
              >
                {termsAccepted && <Ionicons name="checkmark" size={14} color={C.navy} />}
              </TouchableOpacity>
              <Text style={s.termsTxt}>I have read and agree to the </Text>
              <TouchableOpacity onPress={() => setShowTermsModal(true)} activeOpacity={0.7}>
                <Text style={s.termsLink}>Terms & Conditions</Text>
              </TouchableOpacity>
            </View>
            {termsError ? <Text style={s.errorText}>{termsError}</Text> : null}

            <TouchableOpacity
              style={[s.btnPrimary, (loading || isCheckingEmail || isOffline) && { opacity: 0.5 }, { marginTop: 16 }]}
              onPress={handleRegisterClick}
              disabled={loading || isCheckingEmail || isOffline}
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

            <View style={s.loginRow}>
              <Text style={s.loginTxt}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.loginBtn} activeOpacity={0.7}>
                <Text style={s.loginLink}>Sign In</Text>
                <Ionicons name="arrow-forward" size={14} color={C.teal} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={getMaxDOBDate()}
            minimumDate={new Date(1950, 0, 1)}
          />
        )}

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
                  <Text style={[s.genderOptTxt, form.gender === opt.value && s.genderOptTxtActive]}>{opt.label}</Text>
                  {form.gender === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color={C.teal} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={showBarangayPicker} transparent animationType="slide" onRequestClose={() => setShowBarangayPicker(false)}>
          <View style={s.modalOverlay}>
            <View style={s.genderSheet}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Select Barangay</Text>
                <TouchableOpacity style={s.sheetClose} onPress={() => setShowBarangayPicker(false)}>
                  <Ionicons name="close" size={20} color={C.slateL} />
                </TouchableOpacity>
              </View>
              {barangayOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.genderOpt, form.barangay === opt.value && s.genderOptActive]}
                  onPress={() => { handleChange('barangay', opt.value); validateField('barangay', opt.value); setShowBarangayPicker(false); }}
                  activeOpacity={0.75}
                >
                  <View style={[s.genderOptIcon, form.barangay === opt.value && s.genderOptIconActive]}>
                    <Ionicons name={opt.icon} size={18} color={form.barangay === opt.value ? C.teal : C.slateL} />
                  </View>
                  <Text style={[s.genderOptTxt, form.barangay === opt.value && s.genderOptTxtActive]}>{opt.label}</Text>
                  {form.barangay === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color={C.teal} style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={showVerificationModal} transparent animationType="fade" onRequestClose={() => setShowVerificationModal(false)}>
          <View style={s.verifyOverlay}>
            <View style={s.verifyCard}>
              <View style={s.verifyIconRing}>
                <Ionicons name="mail-outline" size={28} color={C.teal} />
              </View>
              <Text style={s.verifyTitle}>Email Verification</Text>
              <Text style={s.verifySub}>
                We've sent a 6-digit code to{'\n'}
                <Text style={{ color: C.teal, fontWeight: 'bold' }}>{form.email}</Text>
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
                />
              </View>
              <TouchableOpacity
                style={[s.verifyConfirm, isVerifying && { opacity: 0.5 }]}
                onPress={handleVerifyCode}
                disabled={isVerifying}
              >
                <Text style={s.verifyConfirmTxt}>{isVerifying ? 'Verifying...' : 'Verify & Complete Registration'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.resendButton}
                onPress={handleResendCode}
                disabled={!canResend || isUnderMaintenance}
              >
                <Text style={[s.resendText, (!canResend || isUnderMaintenance) && { opacity: 0.5 }]}>
                  {isUnderMaintenance ? 'Under Maintenance' : canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.verifyCancel}
                onPress={() => { setShowVerificationModal(false); setVerificationCode(''); }}
              >
                <Text style={s.verifyCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showTermsModal} transparent animationType="fade" onRequestClose={() => setShowTermsModal(false)}>
          <View style={s.termsOverlay}>
            <View style={s.termsCard}>
              <View style={s.termsHeader}>
                <View style={s.termsIconRing}>
                  <Ionicons name="document-text-outline" size={22} color={C.teal} />
                </View>
                <Text style={s.termsTitle}>Terms & Conditions</Text>
                <TouchableOpacity style={s.termsCloseBtn} onPress={() => setShowTermsModal(false)}>
                  <Ionicons name="close" size={20} color={C.slateL} />
                </TouchableOpacity>
              </View>
              <Text style={s.termsEffective}>Effective Date: January 1, 2026</Text>
              <ScrollView style={s.termsScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                <Text style={s.termsSectionTitle}>1. Acceptance of Terms</Text>
                <Text style={s.termsBody}>By creating an account and using the SolidWaste application operated by T.M.F.K Waste Innovations, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not register or use the application.</Text>
                <Text style={s.termsSectionTitle}>2. Eligibility</Text>
                <Text style={s.termsBody}>You must be at least 10 years old to register and use this application. By registering, you confirm that you meet this minimum age requirement. Parents or guardians are responsible for supervising minor users between 10–17 years of age.</Text>
                <Text style={s.termsSectionTitle}>3. User Responsibilities</Text>
                <Text style={s.termsBody}>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate, complete, and current information during registration, including your full name, email address, date of birth, and barangay address. You must not share your account with others or use another person's account.</Text>
                <Text style={s.termsSectionTitle}>4. Use of the Application</Text>
                <Text style={s.termsBody}>The SolidWaste application is designed to facilitate waste management scheduling, reporting, and communication within participating barangays (South Signal and Central Bicutan). You agree to use the app only for its intended purposes and in compliance with all applicable local laws and regulations.</Text>
                <Text style={s.termsSectionTitle}>5. Data Privacy</Text>
                <Text style={s.termsBody}>We collect personal information including your name, email, address, date of birth, and gender for the purpose of providing waste management services. Your data will not be sold to third parties. We implement reasonable security measures to protect your information. By registering, you consent to the collection and use of your data as described herein.</Text>
                <Text style={s.termsSectionTitle}>6. Prohibited Conduct</Text>
                <Text style={s.termsBody}>You agree not to: (a) submit false or misleading information; (b) attempt to access accounts belonging to other users; (c) use the application to harass, threaten, or harm others; (d) engage in any activity that disrupts or interferes with the application's functionality; (e) attempt to reverse-engineer or exploit any part of the system.</Text>
                <Text style={s.termsSectionTitle}>7. Account Suspension</Text>
                <Text style={s.termsBody}>T.M.F.K Waste Innovations reserves the right to suspend or terminate your account if you violate these Terms and Conditions or engage in any conduct deemed harmful to other users or the integrity of the system.</Text>
                <Text style={s.termsSectionTitle}>8. Modifications</Text>
                <Text style={s.termsBody}>We reserve the right to modify these Terms and Conditions at any time. Continued use of the application after changes are posted constitutes acceptance of the updated terms. We will make reasonable efforts to notify registered users of significant changes.</Text>
                <Text style={s.termsSectionTitle}>9. Limitation of Liability</Text>
                <Text style={s.termsBody}>T.M.F.K Waste Innovations shall not be liable for any indirect, incidental, or consequential damages arising from your use of the application. The application is provided "as is" without warranties of any kind, express or implied.</Text>
                <Text style={s.termsSectionTitle}>10. Contact</Text>
                <Text style={s.termsBody}>If you have questions about these Terms and Conditions, please contact us through the official T.M.F.K Waste Innovations support channels within the application.</Text>
                <View style={{ height: 12 }} />
              </ScrollView>
              <View style={s.termsFooter}>
                <TouchableOpacity
                  style={s.termsDeclineBtn}
                  onPress={() => { setTermsAccepted(false); setShowTermsModal(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.termsDeclineTxt}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.termsAcceptBtn}
                  onPress={() => { setTermsAccepted(true); setTermsError(''); setShowTermsModal(false); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={C.navy} style={{ marginRight: 6 }} />
                  <Text style={s.termsAcceptTxt}>I Agree</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.ink },
  root: { flex: 1, backgroundColor: C.ink },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  header: { alignItems: 'center', paddingTop: 32, marginBottom: 24 },
  logoRing: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.navyMid, borderWidth: 1, borderColor: C.borderDk, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoImg: { width: 46, height: 46 },
  brandName: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: 1.5, marginBottom: 4 },
  brandSub: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 0.8, textTransform: 'uppercase' },
  badgeWrap: { alignItems: 'center', marginBottom: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.tealDim, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 14 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  badgeText: { fontSize: 10, fontWeight: '700', color: C.teal, letterSpacing: 1, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: C.borderDk, borderRadius: 22, padding: 28, marginBottom: 8 },
  cardTitle: { fontSize: 24, fontWeight: '900', color: C.white, letterSpacing: -0.4, marginBottom: 4 },
  cardSub: { fontSize: 13, color: C.ghost, marginBottom: 28 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.12)', borderLeftWidth: 3, borderLeftColor: C.red, borderRadius: 10, padding: 14, marginBottom: 18 },
  errorBannerTxt: { fontSize: 13, color: C.red, fontWeight: '600', flex: 1 },
  fieldWrap: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '700', color: C.slateL, letterSpacing: 0.5, textTransform: 'uppercase' },
  req: { color: C.teal },
  checkingTxt: { fontSize: 11, color: C.teal, fontStyle: 'italic' },
  input: { height: 50, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: C.borderDk, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: C.white },
  inputFocused: { borderColor: C.tealLine, backgroundColor: 'rgba(0,201,167,0.07)' },
  inputError: { borderColor: C.red, backgroundColor: 'rgba(239,68,68,0.08)' },
  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectTxt: { fontSize: 14, color: C.white, flex: 1 },
  placeholderTxt: { color: C.slateL },
  row: { flexDirection: 'row', gap: 12 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  addressNote: { fontSize: 11, color: C.teal, fontStyle: 'italic', marginBottom: 12, marginTop: -6 },
  requiredNote: { fontSize: 12, color: C.slateL, fontStyle: 'italic', marginBottom: 20 },
  termsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.slateL, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: C.teal, borderColor: C.teal },
  termsTxt: { fontSize: 13, color: C.ghost },
  termsLink: { fontSize: 13, color: C.teal, fontWeight: '700', textDecorationLine: 'underline' },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.teal, height: 52, borderRadius: 12, marginBottom: 20, shadowColor: C.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  btnPrimaryTxt: { color: C.navy, fontSize: 15, fontWeight: '800' },
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  loginTxt: { fontSize: 13, color: C.ghost },
  loginBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loginLink: { fontSize: 13, color: C.teal, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  genderSheet: { backgroundColor: C.navy, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.borderDk },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderDk, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  genderOpt: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.borderDk, borderRadius: 14, padding: 16, marginBottom: 10 },
  genderOptActive: { borderColor: C.tealLine, backgroundColor: C.tealDim },
  genderOptIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  genderOptIconActive: { backgroundColor: C.tealDim },
  genderOptTxt: { fontSize: 15, color: C.ghost, fontWeight: '500' },
  genderOptTxtActive: { color: C.teal, fontWeight: '700' },
  verifyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  verifyCard: { backgroundColor: C.navy, borderRadius: 22, padding: 28, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: C.borderDk, alignItems: 'center' },
  verifyIconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  verifyTitle: { fontSize: 20, fontWeight: '900', color: C.white, marginBottom: 6 },
  verifySub: { fontSize: 13, color: C.ghost, textAlign: 'center', marginBottom: 28 },
  verificationCodeInput: { width: '100%', marginBottom: 20 },
  codeInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: C.borderDk, borderRadius: 12, padding: 15, fontSize: 18, color: C.white, textAlign: 'center', letterSpacing: 4 },
  resendButton: { marginTop: 15, padding: 10 },
  resendText: { color: C.teal, fontSize: 14, textAlign: 'center' },
  verifyConfirm: { width: '100%', height: 48, borderRadius: 12, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  verifyConfirmTxt: { color: C.navy, fontSize: 14, fontWeight: '800' },
  verifyCancel: { marginTop: 12, padding: 10 },
  verifyCancelTxt: { color: C.ghost, fontSize: 14, fontWeight: '600' },
  errorText: { fontSize: 12, color: C.red, marginTop: 6 },
  termsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  termsCard: { backgroundColor: C.navy, borderRadius: 22, width: '100%', maxWidth: 420, maxHeight: '88%', borderWidth: 1, borderColor: C.borderDk, overflow: 'hidden' },
  termsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.borderDk, gap: 10 },
  termsIconRing: { width: 38, height: 38, borderRadius: 10, backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine, alignItems: 'center', justifyContent: 'center' },
  termsTitle: { fontSize: 17, fontWeight: '900', color: C.white, flex: 1 },
  termsCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  termsEffective: { fontSize: 11, color: C.slateL, fontStyle: 'italic', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  termsScroll: { paddingHorizontal: 20, paddingTop: 8, maxHeight: 400 },
  termsSectionTitle: { fontSize: 13, fontWeight: '800', color: C.teal, marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  termsBody: { fontSize: 13, color: C.ghost, lineHeight: 20 },
  termsFooter: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.borderDk },
  termsDeclineBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: C.borderDk, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  termsDeclineTxt: { color: C.ghost, fontSize: 14, fontWeight: '700' },
  termsAcceptBtn: { flex: 2, height: 46, borderRadius: 12, backgroundColor: C.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  termsAcceptTxt: { color: C.navy, fontSize: 14, fontWeight: '900' },
});

export default Register;