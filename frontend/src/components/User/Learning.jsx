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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const TMFK_API_KEY = Constants.expoConfig?.extra?.TMFK_API_KEY || process.env.TMFK_API_KEY;

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  bg:        '#F4F6F9',
  surface:   '#FFFFFF',
  surfaceAlt:'#F9FAFB',
  ink:       '#0D1B2A',
  inkMid:    '#1E3448',
  body:      '#445566',
  muted:     '#7B92A8',
  border:    '#E3EAF0',
  borderMd:  '#C8D8E4',
  green:     '#16A34A',
  greenBg:   '#DCFCE7',
  greenLine: '#86EFAC',
  blue:      '#2563EB',
  blueBg:    '#DBEAFE',
  blueLine:  '#93C5FD',
  amber:     '#D97706',
  amberBg:   '#FEF3C7',
  amberLine: '#FCD34D',
  red:       '#DC2626',
  redBg:     '#FEE2E2',
  redLine:   '#FCA5A5',
  purple:    '#7C3AED',
  purpleBg:  '#EDE9FE',
  purpleLine:'#C4B5FD',
  teal:      '#0D9488',
  tealBg:    '#CCFBF1',
  tealLine:  '#5EEAD4',
  orange:    '#EA580C',
  orangeBg:  '#FFEDD5',
  orangeLine:'#FDBA74',
};

const CATEGORY_COLOR = {
  'Biodegradable':    { fg: C.green,  bg: C.greenBg,  border: C.greenLine  },
  'Non-Biodegradable':{ fg: C.blue,   bg: C.blueBg,   border: C.blueLine   },
  'Hazardous':        { fg: C.red,    bg: C.redBg,    border: C.redLine    },
};

// ── Fade-in ───────────────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0 }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ── Data ──────────────────────────────────────────────────────────────────────
const WASTE_TYPES = [
  {
    id: 1, title: 'Plastic Waste',
    description: 'Synthetic materials that persist in the environment for hundreds of years.',
    examples: 'Bottles, containers, bags, packaging, straws',
    icon: 'water-outline', color: C.blue, colorBg: C.blueBg, colorLine: C.blueLine,
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
    icon: 'document-outline', color: C.green, colorBg: C.greenBg, colorLine: C.greenLine,
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
    icon: 'wine-outline', color: C.purple, colorBg: C.purpleBg, colorLine: C.purpleLine,
    disposalTips: 'Rinse containers, separate by color (clear, green, brown), remove lids.',
    recyclingProcess: 'Crushed into cullet, melted, and molded into new glass products.',
    environmentalImpact: 'Can be recycled infinitely; reduces mining of raw materials.',
    wacsCategory: 'Non-Biodegradable', co2Impact: 'Low — 0.6 kg CO₂ saved per kg recycled',
    alternatives: 'Use glass storage containers, buy products in returnable glass bottles.',
  },
  {
    id: 4, title: 'Metal Waste',
    description: 'Valuable materials that can be recycled repeatedly without degradation.',
    examples: 'Aluminum cans, steel cans, foil, scrap metal',
    icon: 'hardware-chip-outline', color: C.amber, colorBg: C.amberBg, colorLine: C.amberLine,
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
    icon: 'leaf-outline', color: C.teal, colorBg: C.tealBg, colorLine: C.tealLine,
    disposalTips: 'Compost at home or use municipal green bins; avoid meat and dairy.',
    recyclingProcess: 'Decomposes into nutrient-rich compost through aerobic digestion.',
    environmentalImpact: 'Reduces methane from landfills; creates natural fertilizer.',
    wacsCategory: 'Biodegradable', co2Impact: 'Low — 0.1 kg CO₂ saved per kg composted',
    alternatives: 'Start a compost bin, use food scraps for broth, meal plan to reduce waste.',
  },
  {
    id: 6, title: 'Electronic Waste',
    description: 'Discarded electronics containing hazardous materials and valuable metals.',
    examples: 'Phones, computers, TVs, batteries, cables',
    icon: 'phone-portrait-outline', color: C.orange, colorBg: C.orangeBg, colorLine: C.orangeLine,
    disposalTips: 'Never throw in regular trash; use certified e-waste recyclers.',
    recyclingProcess: 'Dismantled, sorted, precious metals extracted, components reused.',
    environmentalImpact: 'Contains lead, mercury, cadmium — toxic to soil and water.',
    wacsCategory: 'Hazardous', co2Impact: 'High — 2.5 kg CO₂ saved per kg recycled',
    alternatives: 'Repair devices, buy refurbished, donate working electronics.',
  },
  {
    id: 7, title: 'Hazardous Waste',
    description: 'Materials dangerous to human health and the environment.',
    examples: 'Batteries, paints, chemicals, pesticides, medical waste',
    icon: 'warning-outline', color: C.red, colorBg: C.redBg, colorLine: C.redLine,
    disposalTips: 'Take to designated hazardous waste facilities; never pour down drains.',
    recyclingProcess: 'Specialized treatment — neutralization, stabilization, or incineration.',
    environmentalImpact: 'Contaminates soil and water; bioaccumulates in food chain.',
    wacsCategory: 'Hazardous', co2Impact: 'Variable — requires special handling',
    alternatives: 'Use eco-friendly products, proper storage, buy only what you need.',
  },
];

const RECYCLING_GUIDES = [
  {
    id: 1, title: 'Plastic Recycling Numbers', icon: 'list-outline', color: C.blue,
    lines: [
      '#1 PETE — Beverage bottles (Recyclable)',
      '#2 HDPE — Milk jugs (Recyclable)',
      '#3 PVC — Pipes (Difficult to recycle)',
      '#4 LDPE — Bags (Check locally)',
      '#5 PP — Containers (Recyclable)',
      '#6 PS — Styrofoam (Not recyclable)',
      '#7 Other — Mixed plastics (Rarely recyclable)',
    ],
  },
  {
    id: 2, title: 'What NOT to Recycle', icon: 'close-circle-outline', color: C.red,
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
    id: 3, title: 'Recycling Preparation', icon: 'checkmark-circle-outline', color: C.green,
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
      { text: 'AI-powered waste classification from photos', icon: 'camera-outline' },
      { text: 'Real-time CO₂ impact calculations', icon: 'cloud-outline' },
      { text: 'Personalized recycling recommendations', icon: 'bulb-outline' },
      { text: 'Progress tracking and sustainability score', icon: 'trending-up-outline' },
      { text: 'Environmental impact equivalents', icon: 'earth-outline' },
    ],
  },
  {
    title: 'Using the Scanner', icon: 'camera-outline',
    features: [
      { text: 'Point camera at any waste item', icon: 'scan-outline' },
      { text: 'Get instant AI classification', icon: 'flash-outline' },
      { text: 'View step-by-step recycling instructions', icon: 'list-outline' },
      { text: 'Track your full waste history', icon: 'time-outline' },
      { text: 'Earn sustainability points over time', icon: 'star-outline' },
    ],
  },
];

const ENV_FACTS = [
  { fact: 'Recycling one aluminum can saves enough energy to run a TV for 3 hours.', impact: 'Energy Conservation', icon: 'flash-outline', color: C.amber, bg: C.amberBg },
  { fact: 'A plastic bottle takes 450 years to decompose in a landfill.', impact: 'Long-term Pollution', icon: 'time-outline', color: C.red, bg: C.redBg },
  { fact: 'The average person generates 4.5 pounds of waste daily.', impact: 'Daily Impact', icon: 'person-outline', color: C.blue, bg: C.blueBg },
  { fact: 'Composting food waste reduces methane emissions by 50%.', impact: 'Climate Action', icon: 'cloud-outline', color: C.green, bg: C.greenBg },
  { fact: 'Recycling 1 ton of paper saves 17 trees and 7,000 gallons of water.', impact: 'Resource Conservation', icon: 'leaf-outline', color: C.teal, bg: C.tealBg },
  { fact: 'E-waste is growing 3× faster than municipal waste worldwide.', impact: 'Digital Impact', icon: 'phone-portrait-outline', color: C.purple, bg: C.purpleBg },
];

const SAMPLE_QUESTIONS = [
  'How to recycle plastic bottles?',
  'What is e-waste and how to dispose of it?',
  'Best composting tips for beginners',
  'How to safely dispose of batteries?',
  'What do recycling numbers 1–7 mean?',
  'How does WACS calculate carbon savings?',
];

const TABS = [
  { key: 'WasteEducation',  label: 'Waste Types',   icon: 'layers-outline' },
  { key: 'RecyclingGuides', label: 'Guides',         icon: 'refresh-circle-outline' },
  { key: 'WACSFeatures',    label: 'How It Works',   icon: 'analytics-outline' },
  { key: 'AIAssistant',     label: 'TMFK AI',        icon: 'chatbubble-ellipses-outline' },
];

// ── TMFK AI integration ───────────────────────────────────────────────────────
const callTMFKAPI = async (question) => {
  if (!TMFK_API_KEY) {
    return getFallback(question);
  }
  try {
    const res = await fetch('https://api.tmfk.ai/v1/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TMFK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tmfk-latest',
        messages: [
          {
            role: 'system',
            content: `You are TMFK AI, a professional waste management and recycling assistant built into the WACS app.
Give clear, concise, actionable advice about waste management, recycling, composting, and sustainability.
Keep responses friendly, structured, and educational. Use short paragraphs and bullet points.
Keep responses under 300 words. Do not use markdown headers.

About WACS: AI-powered waste classification from photos, CO₂ savings tracking, recycling instructions, and sustainability scoring.`,
          },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    return data.message?.content?.[0]?.text || getFallback(question);
  } catch {
    return getFallback(question);
  }
};

const getFallback = (question) => {
  const q = question.toLowerCase();
  if (q.includes('plastic'))
    return "Plastic Recycling Guide\n\nCheck the resin code (#1–7) on the bottom of containers.\n\n• #1 (PETE) and #2 (HDPE) are widely accepted\n• Always rinse containers and remove caps\n• Never put plastic bags in curbside bins — drop them off at grocery stores\n\nUse the WACS Scanner to identify plastic types instantly.";
  if (q.includes('e-waste') || q.includes('electronic'))
    return "E-Waste Disposal\n\nElectronics contain lead, mercury, and cadmium — never throw them in regular trash.\n\n• Find certified e-waste recyclers near you\n• Remove and separately recycle batteries\n• Consider donating working devices to extend their life\n\nTrack your e-waste recycling impact in WACS analytics.";
  if (q.includes('co2') || q.includes('carbon'))
    return "CO₂ Savings in WACS\n\nWACS calculates carbon savings using established emission factors:\n\n• Plastic: 1.5 kg CO₂ saved per kg recycled\n• Metal: 3–8 kg CO₂ saved per kg\n• Glass: 0.6 kg CO₂ saved per kg\n• Paper: 0.9 kg CO₂ saved per kg\n\nScan items to build your personal impact score.";
  if (q.includes('compost'))
    return "Composting Tips\n\nComposting diverts food waste from landfills, cutting methane emissions significantly.\n\n• Mix 'greens' (food scraps) with 'browns' (dry leaves, cardboard)\n• Keep the pile moist but not wet\n• Turn it weekly to add oxygen\n• Avoid meat, dairy, and oily foods\n\nEven a small kitchen bin makes a measurable difference.";
  if (q.includes('battery'))
    return "Battery Disposal\n\nBatteries contain toxic metals that contaminate soil and water.\n\n• Never throw batteries in household trash\n• Tape the terminals on lithium batteries before dropping off\n• Most electronics retailers offer free battery collection\n• Rechargeable batteries last longer — consider switching\n\nUse the WACS map to find a drop-off near you.";
  if (q.includes('number'))
    return "Recycling Numbers 1–7\n\n• #1 PETE: Widely recyclable\n• #2 HDPE: Widely recyclable\n• #3 PVC: Difficult — avoid when possible\n• #4 LDPE: Check locally\n• #5 PP: Recyclable in most programs\n• #6 PS (Styrofoam): Not recyclable\n• #7 Other: Rarely recyclable\n\nWhen in doubt, check your local program's accepted materials list.";
  return "TMFK AI\n\nI can help you with:\n\n• Proper sorting and recycling by material type\n• Environmental impact of your waste choices\n• Composting and organic waste management\n• Safe disposal of hazardous materials\n• How to use WACS features most effectively\n\nAsk me anything about sustainable waste management.";
};

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionLabel = ({ icon, text }) => (
  <View style={s.sectionLabel}>
    <Ionicons name={icon} size={14} color={C.green} />
    <Text style={s.sectionLabelTxt}>{text}</Text>
  </View>
);

const Divider = () => <View style={s.divider} />;

// ── Detail modal sections ─────────────────────────────────────────────────────
const DetailSection = ({ icon, label, content }) => (
  <View style={s.detailSection}>
    <View style={s.detailSectionHead}>
      <Ionicons name={icon} size={13} color={C.green} />
      <Text style={s.detailSectionLabel}>{label}</Text>
    </View>
    <Text style={s.detailSectionTxt}>{content}</Text>
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

  const askAI = async (q) => {
    setLoading(true);
    try {
      const res = await callTMFKAPI(q);
      setAiResponse(res);
    } catch {
      setAiResponse("Unable to connect right now. Please try again in a moment.");
    } finally {
      setLoading(false);
      setAiModalVisible(true);
    }
  };

  const handleAsk = () => {
    if (!userQuestion.trim()) {
      Alert.alert('Empty question', 'Please type a question about waste management.');
      return;
    }
    askAI(userQuestion);
  };

  const openDetail = (w) => { setSelectedWaste(w); setDetailModalVisible(true); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" backgroundColor={C.surface} />
      <View style={s.root}>

        {/* ── Header ── */}
        <View style={s.header}>
          {navigation && (
            <TouchableOpacity style={s.headerBack} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={C.ink} />
            </TouchableOpacity>
          )}
          <View style={s.headerContent}>
            <Text style={s.headerEyebrow}>WACS Learning</Text>
            <Text style={s.headerTitle}>Waste Management</Text>
            <Text style={s.headerSub}>Guides, tips, and AI-powered answers</Text>
          </View>
          <View style={s.headerBadge}>
            <Ionicons name="leaf" size={18} color={C.green} />
          </View>
        </View>

        {/* ── Tab bar ── */}
        <View style={s.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tab, active && s.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab.icon} size={14} color={active ? C.green : C.muted} />
                  <Text style={[s.tabTxt, active && s.tabTxtActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Content ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >

          {/* ══ Waste Types ══ */}
          {activeTab === 'WasteEducation' && (
            <>
              <FadeIn delay={0}>
                <SectionLabel icon="layers-outline" text="Waste categories" />
                <Text style={s.pageDesc}>
                  Tap any category to view disposal tips, recycling processes, and environmental impact.
                </Text>
              </FadeIn>

              {WASTE_TYPES.map((w, i) => (
                <FadeIn key={w.id} delay={i * 45}>
                  <TouchableOpacity style={s.wasteCard} onPress={() => openDetail(w)} activeOpacity={0.82}>
                    <View style={[s.wasteCardAccent, { backgroundColor: w.color }]} />
                    <View style={s.wasteCardBody}>
                      <View style={[s.wasteIconWrap, { backgroundColor: w.colorBg }]}>
                        <Ionicons name={w.icon} size={20} color={w.color} />
                      </View>
                      <View style={s.wasteCardText}>
                        <Text style={s.wasteCardTitle}>{w.title}</Text>
                        <Text style={s.wasteCardDesc} numberOfLines={2}>{w.description}</Text>
                        <View style={s.wasteCardMeta}>
                          {(() => {
                            const cc = CATEGORY_COLOR[w.wacsCategory] || CATEGORY_COLOR['Non-Biodegradable'];
                            return (
                              <View style={[s.chip, { backgroundColor: cc.bg, borderColor: cc.border }]}>
                                <Text style={[s.chipTxt, { color: cc.fg }]}>{w.wacsCategory}</Text>
                              </View>
                            );
                          })()}
                          <Text style={s.wasteCardExamples} numberOfLines={1}>{w.examples}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.muted} style={{ marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                </FadeIn>
              ))}

              <FadeIn delay={380}>
                <Divider />
                <SectionLabel icon="bulb-outline" text="Did you know?" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {ENV_FACTS.map((f, i) => (
                    <View key={i} style={[s.factCard, { borderTopColor: f.color }]}>
                      <View style={[s.factIconWrap, { backgroundColor: f.bg }]}>
                        <Ionicons name={f.icon} size={18} color={f.color} />
                      </View>
                      <Text style={s.factTxt}>{f.fact}</Text>
                      <View style={[s.chip, { backgroundColor: f.bg, borderColor: 'transparent', marginTop: 'auto' }]}>
                        <Text style={[s.chipTxt, { color: f.color }]}>{f.impact}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </FadeIn>
            </>
          )}

          {/* ══ Recycling Guides ══ */}
          {activeTab === 'RecyclingGuides' && (
            <>
              <FadeIn delay={0}>
                <SectionLabel icon="refresh-circle-outline" text="Recycling 101" />
                <Text style={s.pageDesc}>Core knowledge every responsible recycler needs.</Text>
              </FadeIn>

              {RECYCLING_GUIDES.map((guide, i) => (
                <FadeIn key={guide.id} delay={i * 60}>
                  <View style={s.guideCard}>
                    <View style={s.guideCardHeader}>
                      <View style={[s.guideIconWrap, { backgroundColor: guide.color + '18' }]}>
                        <Ionicons name={guide.icon} size={16} color={guide.color} />
                      </View>
                      <Text style={s.guideCardTitle}>{guide.title}</Text>
                    </View>
                    <View style={s.guideLines}>
                      {guide.lines.map((line, li) => (
                        <View key={li} style={s.guideLine}>
                          <View style={[s.guideLineDot, { backgroundColor: guide.color }]} />
                          <Text style={s.guideLineTxt}>{line}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </FadeIn>
              ))}

              <FadeIn delay={220}>
                <View style={s.alertBox}>
                  <View style={s.alertBoxIcon}>
                    <Ionicons name="trophy-outline" size={16} color={C.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertBoxTitle}>Pro tip</Text>
                    <Text style={s.alertBoxTxt}>
                      Use the WACS Scanner to instantly identify recyclable items. The AI recognizes over 100 different materials and gives specific disposal instructions.
                    </Text>
                  </View>
                </View>
              </FadeIn>
            </>
          )}

          {/* ══ How It Works ══ */}
          {activeTab === 'WACSFeatures' && (
            <>
              <FadeIn delay={0}>
                <SectionLabel icon="analytics-outline" text="App features" />
                <Text style={s.pageDesc}>Everything WACS does to support your sustainability journey.</Text>
              </FadeIn>

              {WACS_FEATURES.map((item, i) => (
                <FadeIn key={i} delay={i * 80}>
                  <View style={s.featureCard}>
                    <View style={s.featureCardHeader}>
                      <View style={s.featureIconWrap}>
                        <Ionicons name={item.icon} size={16} color={C.green} />
                      </View>
                      <Text style={s.featureCardTitle}>{item.title}</Text>
                    </View>
                    {item.features.map((f, fi) => (
                      <View key={fi} style={s.featureRow}>
                        <View style={s.featureCheck}>
                          <Ionicons name={f.icon} size={13} color={C.green} />
                        </View>
                        <Text style={s.featureTxt}>{f.text}</Text>
                      </View>
                    ))}
                  </View>
                </FadeIn>
              ))}
            </>
          )}

          {/* ══ TMFK AI ══ */}
          {activeTab === 'AIAssistant' && (
            <>
              <FadeIn delay={0}>
                <SectionLabel icon="chatbubble-ellipses-outline" text="TMFK AI" />
              </FadeIn>

              <FadeIn delay={60}>
                {/* AI Identity Card */}
                <View style={s.aiIdentityCard}>
                  <View style={s.aiIdentityLeft}>
                    <View style={s.aiAvatar}>
                      <Ionicons name="hardware-chip-outline" size={26} color={C.green} />
                    </View>
                    <View style={s.aiOnlineDot} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.aiNameRow}>
                      <Text style={s.aiName}>TMFK AI</Text>
                      <View style={s.aiBadge}>
                        <View style={s.aiBadgeDot} />
                        <Text style={s.aiBadgeTxt}>Online</Text>
                      </View>
                    </View>
                    <Text style={s.aiRole}>Waste Management Assistant</Text>
                    <Text style={s.aiDesc}>
                      Ask me anything about recycling, composting, disposal, or how to use WACS effectively.
                    </Text>
                  </View>
                </View>

                {/* Input area */}
                <View style={s.aiInputCard}>
                  <Text style={s.aiInputLabel}>Your question</Text>
                  <TextInput
                    style={s.aiInput}
                    placeholder="e.g. How do I dispose of old paint?"
                    placeholderTextColor={C.muted}
                    value={userQuestion}
                    onChangeText={setUserQuestion}
                    multiline
                    maxLength={200}
                    textAlignVertical="top"
                  />
                  <View style={s.aiInputFooter}>
                    <Text style={s.aiCharCount}>{userQuestion.length} / 200</Text>
                    <TouchableOpacity
                      style={[s.askBtn, loading && { opacity: 0.6 }]}
                      onPress={handleAsk}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={s.askBtnTxt}>Thinking…</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="send" size={15} color="#fff" />
                          <Text style={s.askBtnTxt}>Ask TMFK AI</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sample questions */}
                <View style={s.samplesSection}>
                  <Text style={s.samplesLabel}>Suggested questions</Text>
                  {SAMPLE_QUESTIONS.map((q, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.sampleRow}
                      onPress={() => setUserQuestion(q)}
                      activeOpacity={0.75}
                    >
                      <View style={s.sampleRowIcon}>
                        <Ionicons name="arrow-forward-circle-outline" size={16} color={C.green} />
                      </View>
                      <Text style={s.sampleRowTxt}>{q}</Text>
                    </TouchableOpacity>
                  ))}
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
                  <View style={s.modalDragHandle} />
                  <View style={s.modalHead}>
                    <View style={[s.modalHeadIcon, { backgroundColor: selectedWaste.colorBg }]}>
                      <Ionicons name={selectedWaste.icon} size={22} color={selectedWaste.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.modalTitle}>{selectedWaste.title}</Text>
                      {(() => {
                        const cc = CATEGORY_COLOR[selectedWaste.wacsCategory] || CATEGORY_COLOR['Non-Biodegradable'];
                        return (
                          <View style={[s.chip, { backgroundColor: cc.bg, borderColor: cc.border, marginTop: 4 }]}>
                            <Text style={[s.chipTxt, { color: cc.fg }]}>{selectedWaste.wacsCategory}</Text>
                          </View>
                        );
                      })()}
                    </View>
                    <TouchableOpacity style={s.modalClose} onPress={() => setDetailModalVisible(false)} activeOpacity={0.7}>
                      <Ionicons name="close" size={18} color={C.body} />
                    </TouchableOpacity>
                  </View>

                  <View style={s.modalDivider} />

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                    <DetailSection icon="information-circle-outline" label="Overview" content={selectedWaste.description} />
                    <DetailSection icon="trash-outline"              label="Disposal tips" content={selectedWaste.disposalTips} />
                    <DetailSection icon="refresh-circle-outline"     label="Recycling process" content={selectedWaste.recyclingProcess} />
                    <DetailSection icon="globe-outline"              label="Environmental impact" content={selectedWaste.environmentalImpact} />
                    <DetailSection icon="cloud-outline"              label="CO₂ impact" content={selectedWaste.co2Impact} />
                    <DetailSection icon="leaf-outline"               label="Sustainable alternatives" content={selectedWaste.alternatives} />

                    <View style={s.detailSection}>
                      <View style={s.detailSectionHead}>
                        <Ionicons name="list-outline" size={13} color={C.green} />
                        <Text style={s.detailSectionLabel}>Common examples</Text>
                      </View>
                      <View style={s.exampleList}>
                        {selectedWaste.examples.split(', ').map((ex, i) => (
                          <View key={i} style={[s.exampleChip, { backgroundColor: selectedWaste.colorBg, borderColor: selectedWaste.colorLine }]}>
                            <Text style={[s.exampleChipTxt, { color: selectedWaste.color }]}>{ex}</Text>
                          </View>
                        ))}
                      </View>
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
              <View style={s.modalDragHandle} />
              <View style={s.modalHead}>
                <View style={s.aiAvatarSm}>
                  <Ionicons name="hardware-chip-outline" size={18} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>TMFK AI</Text>
                  <Text style={s.modalSubtitle}>Waste Management Assistant</Text>
                </View>
                <TouchableOpacity style={s.modalClose} onPress={() => setAiModalVisible(false)} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={C.body} />
                </TouchableOpacity>
              </View>

              <View style={s.aiQuestionBubble}>
                <Ionicons name="person-circle-outline" size={16} color={C.muted} style={{ marginTop: 1 }} />
                <Text style={s.aiQuestionTxt}>{userQuestion}</Text>
              </View>

              <View style={s.modalDivider} />

              <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <Text style={s.aiResponseTxt}>{aiResponse}</Text>
              </ScrollView>

              <TouchableOpacity style={s.confirmBtn} onPress={() => setAiModalVisible(false)} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.confirmBtnTxt}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
};

export default Learning;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.surface },
  root:  { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 4 : 10,
    paddingBottom: 20,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  headerBack: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  headerContent: { flex: 1 },
  headerEyebrow: {
    fontSize: 10, fontWeight: '700', color: C.green,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: C.muted, marginTop: 2 },
  headerBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.greenBg,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // Tab bar
  tabBar: {
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 0,
  },
  tabScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg,
  },
  tabActive:    { backgroundColor: C.greenBg, borderColor: C.greenLine },
  tabTxt:       { fontSize: 12, fontWeight: '600', color: C.muted },
  tabTxtActive: { color: C.green },

  // Scroll content
  scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 },

  // Section label
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionLabelTxt: {
    fontSize: 11, fontWeight: '700', color: C.green,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  pageDesc: { fontSize: 13, color: C.body, lineHeight: 20, marginBottom: 18, marginTop: -2 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 24 },

  // Waste cards
  wasteCard: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: 'hidden',
  },
  wasteCardAccent: { width: 4, flexShrink: 0 },
  wasteCardBody:   { flex: 1, flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  wasteIconWrap: {
    width: 42, height: 42, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  wasteCardText:     { flex: 1 },
  wasteCardTitle:    { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 4 },
  wasteCardDesc:     { fontSize: 12, color: C.body, lineHeight: 18, marginBottom: 8 },
  wasteCardMeta:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  wasteCardExamples: { fontSize: 11, color: C.muted, flex: 1 },

  // Chips
  chip: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  chipTxt: { fontSize: 10, fontWeight: '700' },

  // Fact cards
  factCard: {
    width: 220, marginRight: 10,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3,
    padding: 16,
    gap: 10,
  },
  factIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  factTxt: { fontSize: 13, color: C.ink, lineHeight: 19, flex: 1 },

  // Guide cards
  guideCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 18, marginBottom: 12,
  },
  guideCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  guideIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  guideCardTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  guideLines:     { gap: 10 },
  guideLine:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  guideLineDot:   { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  guideLineTxt:   { fontSize: 13, color: C.body, lineHeight: 20, flex: 1 },

  // Alert / tip box
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: C.amberBg,
    borderWidth: 1, borderColor: C.amberLine,
    borderRadius: 12, padding: 14,
  },
  alertBoxIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  alertBoxTitle: { fontSize: 13, fontWeight: '700', color: C.amber, marginBottom: 4 },
  alertBoxTxt:   { fontSize: 13, color: C.body, lineHeight: 19 },

  // Feature cards
  featureCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 18, marginBottom: 12,
  },
  featureCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  featureIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: C.greenBg,
    alignItems: 'center', justifyContent: 'center',
  },
  featureCardTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 12,
  },
  featureCheck: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: C.greenBg,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featureTxt: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },

  // AI section
  aiIdentityCard: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 12, gap: 14,
    alignItems: 'flex-start',
  },
  aiIdentityLeft: { position: 'relative' },
  aiAvatar: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: C.greenBg,
    borderWidth: 1.5, borderColor: C.greenLine,
    alignItems: 'center', justifyContent: 'center',
  },
  aiOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.green,
    borderWidth: 2, borderColor: C.surface,
  },
  aiNameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  aiName:      { fontSize: 16, fontWeight: '800', color: C.ink },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.greenBg,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 99,
  },
  aiBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  aiBadgeTxt: { fontSize: 10, fontWeight: '700', color: C.green },
  aiRole:      { fontSize: 12, color: C.green, fontWeight: '600', marginBottom: 6 },
  aiDesc:      { fontSize: 12, color: C.muted, lineHeight: 18 },

  aiInputCard: {
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 12,
  },
  aiInputLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  aiInput: {
    height: 90,
    backgroundColor: C.bg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14, color: C.ink,
    lineHeight: 21,
  },
  aiInputFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 10,
  },
  aiCharCount: { fontSize: 11, color: C.muted },
  askBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.green,
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 10,
  },
  askBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  samplesSection: {
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 16, gap: 4,
  },
  samplesLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginBottom: 10,
  },
  sampleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sampleRowIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.greenBg,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sampleRowTxt: { fontSize: 13, color: C.ink, flex: 1, lineHeight: 19 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(13,27,42,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    maxHeight: '93%',
  },
  modalDragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center', marginBottom: 16,
  },
  modalHead: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  modalHeadIcon: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle:    { fontSize: 17, fontWeight: '800', color: C.ink },
  modalSubtitle: { fontSize: 12, color: C.muted, marginTop: 1 },
  modalClose: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  modalDivider: { height: 1, backgroundColor: C.border, marginBottom: 16 },

  detailSection: { marginBottom: 20 },
  detailSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  detailSectionLabel: {
    fontSize: 10, fontWeight: '700', color: C.green,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  detailSectionTxt: { fontSize: 14, color: C.body, lineHeight: 22 },

  exampleList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  exampleChip: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  exampleChipTxt: { fontSize: 12, fontWeight: '600' },

  aiAvatarSm: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: C.greenBg,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  aiQuestionBubble: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: C.bg,
    borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  aiQuestionTxt: { fontSize: 13, color: C.body, flex: 1, lineHeight: 20 },
  aiResponseTxt: { fontSize: 14, color: C.body, lineHeight: 23 },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.green,
    borderRadius: 12, paddingVertical: 14,
  },
  confirmBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});