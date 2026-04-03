import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  amber:    '#F59E0B',
  amberDim: 'rgba(245,158,11,0.13)',
  amberLine:'rgba(245,158,11,0.35)',
  blue:     '#60A5FA',
  blueDim:  'rgba(96,165,250,0.13)',
  purple:   '#A78BFA',
  purpleDim:'rgba(167,139,250,0.13)',
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

// ── Educational data ──────────────────────────────────────────────────────────
const WASTE_TYPES = [
  {
    id: 1, title: 'Plastic Waste',
    description: 'Synthetic materials that persist in the environment for hundreds of years.',
    examples: 'Bottles, containers, bags, packaging, straws',
    icon: 'water-outline', color: '#60A5FA',
    disposalTips: 'Rinse containers, remove caps, check local recycling numbers (#1–7).',
    recyclingProcess: 'Sorted by type, cleaned, shredded, melted, and reformed into new products.',
    environmentalImpact: 'Takes 450+ years to decompose, harms marine life, releases toxins when burned.',
    wacsCategory: 'Non-Biodegradable', co2Impact: 'High — 1.5 kg CO₂ saved per kg recycled',
    alternatives: 'Use reusable bags, bottles, and containers; choose glass or metal packaging.',
  },
  {
    id: 2, title: 'Paper Waste',
    description: 'Wood-based material that can be recycled multiple times.',
    examples: 'Newspapers, cardboard, office paper, magazines, books',
    icon: 'document-outline', color: '#34D399',
    disposalTips: 'Keep dry and clean; remove plastic windows and tape.',
    recyclingProcess: 'Pulped, screened, de-inked, bleached, and rolled into new paper.',
    environmentalImpact: 'Saves trees, water, and energy; reduces landfill methane.',
    wacsCategory: 'Biodegradable', co2Impact: 'Medium — 0.9 kg CO₂ saved per kg recycled',
    alternatives: 'Go digital, print double-sided, use both sides of paper.',
  },
  {
    id: 3, title: 'Glass Waste',
    description: '100% recyclable material that never loses quality.',
    examples: 'Bottles, jars, containers, windows',
    icon: 'wine-outline', color: '#A78BFA',
    disposalTips: 'Rinse containers, separate by color (clear, green, brown), remove lids.',
    recyclingProcess: 'Crushed into cullet, melted, and molded into new glass products.',
    environmentalImpact: 'Can be recycled infinitely; reduces mining of raw materials.',
    wacsCategory: 'Non-Biodegradable', co2Impact: 'Low — 0.6 kg CO₂ saved per kg recycled',
    alternatives: 'Use glass storage containers, buy products in returnable glass bottles.',
  },
  {
    id: 4, title: 'Metal Waste',
    description: 'Valuable materials that can be recycled repeatedly.',
    examples: 'Aluminum cans, steel cans, foil, scrap metal',
    icon: 'hardware-chip-outline', color: '#F59E0B',
    disposalTips: 'Rinse food containers, crush cans to save space.',
    recyclingProcess: 'Shredded, melted, purified, and formed into new metal products.',
    environmentalImpact: 'Recycling aluminum saves 95% energy vs virgin production.',
    wacsCategory: 'Non-Biodegradable', co2Impact: 'High — 3–8 kg CO₂ saved per kg recycled',
    alternatives: 'Use reusable containers, avoid single-use foil.',
  },
  {
    id: 5, title: 'Organic Waste',
    description: 'Natural materials that decompose and enrich soil.',
    examples: 'Food scraps, yard waste, coffee grounds, eggshells',
    icon: 'leaf-outline', color: '#22C55E',
    disposalTips: 'Compost at home or use municipal green bins; avoid meat and dairy.',
    recyclingProcess: 'Decomposes into nutrient-rich compost through aerobic digestion.',
    environmentalImpact: 'Reduces methane from landfills; creates natural fertilizer.',
    wacsCategory: 'Biodegradable', co2Impact: 'Low — 0.1 kg CO₂ saved per kg composted',
    alternatives: 'Start a compost bin, use food scraps for broth, meal planning to reduce waste.',
  },
  {
    id: 6, title: 'Electronic Waste',
    description: 'Discarded electronics containing hazardous materials and valuable metals.',
    examples: 'Phones, computers, TVs, batteries, cables',
    icon: 'phone-portrait-outline', color: '#F97316',
    disposalTips: 'Never throw in regular trash; use certified e-waste recyclers.',
    recyclingProcess: 'Dismantled, sorted, precious metals extracted, components reused.',
    environmentalImpact: 'Contains lead, mercury, cadmium; 50–80% exported to developing countries.',
    wacsCategory: 'Hazardous', co2Impact: 'High — 2.5 kg CO₂ saved per kg recycled',
    alternatives: 'Repair devices, buy refurbished, donate working electronics.',
  },
  {
    id: 7, title: 'Hazardous Waste',
    description: 'Materials dangerous to human health and the environment.',
    examples: 'Batteries, paints, chemicals, pesticides, medical waste',
    icon: 'warning-outline', color: '#EF4444',
    disposalTips: 'Take to designated hazardous waste facilities; never pour down drains.',
    recyclingProcess: 'Specialized treatment — neutralization, stabilization, or incineration.',
    environmentalImpact: 'Contaminates soil and water; bioaccumulates in food chain.',
    wacsCategory: 'Hazardous', co2Impact: 'Variable — requires special handling',
    alternatives: 'Use eco-friendly products, proper storage, buy only what you need.',
  },
];

const RECYCLING_GUIDES = [
  {
    id: 1, title: 'Plastic Recycling Numbers', icon: 'list-outline',
    lines: [
      '♳ PETE — Beverage bottles (Recyclable)',
      '♴ HDPE — Milk jugs (Recyclable)',
      '♵ PVC — Pipes (Difficult)',
      '♶ LDPE — Bags (Check locally)',
      '♷ PP — Containers (Recyclable)',
      '♸ PS — Styrofoam (Not recyclable)',
      '♹ Other — Mixed plastics (Rarely recyclable)',
    ],
  },
  {
    id: 2, title: "What NOT to Recycle", icon: 'close-circle-outline',
    lines: [
      'Plastic bags — can jam sorting machines',
      'Pizza boxes — grease causes contamination',
      'Broken glass — safety hazard',
      'Hazardous waste — requires special handling',
      'Electronics — needs certified recycling',
      'Styrofoam — not accepted in most programs',
    ],
  },
  {
    id: 3, title: 'Recycling Preparation', icon: 'checkmark-circle-outline',
    lines: [
      'Empty and rinse all containers',
      'Remove caps and lids',
      'Flatten all cardboard boxes',
      'Keep items loose — no plastic bags',
      'Check your local guidelines',
      'When in doubt, throw it out',
    ],
  },
];

const WACS_FEATURES = [
  {
    title: 'How WACS Helps You', icon: 'analytics-outline',
    features: [
      'AI-powered waste classification from photos',
      'Real-time CO₂ impact calculations',
      'Personalized recycling recommendations',
      'Progress tracking and sustainability score',
      'Environmental impact equivalents',
    ],
  },
  {
    title: 'Using the Scanner', icon: 'camera-outline',
    features: [
      'Point camera at any waste item',
      'Get instant AI classification',
      'View step-by-step recycling instructions',
      'Track your full waste history',
      'Earn sustainability points over time',
    ],
  },
];

const ENV_FACTS = [
  { fact: 'Recycling one aluminum can saves enough energy to run a TV for 3 hours.', impact: 'Energy Conservation', icon: 'flash-outline', color: '#F59E0B' },
  { fact: 'A plastic bottle takes 450 years to decompose in a landfill.', impact: 'Long-term Pollution', icon: 'time-outline', color: '#EF4444' },
  { fact: 'The average person generates 4.5 pounds of waste daily.', impact: 'Daily Impact', icon: 'person-outline', color: '#60A5FA' },
  { fact: 'Composting food waste reduces methane emissions by 50%.', impact: 'Climate Action', icon: 'cloud-outline', color: '#22C55E' },
  { fact: 'Recycling 1 ton of paper saves 17 trees and 7,000 gallons of water.', impact: 'Resource Conservation', icon: 'leaf-outline', color: '#34D399' },
  { fact: 'E-waste is growing 3× faster than municipal waste worldwide.', impact: 'Digital Impact', icon: 'phone-portrait-outline', color: '#A78BFA' },
];

const SAMPLE_QUESTIONS = [
  'How to recycle plastic?',
  'What is e-waste?',
  'How does WACS calculate CO₂?',
  'Composting tips',
  'Hazardous waste disposal',
  'Recycling numbers guide',
];

const MOCK_RESPONSES = {
  plastic:    'Plastic recycling in WACS: We classify plastics by resin codes #1–7. Most recyclable are #1 (PETE) and #2 (HDPE). Always rinse containers and remove caps. Use our waste scanner for instant classification!',
  compost:    'Composting with WACS: Start with greens (food scraps) and browns (dry leaves). Keep moist and turn weekly. Avoid meat, dairy, and oily foods. Track your composting impact in your sustainability score!',
  recycle:    "WACS Recycling Guide: Our AI analyzes your waste photos and provides personalized recycling instructions. We track your recycling rate and show exactly how much CO₂ you're saving!",
  hazardous:  'Hazardous Waste in WACS: Never put batteries, paint, or chemicals in regular trash. Use our location feature to find nearby hazardous waste facilities. We flag hazardous items in your scan history.',
  co2:        'CO₂ Tracking in WACS: We calculate your carbon impact using EPA factors. Each recycled item shows kg of CO₂ saved. Watch your sustainability score grow as you recycle more!',
  electronic: 'E-Waste in WACS: Our system identifies electronics from photos and provides proper disposal instructions. We partner with certified e-waste recyclers. Track your e-waste diversion in analytics!',
};

const TABS = [
  { key: 'WasteEducation', label: 'Waste Types',    icon: 'layers-outline' },
  { key: 'RecyclingGuides',label: 'Recycling 101',  icon: 'refresh-circle-outline' },
  { key: 'WACSFeatures',   label: 'How It Works',   icon: 'analytics-outline' },
  { key: 'AIAssistant',    label: 'AI Guide',        icon: 'chatbubble-ellipses-outline' },
];

// ── Section header ─────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionIconWrap}>
      <Ionicons name={icon} size={15} color={C.teal} />
    </View>
    <Text style={s.sectionTitle}>{title}</Text>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
const Learning = ({ navigation }) => {
  const [activeTab,          setActiveTab]          = useState('WasteEducation');
  const [aiResponse,         setAiResponse]         = useState('');
  const [userQuestion,       setUserQuestion]       = useState('');
  const [loading,            setLoading]            = useState(false);
  const [aiModalVisible,     setAiModalVisible]     = useState(false);
  const [selectedWaste,      setSelectedWaste]      = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const askAI = async (question) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));
    const q = question.toLowerCase();
    let response = `Based on your question about "${question}", WACS recommends:\n\n1. Use our waste scanner for instant classification.\n2. Check your analytics for personalized insights.\n3. Visit local recycling guidelines in your area.\n4. Track your progress in the sustainability dashboard.\n\nEvery item properly recycled makes a difference!`;
    for (const [key, val] of Object.entries(MOCK_RESPONSES)) {
      if (q.includes(key)) { response = val; break; }
    }
    setAiResponse(response);
    setLoading(false);
    setAiModalVisible(true);
  };

  const handleAsk = () => {
    if (!userQuestion.trim()) { Alert.alert('Empty Question', 'Please enter a question about waste management.'); return; }
    askAI(userQuestion);
  };

  const openDetail = (waste) => { setSelectedWaste(waste); setDetailModalVisible(true); };

  return (
    <View style={s.root}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerBlob} />
        {navigation && (
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </TouchableOpacity>
        )}
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>WACS Learning</Text>
          <Text style={s.headerSub}>Master waste management</Text>
        </View>
        <View style={{ width: navigation ? 38 : 0 }} />
      </View>

      {/* ── Tab bar ── */}
      <View style={s.tabBar}>
        {TABS.map((tab) => {
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
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >

        {/* ══ Waste Types tab ══ */}
        {activeTab === 'WasteEducation' && (
          <>
            <FadeIn delay={0}>
              <SectionHeader icon="layers-outline" title="Waste Types in WACS" />
              <Text style={s.tabDesc}>
                Tap any card for detailed info, recycling tips, and environmental impact.
              </Text>
            </FadeIn>

            {WASTE_TYPES.map((waste, i) => (
              <FadeIn key={waste.id} delay={i * 50}>
                <TouchableOpacity
                  style={[s.wasteCard, { borderLeftColor: waste.color }]}
                  onPress={() => openDetail(waste)}
                  activeOpacity={0.8}
                >
                  {/* card top row */}
                  <View style={s.wasteCardTop}>
                    <View style={[s.wasteIconWrap, { backgroundColor: `${waste.color}22`, borderColor: `${waste.color}44` }]}>
                      <Ionicons name={waste.icon} size={22} color={waste.color} />
                    </View>
                    <View style={s.wasteCardTopText}>
                      <Text style={s.wasteCardTitle}>{waste.title}</Text>
                      <View style={[s.categoryChip, { backgroundColor: `${waste.color}22`, borderColor: `${waste.color}44` }]}>
                        <Text style={[s.categoryChipTxt, { color: waste.color }]}>{waste.wacsCategory}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.slateL} />
                  </View>

                  <Text style={s.wasteCardDesc} numberOfLines={2}>{waste.description}</Text>

                  <View style={s.wasteCardFooter}>
                    <Ionicons name="list-outline" size={13} color={C.slateL} />
                    <Text style={s.wasteCardExamples} numberOfLines={1}>{waste.examples}</Text>
                  </View>
                </TouchableOpacity>
              </FadeIn>
            ))}

            {/* Environmental Facts */}
            <FadeIn delay={400}>
              <View style={s.factsSection}>
                <SectionHeader icon="bulb-outline" title="Environmental Facts" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {ENV_FACTS.map((f, i) => (
                    <View key={i} style={s.factCard}>
                      <View style={[s.factIconWrap, { backgroundColor: `${f.color}22`, borderColor: `${f.color}44` }]}>
                        <Ionicons name={f.icon} size={20} color={f.color} />
                      </View>
                      <Text style={s.factTxt}>{f.fact}</Text>
                      <View style={[s.factChip, { backgroundColor: `${f.color}22`, borderColor: `${f.color}44` }]}>
                        <Text style={[s.factChipTxt, { color: f.color }]}>{f.impact}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </FadeIn>
          </>
        )}

        {/* ══ Recycling Guides tab ══ */}
        {activeTab === 'RecyclingGuides' && (
          <>
            <FadeIn delay={0}>
              <SectionHeader icon="refresh-circle-outline" title="Recycling 101" />
            </FadeIn>

            {RECYCLING_GUIDES.map((guide, i) => (
              <FadeIn key={guide.id} delay={i * 60}>
                <View style={s.guideCard}>
                  <View style={s.guideCardHeader}>
                    <View style={s.formCardIconWrap}>
                      <Ionicons name={guide.icon} size={15} color={C.teal} />
                    </View>
                    <Text style={s.guideCardTitle}>{guide.title}</Text>
                  </View>
                  <View style={s.guideLines}>
                    {guide.lines.map((line, li) => (
                      <View key={li} style={s.guideLine}>
                        <View style={s.guideLineDot} />
                        <Text style={s.guideLineTxt}>{line}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </FadeIn>
            ))}

            <FadeIn delay={240}>
              <View style={s.tipBox}>
                <View style={[s.tipBoxIcon, { backgroundColor: C.amberDim, borderColor: C.amberLine }]}>
                  <Ionicons name="trophy-outline" size={16} color={C.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.tipBoxTitle}>Pro Tip</Text>
                  <Text style={s.tipBoxTxt}>
                    Use the WACS Scanner to instantly identify if an item is recyclable.
                    Our AI recognizes over 100 different materials and provides specific disposal instructions!
                  </Text>
                </View>
              </View>
            </FadeIn>
          </>
        )}

        {/* ══ WACS Features tab ══ */}
        {activeTab === 'WACSFeatures' && (
          <>
            <FadeIn delay={0}>
              <SectionHeader icon="analytics-outline" title="How WACS Works" />
            </FadeIn>

            {WACS_FEATURES.map((item, i) => (
              <FadeIn key={i} delay={i * 80}>
                <View style={s.featureCard}>
                  <View style={s.featureCardHeader}>
                    <View style={s.formCardIconWrap}>
                      <Ionicons name={item.icon} size={15} color={C.teal} />
                    </View>
                    <Text style={s.featureCardTitle}>{item.title}</Text>
                  </View>
                  {item.features.map((f, fi) => (
                    <View key={fi} style={s.featureRow}>
                      <View style={[s.featureCheck, { backgroundColor: C.tealDim, borderColor: C.tealLine }]}>
                        <Ionicons name="checkmark" size={11} color={C.teal} />
                      </View>
                      <Text style={s.featureTxt}>{f}</Text>
                    </View>
                  ))}
                </View>
              </FadeIn>
            ))}
          </>
        )}

        {/* ══ AI Assistant tab ══ */}
        {activeTab === 'AIAssistant' && (
          <>
            <FadeIn delay={0}>
              <SectionHeader icon="chatbubble-ellipses-outline" title="WACS AI Guide" />
            </FadeIn>

            <FadeIn delay={60}>
              <View style={s.aiCard}>
                {/* Avatar row */}
                <View style={s.aiAvatarRow}>
                  <View style={s.aiAvatar}>
                    <Ionicons name="hardware-chip-outline" size={28} color={C.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.aiGreeting}>Hi! I'm your WACS Guide</Text>
                    <Text style={s.aiSubtext}>
                      Ask me anything about waste management, recycling, or how to use WACS features.
                    </Text>
                  </View>
                </View>

                {/* Input */}
                <TextInput
                  style={s.aiInput}
                  placeholder="Type your question here…"
                  placeholderTextColor={C.slateL}
                  value={userQuestion}
                  onChangeText={setUserQuestion}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />

                {/* Send button */}
                <TouchableOpacity
                  style={[s.askBtn, loading && { opacity: 0.6 }]}
                  onPress={handleAsk}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={C.navy} size="small" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={16} color={C.navy} />
                      <Text style={s.askBtnTxt}>Ask WACS AI</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Sample questions */}
                <View style={s.samplesWrap}>
                  <Text style={s.samplesLabel}>Try asking about:</Text>
                  <View style={s.samplesGrid}>
                    {SAMPLE_QUESTIONS.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        style={s.sampleChip}
                        onPress={() => setUserQuestion(q)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="search-outline" size={12} color={C.teal} />
                        <Text style={s.sampleChipTxt}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </FadeIn>
          </>
        )}
      </ScrollView>

      {/* ══ Waste Detail Modal ══ */}
      <Modal animationType="slide" transparent visible={detailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {selectedWaste && (
              <>
                {/* Modal header */}
                <View style={s.modalHeader}>
                  <View style={[s.modalHeaderIconWrap, { backgroundColor: `${selectedWaste.color}22`, borderColor: `${selectedWaste.color}44` }]}>
                    <Ionicons name={selectedWaste.icon} size={20} color={selectedWaste.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>{selectedWaste.title}</Text>
                    <View style={[s.modalChip, { backgroundColor: `${selectedWaste.color}22`, borderColor: `${selectedWaste.color}44` }]}>
                      <Text style={[s.modalChipTxt, { color: selectedWaste.color }]}>{selectedWaste.wacsCategory}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={s.modalCloseBtn} onPress={() => setDetailModalVisible(false)} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color={C.slate} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
                  {[
                    { label: 'Description',           icon: 'information-circle-outline', content: selectedWaste.description },
                    { label: 'Disposal Tips',          icon: 'trash-outline',              content: selectedWaste.disposalTips },
                    { label: 'Recycling Process',      icon: 'refresh-circle-outline',     content: selectedWaste.recyclingProcess },
                    { label: 'Environmental Impact',   icon: 'globe-outline',              content: selectedWaste.environmentalImpact },
                    { label: 'CO₂ Impact',             icon: 'cloud-outline',              content: selectedWaste.co2Impact },
                    { label: 'Sustainable Alternatives',icon: 'leaf-outline',              content: selectedWaste.alternatives },
                  ].map(({ label, icon, content }) => (
                    <View key={label} style={s.detailSection}>
                      <View style={s.detailSectionHeader}>
                        <Ionicons name={icon} size={13} color={C.teal} />
                        <Text style={s.detailSectionTitle}>{label}</Text>
                      </View>
                      <Text style={s.detailSectionTxt}>{content}</Text>
                    </View>
                  ))}

                  {/* Examples */}
                  <View style={s.detailSection}>
                    <View style={s.detailSectionHeader}>
                      <Ionicons name="list-outline" size={13} color={C.teal} />
                      <Text style={s.detailSectionTitle}>Common Examples</Text>
                    </View>
                    {selectedWaste.examples.split(', ').map((ex, i) => (
                      <View key={i} style={s.exampleRow}>
                        <View style={[s.exampleDot, { backgroundColor: selectedWaste.color }]} />
                        <Text style={s.exampleTxt}>{ex}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ══ AI Response Modal ══ */}
      <Modal animationType="slide" transparent visible={aiModalVisible} onRequestClose={() => setAiModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={s.formCardIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={15} color={C.teal} />
              </View>
              <Text style={s.modalTitle}>WACS AI Response</Text>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setAiModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={C.slate} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <Text style={s.aiResponseTxt}>{aiResponse}</Text>
            </ScrollView>

            <TouchableOpacity style={s.btnSave} onPress={() => setAiModalVisible(false)} activeOpacity={0.85}>
              <Ionicons name="checkmark-outline" size={16} color={C.navy} />
              <Text style={s.btnSaveTxt}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Learning;

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

  // ── Tab bar (same dark panel as time filter in WasteAnalytics) ───────────────
  tabBar: {
    flexDirection: 'row', gap: 6,
    backgroundColor: C.ink,
    paddingHorizontal: 16, paddingTop: 0, paddingBottom: 16,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: C.borderDk,
  },
  tabActive:    { backgroundColor: C.teal, borderColor: C.teal },
  tabTxt:       { fontSize: 10, fontWeight: '700', color: C.teal, textAlign: 'center' },
  tabTxtActive: { color: C.navy },

  // ── Scroll content ────────────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: 20, paddingBottom: 48 },

  // ── Section header ────────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.navy },
  tabDesc:      { fontSize: 13, color: C.slate, lineHeight: 20, marginBottom: 16, marginTop: -4 },

  // ── Waste cards ───────────────────────────────────────────────────────────────
  wasteCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, borderLeftWidth: 4,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  wasteCardTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  wasteIconWrap:    { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wasteCardTopText: { flex: 1 },
  wasteCardTitle:   { fontSize: 15, fontWeight: '800', color: C.navy, marginBottom: 5 },
  categoryChip:     { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  categoryChipTxt:  { fontSize: 10, fontWeight: '700' },
  wasteCardDesc:    { fontSize: 13, color: C.slate, lineHeight: 19, marginBottom: 10 },
  wasteCardFooter:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wasteCardExamples:{ fontSize: 12, color: C.slateL, flex: 1 },

  // ── Facts ─────────────────────────────────────────────────────────────────────
  factsSection: { marginTop: 8, marginBottom: 4 },
  factCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    marginRight: 12, width: 240,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  factIconWrap: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  factTxt:      { fontSize: 13, color: C.navy, lineHeight: 20, marginBottom: 12, flex: 1 },
  factChip:     { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  factChipTxt:  { fontSize: 10, fontWeight: '700' },

  // ── Shared icon wrap (formCard style) ─────────────────────────────────────────
  formCardIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Guide cards ───────────────────────────────────────────────────────────────
  guideCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  guideCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  guideCardTitle:  { fontSize: 15, fontWeight: '800', color: C.navy },
  guideLines:      { gap: 10 },
  guideLine:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  guideLineDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal, marginTop: 7, flexShrink: 0 },
  guideLineTxt:    { fontSize: 13, color: C.slate, lineHeight: 20, flex: 1 },

  // ── Tip box ───────────────────────────────────────────────────────────────────
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.amberDim, borderWidth: 1, borderColor: C.amberLine,
    borderRadius: 14, padding: 16, marginBottom: 4,
  },
  tipBoxIcon:  { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipBoxTitle: { fontSize: 13, fontWeight: '800', color: C.amber, marginBottom: 4 },
  tipBoxTxt:   { fontSize: 13, color: C.slate, lineHeight: 19 },

  // ── Feature cards ─────────────────────────────────────────────────────────────
  featureCard: {
    backgroundColor: C.white, borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  featureCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  featureCardTitle:  { fontSize: 15, fontWeight: '800', color: C.navy },
  featureRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featureCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureTxt:  { fontSize: 13, color: C.slate, flex: 1, lineHeight: 20 },

  // ── AI card ───────────────────────────────────────────────────────────────────
  aiCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  aiAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  aiAvatar: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  aiGreeting: { fontSize: 16, fontWeight: '900', color: C.navy, marginBottom: 4 },
  aiSubtext:  { fontSize: 12, color: C.slate, lineHeight: 18 },
  aiInput: {
    height: 100, backgroundColor: C.offWhite,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, padding: 14,
    fontSize: 14, color: C.navy,
    marginBottom: 14,
  },
  askBtn: {
    height: 52, borderRadius: 12,
    backgroundColor: C.teal,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 20,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  askBtnTxt:    { fontSize: 15, fontWeight: '800', color: C.navy },

  samplesWrap:  { gap: 10 },
  samplesLabel: { fontSize: 12, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.5 },
  samplesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sampleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12,
  },
  sampleChipTxt: { fontSize: 12, color: C.tealDark, fontWeight: '600' },

  // ── Modals ────────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7,27,46,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 24, paddingHorizontal: 20, paddingBottom: 32,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
  },
  modalHeaderIconWrap: {
    width: 40, height: 40, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  modalTitle:   { flex: 1, fontSize: 17, fontWeight: '900', color: C.navy },
  modalCloseBtn:{
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: C.offWhite, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalChip:    { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  modalChipTxt: { fontSize: 10, fontWeight: '700' },

  // detail sections
  detailSection:       { marginBottom: 18 },
  detailSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  detailSectionTitle:  { fontSize: 11, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailSectionTxt:    { fontSize: 14, color: C.slate, lineHeight: 21 },
  exampleRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  exampleDot:          { width: 6, height: 6, borderRadius: 3 },
  exampleTxt:          { fontSize: 13, color: C.slate },

  // AI response
  aiResponseTxt: { fontSize: 14, color: C.slate, lineHeight: 23 },

  // shared save button
  btnSave: {
    height: 52, borderRadius: 12, backgroundColor: C.teal,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  btnSaveTxt: { fontSize: 15, fontWeight: '800', color: C.navy },
});