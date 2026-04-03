import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Image, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { editProfile } from '../../redux/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';

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
  green:    '#22C55E',
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

const EditProfile = () => {
  const dispatch   = useNavigation();
  const navigation = useNavigation();
  const { user, profileUpdateLoading } = useSelector((st) => st.auth);
  const reduxDispatch = useDispatch();

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email:    user?.email    || '',
    bod:      user?.bod ? new Date(user.bod).toISOString().split('T')[0] : '',
    gender:   user?.gender   || '',
    address:  user?.address  || '',
  });

  const [profileImage, setProfileImage] = useState(
    user?.profile
      ? typeof user.profile === 'string' ? user.profile
        : user.profile.url || user.profile.uri || null
      : null
  );
  const [imageBase64,   setImageBase64]   = useState(null);
  const [imageChanged,  setImageChanged]  = useState(false);
  const [focusedField,  setFocusedField]  = useState(null);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  // ── Image picker ─────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'We need access to your photos.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setProfileImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setImageChanged(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'We need camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setProfileImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
      setImageChanged(true);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Update Profile Photo', 'Choose how you want to update your photo', [
      { text: 'Take Photo',            onPress: takePhoto },
      { text: 'Choose from Gallery',   onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removePhoto = () => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setProfileImage(null); setImageBase64(null); setImageChanged(true);
      }},
    ]);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.username.trim()) { Alert.alert('Validation Error', 'Username is required'); return; }
    if (!formData.email.trim())    { Alert.alert('Validation Error', 'Email is required');    return; }
    try {
      const data = new FormData();
      data.append('username', formData.username.trim());
      data.append('email',    formData.email.trim());
      if (formData.bod)     data.append('bod',     formData.bod);
      if (formData.gender)  data.append('gender',  formData.gender.trim());
      if (formData.address) data.append('address', formData.address.trim());
      if (imageChanged) {
        data.append('profile', profileImage && imageBase64
          ? `data:image/jpeg;base64,${imageBase64}` : '');
      }
      await reduxDispatch(editProfile(data)).unwrap();
      Alert.alert('Success!', 'Your profile has been updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Update Failed', err || 'Failed to update profile. Please try again.');
    }
  };

  const hasChanges = () =>
    formData.username !== user?.username ||
    formData.email    !== user?.email    ||
    formData.bod      !== (user?.bod ? new Date(user.bod).toISOString().split('T')[0] : '') ||
    formData.gender   !== user?.gender   ||
    formData.address  !== user?.address  ||
    imageChanged;

  const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

  const inputStyle = (field) => [
    s.input,
    focusedField === field && s.inputFocused,
  ];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerBlob} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <Text style={s.headerSub}>Update your information</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {/* ── Avatar section ── */}
        <FadeIn delay={0}>
          <View style={s.avatarSection}>
            <TouchableOpacity style={s.avatarWrap} onPress={showImageOptions} activeOpacity={0.85}>
              {profileImage ? (
                <>
                  <Image source={{ uri: profileImage }} style={s.avatarImg} />
                  <View style={s.avatarOverlay}>
                    <Ionicons name="camera-outline" size={22} color={C.white} />
                    <Text style={s.avatarOverlayTxt}>Change</Text>
                  </View>
                </>
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>
                    {formData.username ? formData.username[0].toUpperCase() : '?'}
                  </Text>
                  <View style={s.avatarCameraChip}>
                    <Ionicons name="camera-outline" size={14} color={C.navy} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <Text style={s.avatarName}>{formData.username || 'Your Name'}</Text>
            <Text style={s.avatarEmail}>{formData.email || 'your@email.com'}</Text>

            {profileImage && (
              <TouchableOpacity style={s.removePhotoBtn} onPress={removePhoto} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={13} color={C.red} />
                <Text style={s.removePhotoTxt}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeIn>

        {/* ── Form card ── */}
        <FadeIn delay={80}>
          <View style={s.formCard}>
            <View style={s.formCardHeader}>
              <View style={s.formCardIconWrap}>
                <Ionicons name="person-outline" size={16} color={C.teal} />
              </View>
              <Text style={s.formCardTitle}>Personal Information</Text>
              <View style={s.reqBadge}><Text style={s.reqBadgeTxt}>* Required</Text></View>
            </View>

            {/* Username */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="person-outline" size={12} color={C.slateL} />
                <Text style={s.label}>Username <Text style={s.req}>*</Text></Text>
              </View>
              <TextInput
                style={inputStyle('username')}
                value={formData.username}
                onChangeText={(v) => setFormData((p) => ({ ...p, username: v }))}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter username"
                placeholderTextColor={C.slateL}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="mail-outline" size={12} color={C.slateL} />
                <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
              </View>
              <TextInput
                style={inputStyle('email')}
                value={formData.email}
                onChangeText={(v) => setFormData((p) => ({ ...p, email: v }))}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholder="your@email.com"
                placeholderTextColor={C.slateL}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Date of Birth */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="calendar-outline" size={12} color={C.slateL} />
                <Text style={s.label}>Date of Birth</Text>
              </View>
              <TextInput
                style={inputStyle('bod')}
                value={formData.bod}
                onChangeText={(v) => setFormData((p) => ({ ...p, bod: v }))}
                onFocus={() => setFocusedField('bod')}
                onBlur={() => setFocusedField(null)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.slateL}
              />
            </View>

            {/* Gender */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="people-outline" size={12} color={C.slateL} />
                <Text style={s.label}>Gender</Text>
              </View>
              <TouchableOpacity
                style={[s.input, s.selectInput, focusedField === 'gender' && s.inputFocused]}
                onPress={() => setShowGenderPicker(true)}
                activeOpacity={0.75}
              >
                <Text style={[s.selectTxt, !formData.gender && { color: C.slateL }]}>
                  {formData.gender || 'Select gender'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={C.slateL} />
              </TouchableOpacity>

              {/* Inline gender options */}
              {showGenderPicker && (
                <View style={s.genderDropdown}>
                  {GENDER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[s.genderOpt, formData.gender === opt && s.genderOptActive]}
                      onPress={() => {
                        setFormData((p) => ({ ...p, gender: opt }));
                        setShowGenderPicker(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.genderOptTxt, formData.gender === opt && s.genderOptTxtActive]}>
                        {opt}
                      </Text>
                      {formData.gender === opt && (
                        <Ionicons name="checkmark" size={16} color={C.teal} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Address */}
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Ionicons name="location-outline" size={12} color={C.slateL} />
                <Text style={s.label}>Address</Text>
              </View>
              <TextInput
                style={[inputStyle('address'), s.textArea]}
                value={formData.address}
                onChangeText={(v) => setFormData((p) => ({ ...p, address: v }))}
                onFocus={() => setFocusedField('address')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your full address"
                placeholderTextColor={C.slateL}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </FadeIn>

        {/* Unsaved changes indicator */}
        {hasChanges() && (
          <FadeIn delay={0}>
            <View style={s.changesBar}>
              <View style={s.changesDot} />
              <Text style={s.changesTxt}>You have unsaved changes</Text>
            </View>
          </FadeIn>
        )}

        {/* ── Action buttons ── */}
        <FadeIn delay={120}>
          <View style={s.btnRow}>
            <TouchableOpacity
              style={s.btnCancel}
              onPress={() => navigation.goBack()}
              disabled={profileUpdateLoading}
              activeOpacity={0.7}
            >
              <Text style={s.btnCancelTxt}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnSave, (!hasChanges() || profileUpdateLoading) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!hasChanges() || profileUpdateLoading}
              activeOpacity={0.85}
            >
              {profileUpdateLoading ? (
                <ActivityIndicator color={C.navy} size="small" />
              ) : (
                <>
                  <Text style={s.btnSaveTxt}>{hasChanges() ? 'Save Changes' : 'No Changes'}</Text>
                  {hasChanges() && (
                    <Ionicons name="checkmark-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditProfile;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.offWhite },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 18, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.borderDk,
    overflow: 'hidden',
  },
  headerBlob: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: C.tealGlow, top: -80, right: -70,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter:  { flex: 1, alignItems: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '900', color: C.white, letterSpacing: -0.2 },
  headerSub:     { fontSize: 10, color: C.teal, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 },

  scroll: { flex: 1 },

  // ── Avatar ───────────────────────────────────────────────────────────────────
  avatarSection: {
    backgroundColor: C.ink, alignItems: 'center',
    paddingTop: 28, paddingBottom: 36, paddingHorizontal: 24,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 100, height: 100, borderRadius: 28,
    marginBottom: 14, position: 'relative',
    borderWidth: 2, borderColor: C.tealLine,
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 26 },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  avatarOverlayTxt: { fontSize: 11, color: C.white, fontWeight: '700' },
  avatarPlaceholder: {
    width: '100%', height: '100%', borderRadius: 26,
    backgroundColor: C.navyMid,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 38, fontWeight: '900', color: C.teal },
  avatarCameraChip: {
    position: 'absolute', bottom: -6, right: -6,
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: C.ink,
  },
  avatarName:  { fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: -0.2, marginBottom: 4 },
  avatarEmail: { fontSize: 12, color: C.ghost, marginBottom: 14 },
  removePhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
  },
  removePhotoTxt: { fontSize: 12, color: C.red, fontWeight: '600' },

  // ── Form card ────────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: C.white, borderRadius: 20, marginHorizontal: 20,
    padding: 24, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  formCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22,
  },
  formCardIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  formCardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: C.navy },
  reqBadge: {
    backgroundColor: C.tealDim, borderRadius: 8,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  reqBadgeTxt: { fontSize: 10, color: C.teal, fontWeight: '700' },

  fieldWrap: { marginBottom: 18 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  label:     { fontSize: 11, fontWeight: '700', color: C.slateL, letterSpacing: 0.5, textTransform: 'uppercase' },
  req:       { color: C.teal },

  input: {
    height: 50, backgroundColor: C.offWhite,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16,
    fontSize: 15, color: C.navy,
  },
  inputFocused: { borderColor: C.tealLine, backgroundColor: C.white,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  selectInput:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectTxt:    { fontSize: 15, color: C.navy },
  textArea:     { height: 90, paddingTop: 14 },

  genderDropdown: {
    marginTop: 6, backgroundColor: C.white,
    borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: 'rgba(7,27,46,0.1)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4,
  },
  genderOpt: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  genderOptActive:   { backgroundColor: C.tealDim },
  genderOptTxt:      { fontSize: 14, color: C.navy },
  genderOptTxtActive:{ color: C.teal, fontWeight: '700' },

  // ── Changes bar ──────────────────────────────────────────────────────────────
  changesBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: 'rgba(0,201,167,0.1)',
    borderWidth: 1, borderColor: C.tealLine,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  changesDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal },
  changesTxt: { fontSize: 12, color: C.tealDark, fontWeight: '600' },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  btnRow: {
    flexDirection: 'row', gap: 12,
    marginHorizontal: 20, marginTop: 4,
  },
  btnCancel: {
    flex: 1, height: 52, borderRadius: 12,
    backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelTxt: { fontSize: 14, color: C.slate, fontWeight: '600' },
  btnSave: {
    flex: 2, height: 52, borderRadius: 12,
    backgroundColor: C.teal,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnSaveTxt: { fontSize: 15, fontWeight: '800', color: C.navy },
});