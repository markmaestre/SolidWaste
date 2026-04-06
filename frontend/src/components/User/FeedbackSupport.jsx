import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { submitFeedback, getUserFeedback, clearFeedbackError } from '../../redux/slices/authSlice';

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  redDim:   'rgba(239,68,68,0.10)',
  redLine:  'rgba(239,68,68,0.25)',
  green:    '#22C55E',
  greenDim: 'rgba(34,197,94,0.13)',
  greenLine:'rgba(34,197,94,0.35)',
  amber:    '#F59E0B',
  amberDim: 'rgba(245,158,11,0.13)',
  amberLine:'rgba(245,158,11,0.35)',
  blue:     '#60A5FA',
  blueDim:  'rgba(96,165,250,0.13)',
  blueLine: 'rgba(96,165,250,0.35)',
  gold:     '#FBBF24',
  goldDim:  'rgba(251,191,36,0.15)',
  goldLine: 'rgba(251,191,36,0.35)',
};

// ── FadeIn animation ──────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:  { color: C.amber,  dim: C.amberDim,  line: C.amberLine,  icon: 'time-outline'             },
  reviewed: { color: C.blue,   dim: C.blueDim,   line: C.blueLine,   icon: 'eye-outline'              },
  resolved: { color: C.green,  dim: C.greenDim,  line: C.greenLine,  icon: 'checkmark-circle-outline' },
  closed:   { color: C.slateL, dim: 'rgba(139,165,188,0.13)', line: 'rgba(139,165,188,0.35)', icon: 'close-circle-outline' },
};
const getStatusMeta = (s) => STATUS_META[s] || STATUS_META.pending;

const CATEGORY_META = {
  general:     { icon: 'chatbubble-outline',      label: 'General'     },
  bug:         { icon: 'bug-outline',             label: 'Bug Report'  },
  feature:     { icon: 'bulb-outline',            label: 'Feature'     },
  improvement: { icon: 'trending-up-outline',     label: 'Improvement' },
  support:     { icon: 'help-circle-outline',     label: 'Support'     },
};
const getCatMeta = (c) => CATEGORY_META[c] || CATEGORY_META.general;

const CATEGORIES = Object.entries(CATEGORY_META).map(([value, meta]) => ({ value, ...meta }));

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// ─────────────────────────────────────────────────────────────────────────────
const FeedbackSupport = () => {
  const dispatch    = useDispatch();
  const navigation  = useNavigation();
  const { user, feedback = [], feedbackLoading, feedbackSubmitLoading, feedbackSubmitSuccess, feedbackError } =
    useSelector((s) => s.auth);

  const [rating,           setRating]           = useState(0);
  const [message,          setMessage]          = useState('');
  const [category,         setCategory]         = useState('general');
  const [focusedField,     setFocusedField]     = useState(null);
  const [activeTab,        setActiveTab]        = useState('submit');
  const [showSuccess,      setShowSuccess]      = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  useEffect(() => { dispatch(clearFeedbackError()); dispatch(getUserFeedback()); }, []);

  useEffect(() => {
    if (feedbackSubmitSuccess) {
      setShowLoadingModal(false);
      setShowSuccess(true);
      setRating(0); setMessage(''); setCategory('general');
      dispatch(getUserFeedback());
    }
  }, [feedbackSubmitSuccess]);

  useEffect(() => {
    if (feedbackError) {
      setShowLoadingModal(false);
      Alert.alert('Submission Failed', feedbackError);
    }
  }, [feedbackError]);

  const isFormValid = rating > 0 && message.trim().length >= 10 && !feedbackSubmitLoading;

  const handleSubmit = async () => {
    if (rating === 0)              { Alert.alert('Rating Required', 'Please select a rating.'); return; }
    if (!message.trim())           { Alert.alert('Message Required', 'Please provide your feedback.'); return; }
    if (message.trim().length < 10){ Alert.alert('Too Short', 'Please write at least 10 characters.'); return; }
    try {
      setShowLoadingModal(true);
      const result = await dispatch(submitFeedback({ rating, message: message.trim(), category }));
      if (submitFeedback.rejected.match(result)) {
        setShowLoadingModal(false);
        Alert.alert('Submission Failed', result.payload || 'Please try again.');
      }
    } catch (e) {
      setShowLoadingModal(false);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  // ── Submit form ────────────────────────────────────────────────────────────
  const renderSubmitTab = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* ── Rating card ── */}
        <FadeIn delay={0}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.formCardIconWrap}>
                <Ionicons name="star-outline" size={15} color={C.teal} />
              </View>
              <Text style={s.cardTitle}>Rate Your Experience</Text>
              <View style={s.reqBadge}><Text style={s.reqBadgeTxt}>* Required</Text></View>
            </View>

            <Text style={s.fieldLabel}>How would you rate our app?</Text>

            <View style={s.starsRow}>
              {[1,2,3,4,5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7} style={s.starBtn}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={38}
                    color={star <= rating ? C.gold : C.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <View style={[s.ratingChip, { backgroundColor: C.goldDim, borderColor: C.goldLine }]}>
                <Ionicons name="star" size={13} color={C.gold} />
                <Text style={[s.ratingChipTxt, { color: C.gold }]}>
                  {rating} star{rating !== 1 ? 's' : ''} — {RATING_LABELS[rating]}
                </Text>
              </View>
            )}
          </View>
        </FadeIn>

        {/* ── Category card ── */}
        <FadeIn delay={60}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.formCardIconWrap}>
                <Ionicons name="grid-outline" size={15} color={C.teal} />
              </View>
              <Text style={s.cardTitle}>Category</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={s.catRow}>
                {CATEGORIES.map((cat) => {
                  const active = category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[s.catChip, active && s.catChipActive]}
                      onPress={() => setCategory(cat.value)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={cat.icon} size={15} color={active ? C.navy : C.teal} />
                      <Text style={[s.catChipTxt, active && s.catChipTxtActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </FadeIn>

        {/* ── Message card ── */}
        <FadeIn delay={120}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.formCardIconWrap}>
                <Ionicons name="create-outline" size={15} color={C.teal} />
              </View>
              <Text style={s.cardTitle}>Your Feedback</Text>
              <View style={s.reqBadge}><Text style={s.reqBadgeTxt}>* Required</Text></View>
            </View>

            <View style={s.labelRow}>
              <Text style={s.fieldLabel}>Message</Text>
              <Text style={[s.charCount, message.length > 950 && { color: C.red }]}>
                {message.length}/1000
              </Text>
            </View>

            <TextInput
              style={[
                s.textArea,
                focusedField === 'message' && s.textAreaFocused,
                message.length > 1000 && { borderColor: C.red },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us about your experience, suggestions, or any issues…"
              placeholderTextColor={C.slateL}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
              onFocus={() => setFocusedField('message')}
              onBlur={() => setFocusedField(null)}
            />

            {message.length > 0 && message.length < 10 && (
              <View style={s.hintRow}>
                <Ionicons name="information-circle-outline" size={13} color={C.amber} />
                <Text style={[s.hintTxt, { color: C.amber }]}>
                  {10 - message.length} more character{10 - message.length !== 1 ? 's' : ''} needed
                </Text>
              </View>
            )}
            {message.length >= 10 && (
              <View style={s.hintRow}>
                <Ionicons name="checkmark-circle-outline" size={13} color={C.green} />
                <Text style={[s.hintTxt, { color: C.green }]}>Looks good!</Text>
              </View>
            )}
          </View>
        </FadeIn>

        {/* ── Submit button ── */}
        <FadeIn delay={180}>
          <TouchableOpacity
            style={[s.submitBtn, !isFormValid && { opacity: 0.45 }]}
            onPress={handleSubmit}
            disabled={!isFormValid}
            activeOpacity={0.85}
          >
            {feedbackSubmitLoading ? (
              <ActivityIndicator color={C.navy} size="small" />
            ) : (
              <>
                <Text style={s.submitBtnTxt}>Submit Feedback</Text>
                <Ionicons name="send-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </FadeIn>

      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ── History tab ────────────────────────────────────────────────────────────
  const renderHistoryTab = () => {
    if (feedbackLoading) {
      return (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={s.loadingTxt}>Loading your feedback history…</Text>
        </View>
      );
    }

    if (!feedback || feedback.length === 0) {
      return (
        <FadeIn delay={0}>
          <View style={s.emptyWrap}>
            <View style={s.emptyIconWrap}>
              <Ionicons name="chatbubble-outline" size={38} color={C.teal} />
            </View>
            <Text style={s.emptyTitle}>No Feedback Yet</Text>
            <Text style={s.emptyText}>
              You haven't submitted any feedback yet. Your input helps us improve the app!
            </Text>
            <TouchableOpacity style={s.submitBtn} onPress={() => setActiveTab('submit')} activeOpacity={0.85}>
              <Text style={s.submitBtnTxt}>Submit Your First Feedback</Text>
              <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        </FadeIn>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <FadeIn delay={0}>
          <View style={s.historyStatsRow}>
            <View style={s.historyStatItem}>
              <Text style={s.historyStatNum}>{feedback.length}</Text>
              <Text style={s.historyStatLabel}>Submitted</Text>
            </View>
            <View style={s.historyStatDiv} />
            <View style={s.historyStatItem}>
              <Text style={[s.historyStatNum, { color: C.green }]}>
                {feedback.filter(f => f.status === 'resolved').length}
              </Text>
              <Text style={s.historyStatLabel}>Resolved</Text>
            </View>
            <View style={s.historyStatDiv} />
            <View style={s.historyStatItem}>
              <Text style={[s.historyStatNum, { color: C.amber }]}>
                {feedback.filter(f => f.status === 'pending').length}
              </Text>
              <Text style={s.historyStatLabel}>Pending</Text>
            </View>
          </View>
        </FadeIn>

        {feedback.map((item, i) => {
          const statusMeta = getStatusMeta(item.status);
          const catMeta    = getCatMeta(item.category);
          const avgRating  = item.rating || 0;
          return (
            <FadeIn key={item._id} delay={i * 50}>
              <View style={s.feedbackCard}>
                {/* top accent */}
                <View style={[s.feedbackAccent, { backgroundColor: statusMeta.color }]} />

                {/* header */}
                <View style={s.feedbackCardHeader}>
                  {/* stars */}
                  <View style={s.feedbackStars}>
                    {[1,2,3,4,5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= avgRating ? 'star' : 'star-outline'}
                        size={14}
                        color={star <= avgRating ? C.gold : C.border}
                      />
                    ))}
                  </View>
                  {/* status badge */}
                  <View style={[s.statusBadge, { backgroundColor: statusMeta.dim, borderColor: statusMeta.line }]}>
                    <Ionicons name={statusMeta.icon} size={11} color={statusMeta.color} />
                    <Text style={[s.statusBadgeTxt, { color: statusMeta.color }]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* message */}
                <Text style={s.feedbackMsg}>{item.message}</Text>

                {/* meta row */}
                <View style={s.feedbackMetaRow}>
                  <View style={[s.catBadge, { backgroundColor: C.tealDim, borderColor: C.tealLine }]}>
                    <Ionicons name={catMeta.icon} size={11} color={C.teal} />
                    <Text style={s.catBadgeTxt}>{catMeta.label}</Text>
                  </View>
                  <View style={s.dateBadge}>
                    <Ionicons name="calendar-outline" size={11} color={C.slateL} />
                    <Text style={s.dateTxt}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>

                {/* admin reply */}
                {item.adminReply && (
                  <View style={s.adminReply}>
                    <View style={s.adminReplyHeader}>
                      <View style={s.formCardIconWrap}>
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.teal} />
                      </View>
                      <Text style={s.adminReplyLabel}>Team Response</Text>
                    </View>
                    <Text style={s.adminReplyTxt}>{item.adminReply}</Text>
                  </View>
                )}
              </View>
            </FadeIn>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerBlob} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Feedback & Support</Text>
          <Text style={s.headerSub}>We value your opinion</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Tab bar ── */}
      <View style={s.tabBar}>
        {[
          { key: 'submit',  label: 'Submit Feedback', icon: 'create-outline' },
          { key: 'history', label: `My Feedback (${feedback.length})`, icon: 'time-outline' },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={tab.icon} size={14} color={active ? C.navy : C.teal} />
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ── */}
      <View style={{ flex: 1 }}>
        {activeTab === 'submit' ? renderSubmitTab() : renderHistoryTab()}
      </View>

      {/* ══ Loading Modal ══ */}
      <Modal animationType="fade" transparent visible={showLoadingModal} onRequestClose={() => {}}>
        <View style={s.modalOverlay}>
          <View style={s.loadingModalSheet}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={s.loadingModalTitle}>Submitting Feedback</Text>
            <Text style={s.loadingModalTxt}>Please wait while we send your feedback…</Text>
            <View style={s.loadingDots}>
              {[0,1,2].map(i => <View key={i} style={s.loadingDot} />)}
            </View>
          </View>
        </View>
      </Modal>

      {/* ══ Success Modal ══ */}
      <Modal animationType="slide" transparent visible={showSuccess} onRequestClose={() => setShowSuccess(false)}>
        <View style={s.modalOverlay}>
          <View style={s.successSheet}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={48} color={C.teal} />
            </View>
            <Text style={s.successTitle}>Thank You!</Text>
            <Text style={s.successTxt}>
              Your feedback has been submitted successfully. We appreciate your input and will use it to improve WACS.
            </Text>
            <TouchableOpacity
              style={s.submitBtn}
              onPress={() => { setShowSuccess(false); setActiveTab('history'); }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-outline" size={16} color={C.navy} />
              <Text style={s.submitBtnTxt}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FeedbackSupport;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.offWhite },

  // ── Header ───────────────────────────────────────────────────────────────────
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

  // ── Tab bar ───────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row', gap: 8,
    backgroundColor: C.ink,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: C.borderDk,
  },
  tabActive:    { backgroundColor: C.teal, borderColor: C.teal },
  tabTxt:       { fontSize: 12, fontWeight: '700', color: C.teal },
  tabTxtActive: { color: C.navy },

  // ── Scroll content ────────────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  formCardIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle:  { flex: 1, fontSize: 15, fontWeight: '800', color: C.navy },
  reqBadge:   { backgroundColor: C.tealDim, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  reqBadgeTxt:{ fontSize: 10, color: C.teal, fontWeight: '700' },

  // ── Stars ─────────────────────────────────────────────────────────────────────
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  starsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 14 },
  starBtn:    { padding: 4 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', borderWidth: 1, borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  ratingChipTxt: { fontSize: 13, fontWeight: '700' },

  // ── Category chips ────────────────────────────────────────────────────────────
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
  },
  catChipActive: { backgroundColor: C.teal, borderColor: C.teal },
  catChipTxt:    { fontSize: 12, fontWeight: '700', color: C.teal },
  catChipTxtActive:{ color: C.navy },

  // ── Message input ─────────────────────────────────────────────────────────────
  labelRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  charCount: { fontSize: 11, color: C.slateL, fontWeight: '600' },
  textArea: {
    minHeight: 120, backgroundColor: C.offWhite,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, padding: 14,
    fontSize: 14, color: C.navy, lineHeight: 22,
  },
  textAreaFocused: {
    borderColor: C.tealLine, backgroundColor: C.white,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  hintTxt: { fontSize: 12, fontWeight: '600' },

  // ── Submit button ─────────────────────────────────────────────────────────────
  submitBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: C.teal,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
    marginBottom: 4,
  },
  submitBtnTxt: { fontSize: 15, fontWeight: '800', color: C.navy },

  // ── History stats row ─────────────────────────────────────────────────────────
  historyStatsRow: {
    backgroundColor: C.ink, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 18, marginBottom: 20,
  },
  historyStatItem:  { alignItems: 'center' },
  historyStatNum:   { fontSize: 22, fontWeight: '900', color: C.white },
  historyStatLabel: { fontSize: 10, color: C.slateL, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 },
  historyStatDiv:   { width: 1, height: 34, backgroundColor: C.borderDk },

  // ── Feedback card ─────────────────────────────────────────────────────────────
  feedbackCard: {
    backgroundColor: C.white, borderRadius: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  feedbackAccent:     { height: 3, width: '100%' },
  feedbackCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  feedbackStars:      { flexDirection: 'row', gap: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  statusBadgeTxt: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  feedbackMsg:    { fontSize: 13, color: C.slate, lineHeight: 20, paddingHorizontal: 16, marginBottom: 12 },

  feedbackMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
  },
  catBadgeTxt: { fontSize: 11, fontWeight: '700', color: C.teal },
  dateBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt:     { fontSize: 11, color: C.slateL },

  adminReply: {
    margin: 12, marginTop: 0,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    borderRadius: 12, padding: 14,
  },
  adminReplyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  adminReplyLabel:  { fontSize: 11, fontWeight: '800', color: C.teal, textTransform: 'uppercase', letterSpacing: 0.5 },
  adminReplyTxt:    { fontSize: 13, color: C.slate, lineHeight: 19 },

  // ── Empty ─────────────────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 0 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 8 },
  emptyText:  { fontSize: 14, color: C.slate, textAlign: 'center', lineHeight: 21, marginBottom: 24 },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt:  { marginTop: 14, fontSize: 14, color: C.slate, fontWeight: '600' },

  // ── Modals ────────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7,27,46,0.7)', justifyContent: 'center', alignItems: 'center', padding: 28 },

  loadingModalSheet: {
    backgroundColor: C.white, borderRadius: 24,
    padding: 32, alignItems: 'center', width: '100%',
  },
  loadingModalTitle: { fontSize: 17, fontWeight: '900', color: C.navy, marginTop: 18, marginBottom: 6 },
  loadingModalTxt:   { fontSize: 13, color: C.slate, textAlign: 'center', lineHeight: 20 },
  loadingDots:       { flexDirection: 'row', gap: 6, marginTop: 20 },
  loadingDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: C.teal },

  successSheet: {
    backgroundColor: C.white, borderRadius: 24,
    padding: 32, alignItems: 'center', width: '100%',
  },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: C.navy, marginBottom: 10 },
  successTxt:   { fontSize: 14, color: C.slate, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});