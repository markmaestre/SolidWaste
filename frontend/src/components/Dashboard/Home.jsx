import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  TextInput,
  SafeAreaView,
  Image,
  Animated,
  FlatList,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  ink:       '#071B2E',
  navy:      '#0A2540',
  navyMid:   '#103559',
  teal:      '#00C9A7',
  tealDark:  '#009E84',
  tealDim:   'rgba(0,201,167,0.13)',
  tealGlow:  'rgba(0,201,167,0.22)',
  tealLine:  'rgba(0,201,167,0.35)',
  white:     '#FFFFFF',
  offWhite:  '#F7FAFB',
  light:     '#EEF4F8',
  border:    '#D8E4EE',
  borderDk:  'rgba(255,255,255,0.09)',
  slate:     '#4E6B87',
  slateL:    '#8BA5BC',
  ghost:     'rgba(255,255,255,0.55)',
  green:     '#22C55E',
  red:       '#EF4444',
  inkA10:    'rgba(7,27,46,0.10)',
  inkA30:    'rgba(7,27,46,0.30)',
};

// ── Tiny reusable atoms ───────────────────────────────────────────────────────

const FadeIn = ({ children, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
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

const Badge = ({ label, light }) => (
  <View style={[s.badge, light && s.badgeLight]}>
    <View style={[s.badgeDot, light && { backgroundColor: C.tealDark }]} />
    <Text style={[s.badgeText, light && { color: C.tealDark }]}>{label}</Text>
  </View>
);

const Divider = ({ style }) => <View style={[s.divider, style]} />;

const NavTab = ({ label, tab, activeTab, onPress }) => {
  const active = activeTab === tab;
  return (
    <TouchableOpacity
      style={[s.navTab, active && s.navTabActive]}
      onPress={() => onPress(tab)}
      activeOpacity={0.75}
    >
      <Text style={[s.navTabText, active && s.navTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

const FeatureCard = ({ iconName, title, text, delay }) => (
  <FadeIn delay={delay}>
    <View style={s.featureCard}>
      <View style={s.featureIconRing}>
        <MaterialCommunityIcons name={iconName} size={24} color={C.teal} />
      </View>
      <Text style={s.featureTitle}>{title}</Text>
      <Text style={s.featureText}>{text}</Text>
    </View>
  </FadeIn>
);

const ServiceCard = ({ number, title, desc }) => (
  <View style={s.serviceCard}>
    <View style={s.serviceCardTop}>
      <View style={s.serviceNumBadge}>
        <Text style={s.serviceNumText}>{number}</Text>
      </View>
    </View>
    <Text style={s.serviceTitle}>{title}</Text>
    <Text style={s.serviceDesc}>{desc}</Text>
  </View>
);

const InfoCard = ({ title, iconName, children }) => (
  <View style={s.infoCard}>
    <View style={s.infoCardHeader}>
      {iconName && (
        <View style={s.infoCardIcon}>
          <MaterialCommunityIcons name={iconName} size={18} color={C.teal} />
        </View>
      )}
      <Text style={s.infoCardTitle}>{title}</Text>
    </View>
    <Divider />
    {children}
  </View>
);

const CapRow = ({ text, delay }) => (
  <FadeIn delay={delay}>
    <View style={s.capRow}>
      <View style={s.capCheck}>
        <MaterialCommunityIcons name="check" size={11} color={C.navy} />
      </View>
      <Text style={s.capText}>{text}</Text>
    </View>
  </FadeIn>
);

const ContactRow = ({ iconName, label, value }) => (
  <View style={s.cRow}>
    <View style={s.cIconBox}>
      <Ionicons name={iconName} size={17} color={C.teal} />
    </View>
    <View>
      <Text style={s.cLabel}>{label}</Text>
      <Text style={s.cValue}>{value}</Text>
    </View>
  </View>
);

const Field = ({ label, value, onChange, placeholder, keyboard, caps, multiline, required }) => (
  <View style={s.fieldWrap}>
    <Text style={s.fieldLabel}>{label}{required && <Text style={s.fieldRequired}> *</Text>}</Text>
    <TextInput
      style={[s.fieldInput, multiline && s.fieldTextArea]}
      placeholder={placeholder}
      placeholderTextColor={C.slateL}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboard || 'default'}
      autoCapitalize={caps || 'sentences'}
      multiline={!!multiline}
      numberOfLines={multiline || 1}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [form, setForm] = useState({ name: '', email: '', phone: '', organization: '', message: '' });
  const scrollRef = useRef(null);

  const setField = (f) => (v) => setForm((p) => ({ ...p, [f]: v }));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSubmit = () => {
    alert('Thank you for reaching out. We will get back to you within 24 hours.');
    setForm({ name: '', email: '', phone: '', organization: '', message: '' });
  };

  const SERVICES = [
    { n: '01', title: 'Waste Classification AI',       desc: 'Industry-leading ML algorithms delivering accurate, real-time identification across all waste categories.' },
    { n: '02', title: 'Smart Detection Platform',      desc: "Instant scanning on mobile and web — identification and disposal recommendations at the user's fingertips." },
    { n: '03', title: 'Operations Management',         desc: 'Route optimisation and scheduling tools that cut costs and improve collection efficiency across your network.' },
    { n: '04', title: 'Analytics & Insights',          desc: 'Advanced visualisation that transforms raw waste data into actionable sustainability decisions.' },
    { n: '05', title: 'Recycling Network Integration', desc: 'Connection to certified partners with full environmental impact tracking and sustainability reporting.' },
    { n: '06', title: 'Training & Education',          desc: 'Extensive programs and resources for professionals committed to responsible waste management.' },
  ];

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      {/* ── Header ── */}
      <View style={s.header}>

        {/* Logo row — logo on left, Sign Up button on right */}
        <View style={s.logoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={s.logoImgBox}>
              <Image source={require('../assets/T.M.F.K.png')} style={s.logoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={s.logoName}>T.M.F.K</Text>
              <Text style={s.logoSub}>Waste Innovations</Text>
            </View>
          </View>

          {/* Sign Up button */}
          <TouchableOpacity
            style={s.signUpBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={s.signUpBtnTxt}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Nav tabs */}
        <View style={s.navRow}>
          {[
            { tab: 'home',     label: 'Home' },
            { tab: 'about',    label: 'About' },
            { tab: 'services', label: 'Services' },
            { tab: 'contact',  label: 'Contact' },
          ].map(({ tab, label }) => (
            <NavTab key={tab} tab={tab} label={label} activeTab={activeTab} onPress={handleTabChange} />
          ))}
        </View>
      </View>

      <ScrollView ref={scrollRef} style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ════════════════════════════ HOME ════════════════════════════ */}
        {activeTab === 'home' && (
          <>
            {/* Hero */}
            <View style={s.hero}>
              <View style={s.blob1} />
              <View style={s.blob2} />
              <View style={s.blob3} />

              <View style={s.gridOverlay} pointerEvents="none">
                {[0,1,2,3].map(i => (
                  <View key={i} style={[s.gridLine, { left: (width / 4) * i }]} />
                ))}
              </View>

              <FadeIn delay={0}>
                <Badge label="AI-Powered Platform" />
              </FadeIn>

              <FadeIn delay={80}>
                <Text style={s.heroTitle}>
                  Solid Waste{'\n'}
                  <Text style={s.heroAccent}>Management</Text>{' '}
                </Text>
              </FadeIn>

              <FadeIn delay={160}>
                <Text style={s.heroSub}>
                  Revolutionizing waste classification with advanced AI — for a
                  cleaner, more sustainable future.
                </Text>
              </FadeIn>

              <FadeIn delay={240}>
                <View style={s.heroBtns}>
                  <TouchableOpacity
                    style={s.btnPrimary}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.btnPrimaryTxt}>Get Started</Text>
                    <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.btnOutline}
                    onPress={() => handleTabChange('about')}
                    activeOpacity={0.8}
                  >
                    <Text style={s.btnOutlineTxt}>Learn More</Text>
                  </TouchableOpacity>
                </View>
                
              </FadeIn>
            </View>

            {/* Scroll hint label */}
            <View style={s.scrollHint}>
              <View style={s.scrollHintLine} />
              <Text style={s.scrollHintTxt}>Why SolidWaste</Text>
              <View style={s.scrollHintLine} />
            </View>

            {/* Features */}
            <View style={s.section}>
              <FadeIn>
                <Badge label="Core Features" light />
                <Text style={s.sectionTitle}>Built for Scale.{'\n'}Designed for Impact.</Text>
              </FadeIn>

              <View style={s.featureGrid}>
                <FeatureCard delay={0}   iconName="robot-outline"    title="AI Classification" text="State-of-the-art ML for precise, real-time waste identification across all material types." />
                <FeatureCard delay={80}  iconName="chart-areaspline" title="Live Analytics"    text="Dashboards and reports that turn waste data into clear, actionable sustainability insights." />
                <FeatureCard delay={160} iconName="server-network"   title="Scalable Platform" text="From a household to a municipality — the infrastructure grows with your operations." />
              </View>
            </View>

            {/* CTA Banner */}
            <View style={s.ctaBanner}>
              <View style={s.ctaBlob} />
              <FadeIn>
                <Text style={s.ctaEyebrow}>Start today — free for 14 days</Text>
                <Text style={s.ctaTitle}>Transform your waste{'\n'}operations now.</Text>
                <Text style={s.ctaSub}>
                  Join leading organisations using SolidWaste for intelligent
                  classification and sustainable operations.
                </Text>
                <View style={s.ctaBtns}>
                  <TouchableOpacity
                    style={s.btnPrimary}
                    onPress={() => navigation.navigate('Register')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.btnPrimaryTxt}>Start Free Trial</Text>
                    <Ionicons name="arrow-forward-outline" size={16} color={C.navy} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={s.ctaSignIn}>Already have an account? Sign in →</Text>
                  </TouchableOpacity>
                </View>
              </FadeIn>
            </View>
          </>
        )}

        {/* ════════════════════════════ ABOUT ════════════════════════════ */}
        {activeTab === 'about' && (
          <View style={s.section}>
            <FadeIn>
              <Badge label="Our Story" light />
              <Text style={s.pageTitle}>About{'\n'}SolidWaste</Text>
            </FadeIn>

            <FadeIn delay={60}>
              <InfoCard title="Our Mission" iconName="flag-outline">
                <Text style={s.infoTxt}>
                  SolidWaste is dedicated to revolutionising waste management through cutting-edge
                  AI and data-driven insights — empowering organisations and communities to achieve
                  sustainable practices and contribute to a cleaner environment.
                </Text>
              </InfoCard>
            </FadeIn>

            <FadeIn delay={120}>
              <InfoCard title="Our Vision" iconName="eye-outline">
                <Text style={s.infoTxt}>
                  To become the global standard for intelligent waste management, driving
                  environmental sustainability through innovation, technology, and community
                  engagement — where every piece of waste is properly classified and recycled.
                </Text>
              </InfoCard>
            </FadeIn>

            <FadeIn delay={180}>
              <InfoCard title="Advanced Technology" iconName="chip">
                <Text style={s.infoTxt}>
                  Our platform leverages state-of-the-art ML models trained on extensive datasets
                  to deliver industry-leading accuracy in waste classification. We continuously
                  improve our algorithms to handle new materials and waste types.
                </Text>
              </InfoCard>
            </FadeIn>

            <FadeIn delay={240}>
              <InfoCard title="Core Capabilities" iconName="format-list-checks">
                {[
                  'Advanced AI-powered waste identification and classification',
                  'Real-time waste stream monitoring and analytics',
                  'Intelligent route optimisation for collection services',
                  'Comprehensive reporting and sustainability metrics',
                  'Enterprise-grade security and data protection',
                ].map((cap, i) => <CapRow key={cap} text={cap} delay={i * 50} />)}
              </InfoCard>
            </FadeIn>
          </View>
        )}

        {/* ════════════════════════════ SERVICES ════════════════════════════ */}
        {activeTab === 'services' && (
          <>
            <View style={s.section}>
              <FadeIn>
                <Badge label="What We Offer" light />
                <Text style={s.pageTitle}>Our{'\n'}Services</Text>
                <Text style={s.pageSubtitle}>
                  Six integrated pillars covering every aspect of modern waste management.
                </Text>
              </FadeIn>
            </View>

            <FlatList
              data={SERVICES}
              keyExtractor={(item) => item.n}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.servicesScroll}
              renderItem={({ item, index }) => (
                <FadeIn delay={index * 60}>
                  <ServiceCard number={item.n} title={item.title} desc={item.desc} />
                </FadeIn>
              )}
            />

            <View style={[s.section, { paddingTop: 8 }]}>
              {SERVICES.map((item, i) => (
                <FadeIn key={item.n} delay={i * 50}>
                  <View style={s.serviceRow}>
                    <View style={s.serviceRowNum}>
                      <Text style={s.serviceRowNumTxt}>{item.n}</Text>
                    </View>
                    <View style={s.serviceRowBody}>
                      <Text style={s.serviceRowTitle}>{item.title}</Text>
                      <Text style={s.serviceRowDesc}>{item.desc}</Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-right" size={18} color={C.teal} />
                  </View>
                </FadeIn>
              ))}
            </View>
          </>
        )}

        {/* ════════════════════════════ CONTACT ════════════════════════════ */}
        {activeTab === 'contact' && (
          <View style={s.section}>
            <FadeIn>
              <Badge label="Reach Out" light />
              <Text style={s.pageTitle}>Contact{'\n'}Us</Text>
            </FadeIn>

            <FadeIn delay={60}>
              <View style={s.contactStrip}>
                <ContactRow iconName="mail-outline"     label="Email"    value="info@solidwaste.ph" />
                <View style={s.contactStripDiv} />
                <ContactRow iconName="call-outline"     label="Phone"    value="+63 (2) 8XXX XXXX" />
                <View style={s.contactStripDiv} />
                <ContactRow iconName="location-outline" label="Location" value="Metro Manila, PH" />
              </View>
            </FadeIn>

            <FadeIn delay={120}>
              <InfoCard title="Send Us a Message" iconName="email-send-outline">
                <Field label="Full Name"     value={form.name}         onChange={setField('name')}         placeholder="Your full name"             caps="words"             required />
                <Field label="Email Address" value={form.email}        onChange={setField('email')}        placeholder="your@email.com"             keyboard="email-address" caps="none" required />
                <Field label="Phone Number"  value={form.phone}        onChange={setField('phone')}        placeholder="+63 XXX XXX XXXX"           keyboard="phone-pad"     caps="none" />
                <Field label="Organisation"  value={form.organization} onChange={setField('organization')} placeholder="Company or organisation"    caps="words" />
                <Field label="Message"       value={form.message}      onChange={setField('message')}      placeholder="Tell us about your inquiry…" multiline={5}           required />

                <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
                  <Text style={s.submitTxt}>Send Message</Text>
                  <Ionicons name="send-outline" size={15} color={C.navy} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              </InfoCard>
            </FadeIn>

            <FadeIn delay={200}>
              <InfoCard title="Business Hours" iconName="clock-outline">
                {[
                  { day: 'Monday – Friday', time: '8:00 AM – 6:00 PM',  open: true  },
                  { day: 'Saturday',        time: '8:00 AM – 12:00 PM', open: true  },
                  { day: 'Sunday',          time: 'Closed',              open: false },
                ].map(({ day, time, open }, i, arr) => (
                  <View key={day} style={[s.hourRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                    <Text style={s.hourDay}>{day}</Text>
                    <View style={[s.hourBadge, !open && s.hourBadgeClosed]}>
                      <Text style={[s.hourTime, !open && { color: C.red }]}>{time}</Text>
                    </View>
                  </View>
                ))}
              </InfoCard>
            </FadeIn>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <View style={s.footerInner}>
            <View>
              <Text style={s.footerBrand}>T.M.F.K</Text>
              <Text style={s.footerSub}>Waste Innovations</Text>
            </View>
            <View style={s.footerNav}>
              {['home', 'about', 'services', 'contact'].map((tab) => (
                <TouchableOpacity key={tab} onPress={() => handleTabChange(tab)}>
                  <Text style={s.footerNavTxt}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Divider style={{ borderColor: C.borderDk, marginVertical: 20 }} />
          <Text style={s.footerCopy}>© 2025 SolidWaste Philippines Inc. All rights reserved.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.offWhite },
  scroll: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.ink,
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDk,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoImgBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.navyMid,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.borderDk,
  },
  logoImg:  { width: 28, height: 28 },
  logoName: { fontSize: 17, fontWeight: '800', color: C.white, letterSpacing: 1.2 },
  logoSub:  { fontSize: 10, color: C.teal, fontWeight: '600', letterSpacing: 0.6, marginTop: 1 },

  // ── Sign Up button ───────────────────────────────────────────────────────────
  signUpBtn: {
    backgroundColor: C.teal,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  signUpBtnTxt: {
    color: C.navy,
    fontSize: 13,
    fontWeight: '800',
  },

  navRow: { flexDirection: 'row', gap: 6 },
  navTab: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
  },
  navTabActive:     { backgroundColor: C.tealDim },
  navTabText:       { fontSize: 13, color: C.ghost, fontWeight: '500' },
  navTabTextActive: { color: C.teal, fontWeight: '700' },

  // ── Badge ────────────────────────────────────────────────────────────────────
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.tealDim, borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 12,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  badgeLight: { backgroundColor: 'rgba(0,201,167,0.10)' },
  badgeDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  badgeText:  { fontSize: 10.5, fontWeight: '700', color: C.teal, letterSpacing: 1, textTransform: 'uppercase' },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  // ── Hero ─────────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: C.ink,
    paddingTop: 36, paddingBottom: 44, paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  blob1: {
    position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: C.tealGlow, top: -120, right: -130,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(0,201,167,0.06)', bottom: 0, left: -80,
  },
  blob3: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.tealDim, top: 60, right: 30,
  },
  gridOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLine:    { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.03)' },

  heroTitle: {
    fontSize: 44, fontWeight: '900', color: C.white,
    letterSpacing: -1.2, lineHeight: 52, marginBottom: 14,
  },
  heroAccent: { color: C.teal },
  heroSub: {
    fontSize: 15, color: C.ghost, lineHeight: 23, marginBottom: 32,
    maxWidth: width - 60,
  },
  heroBtns: { flexDirection: 'row', gap: 12, marginBottom: 36 },

  // ── Buttons ──────────────────────────────────────────────────────────────────
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.teal, paddingVertical: 14, paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  btnPrimaryTxt: { color: C.navy, fontSize: 15, fontWeight: '800' },

  btnOutline: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14, paddingHorizontal: 22, borderRadius: 12,
  },
  btnOutlineTxt: { color: C.white, fontSize: 15, fontWeight: '600' },

  // ── Scroll hint ──────────────────────────────────────────────────────────────
  scrollHint: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, gap: 12,
  },
  scrollHintLine: { flex: 1, height: 1, backgroundColor: C.border },
  scrollHintTxt:  { fontSize: 11, color: C.slateL, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },

  // ── Section ──────────────────────────────────────────────────────────────────
  section:      { paddingHorizontal: 20, paddingVertical: 24 },
  sectionTitle: {
    fontSize: 30, fontWeight: '900', color: C.navy,
    letterSpacing: -0.6, lineHeight: 38, marginBottom: 24,
  },
  pageTitle: {
    fontSize: 36, fontWeight: '900', color: C.navy,
    letterSpacing: -0.8, lineHeight: 44, marginBottom: 10,
  },
  pageSubtitle: { fontSize: 14, color: C.slate, lineHeight: 21, marginBottom: 24 },

  // ── Feature grid ─────────────────────────────────────────────────────────────
  featureGrid: { gap: 14 },
  featureCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.inkA10, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  featureIconRing: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: C.tealDim,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: C.tealLine,
  },
  featureTitle: { fontSize: 17, fontWeight: '700', color: C.navy, marginBottom: 8 },
  featureText:  { fontSize: 14, color: C.slate, lineHeight: 21 },

  // ── CTA Banner ───────────────────────────────────────────────────────────────
  ctaBanner: {
    backgroundColor: C.navy, marginHorizontal: 20, marginBottom: 24,
    borderRadius: 22, padding: 30, overflow: 'hidden',
    borderWidth: 1, borderColor: C.navyMid,
  },
  ctaBlob: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: C.tealGlow, top: -80, right: -80,
  },
  ctaEyebrow: { fontSize: 11, color: C.teal, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  ctaTitle: {
    fontSize: 28, fontWeight: '900', color: C.white,
    lineHeight: 36, letterSpacing: -0.5, marginBottom: 12,
  },
  ctaSub:   { fontSize: 14, color: C.ghost, lineHeight: 21, marginBottom: 28 },
  ctaBtns:  { gap: 16 },
  ctaSignIn: { color: C.teal, fontSize: 13, fontWeight: '600' },

  // ── Info cards ───────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 22, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.inkA10, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 12, elevation: 2,
  },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoCardIcon: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: C.tealDim,
    alignItems: 'center', justifyContent: 'center',
  },
  infoCardTitle: { fontSize: 17, fontWeight: '700', color: C.navy },
  infoTxt:       { fontSize: 14, color: C.slate, lineHeight: 22 },

  // ── Capability row ───────────────────────────────────────────────────────────
  capRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  capCheck: {
    width: 18, height: 18, borderRadius: 5, backgroundColor: C.teal,
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },
  capText: { flex: 1, fontSize: 14, color: C.slate, lineHeight: 21 },

  // ── Services – horizontal scroll cards ───────────────────────────────────────
  servicesScroll: { paddingHorizontal: 20, paddingBottom: 8, gap: 14 },
  serviceCard: {
    width: width * 0.68, backgroundColor: C.navy,
    borderRadius: 18, padding: 22, borderWidth: 1, borderColor: C.navyMid,
  },
  serviceCardTop:  { marginBottom: 16 },
  serviceNumBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.tealDim, borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: C.tealLine,
  },
  serviceNumText: { fontSize: 12, fontWeight: '800', color: C.teal, letterSpacing: 1 },
  serviceTitle:   { fontSize: 17, fontWeight: '700', color: C.white, marginBottom: 10 },
  serviceDesc:    { fontSize: 13, color: C.slateL, lineHeight: 20 },

  // Services – full-width list rows
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.white, borderRadius: 14, padding: 18, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.inkA10, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  serviceRowNum: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.tealDim,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  serviceRowNumTxt: { fontSize: 12, fontWeight: '800', color: C.teal },
  serviceRowBody:   { flex: 1 },
  serviceRowTitle:  { fontSize: 15, fontWeight: '700', color: C.navy, marginBottom: 3 },
  serviceRowDesc:   { fontSize: 13, color: C.slate, lineHeight: 19 },

  // ── Contact ──────────────────────────────────────────────────────────────────
  contactStrip: {
    backgroundColor: C.navy, borderRadius: 18, padding: 22, marginBottom: 16,
    borderWidth: 1, borderColor: C.navyMid, gap: 0,
  },
  contactStripDiv: { height: 1, backgroundColor: C.borderDk, marginVertical: 14 },
  cRow:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cIconBox: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: C.tealDim,
    alignItems: 'center', justifyContent: 'center',
  },
  cLabel: { fontSize: 11, color: C.slateL, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  cValue: { fontSize: 14, color: C.white, fontWeight: '600' },

  // ── Form ─────────────────────────────────────────────────────────────────────
  fieldWrap:     { marginBottom: 16 },
  fieldLabel:    { fontSize: 12, fontWeight: '700', color: C.navy, marginBottom: 7, letterSpacing: 0.3 },
  fieldRequired: { color: C.teal },
  fieldInput: {
    height: 50, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 16,
    fontSize: 15, backgroundColor: C.offWhite, color: C.navy,
  },
  fieldTextArea: { height: 120, paddingTop: 14, textAlignVertical: 'top' },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.teal, paddingVertical: 16, borderRadius: 12, marginTop: 4,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  submitTxt: { color: C.navy, fontSize: 15, fontWeight: '800' },

  // ── Hours ────────────────────────────────────────────────────────────────────
  hourRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  hourDay:        { fontSize: 14, color: C.navy, fontWeight: '600' },
  hourBadge:      { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 9 },
  hourBadgeClosed: { backgroundColor: 'rgba(239,68,68,0.1)' },
  hourTime:       { fontSize: 13, color: C.green, fontWeight: '600' },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer:       { backgroundColor: C.ink, paddingVertical: 36, paddingHorizontal: 24 },
  footerInner:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  footerBrand:  { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: 1.2 },
  footerSub:    { fontSize: 10, color: C.teal, fontWeight: '600', letterSpacing: 0.6, marginTop: 2 },
  footerNav:    { gap: 10, alignItems: 'flex-end' },
  footerNavTxt: { fontSize: 13, color: C.ghost, fontWeight: '500' },
  footerCopy:   { fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' },
});

export default HomeScreen;