import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getUserReports } from '../../redux/slices/wasteReportSlice';

const { width } = Dimensions.get('window');

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
  border:    '#D8E4EE',
  borderDk:  'rgba(255,255,255,0.09)',
  slate:     '#4E6B87',
  slateL:    '#8BA5BC',
  ghost:     'rgba(255,255,255,0.55)',
  red:       '#EF4444',
  redDim:    'rgba(239,68,68,0.12)',
  redLine:   'rgba(239,68,68,0.35)',
  green:     '#22C55E',
  greenDim:  'rgba(34,197,94,0.12)',
  greenLine: 'rgba(34,197,94,0.35)',
  amber:     '#F59E0B',
  amberDim:  'rgba(245,158,11,0.12)',
  amberLine: 'rgba(245,158,11,0.35)',
  blue:      '#60A5FA',
  blueDim:   'rgba(96,165,250,0.12)',
  blueLine:  'rgba(96,165,250,0.35)',
  purple:    '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.12)',
  purpleLine:'rgba(167,139,250,0.35)',
  inkA8:     'rgba(7,27,46,0.08)',
};

// ── CO₂ emission factors ──────────────────────────────────────────────────────
const CO2_EMISSION_FACTORS = {
  recycling:    { plastic:1.5,paper:0.9,glass:0.6,metal:3.0,aluminum:8.0,organic:0.1,electronic:2.5,textile:2.0,cardboard:1.1,default:1.0 },
  landfill:     { plastic:0.1,paper:0.5,glass:0.02,metal:0.05,aluminum:0.05,organic:1.5,electronic:0.8,textile:0.7,cardboard:0.5,default:0.3 },
  incineration: { plastic:2.5,paper:0.8,glass:0.1,metal:0.1,aluminum:0.1,organic:0.3,electronic:1.2,textile:1.5,cardboard:0.9,default:1.0 },
};

// ── Weight lookup table ───────────────────────────────────────────────────────
// Keys must be lowercase — calcWeight normalises classification before lookup.
// Sub-keys match common AI detection labels (full label or last word).
// All weights in kg per single detected object.
const AVG_ITEM_WEIGHT = {
  plastic: {
    // full labels a waste-detection model might output
    'plastic bottle': 0.05, 'plastic bag': 0.01, 'plastic container': 0.08,
    'plastic cup': 0.03,    'plastic straw': 0.002, 'plastic wrapper': 0.01,
    'plastic packaging': 0.04,
    // last-word sub-keys
    bottle: 0.05, bag: 0.01, container: 0.08, cup: 0.03,
    straw: 0.002, wrapper: 0.01, packaging: 0.04, film: 0.01,
    default: 0.04,
  },
  paper: {
    'paper bag': 0.05, 'paper cup': 0.01, 'newspaper': 0.10,
    'magazine': 0.15,  'office paper': 0.05, 'tissue': 0.005,
    bag: 0.05, cup: 0.01, newspaper: 0.10, magazine: 0.15,
    tissue: 0.005, receipt: 0.002,
    default: 0.08,
  },
  glass: {
    'glass bottle': 0.30, 'glass jar': 0.25, 'glass cup': 0.20,
    bottle: 0.30, jar: 0.25, cup: 0.20, shard: 0.05,
    default: 0.25,
  },
  metal: {
    'metal can': 0.015, 'tin can': 0.015, 'aluminum can': 0.015,
    'steel can': 0.03,  'metal lid': 0.01,
    can: 0.015, tin: 0.015, lid: 0.01, scrap: 0.10,
    default: 0.02,
  },
  aluminum: {
    'aluminum can': 0.015, 'aluminium can': 0.015, 'aluminum foil': 0.005,
    can: 0.015, foil: 0.005,
    default: 0.015,
  },
  organic: {
    'food waste': 0.25, 'fruit peel': 0.10, 'vegetable waste': 0.20,
    'yard waste': 0.50, 'food scraps': 0.25, 'leaves': 0.30,
    food: 0.25, fruit: 0.15, vegetable: 0.20, yard: 0.50,
    peel: 0.10, scraps: 0.25, leaves: 0.30,
    default: 0.25,
  },
  electronic: {
    'mobile phone': 0.18, 'smartphone': 0.18, 'laptop': 2.00,
    'tablet': 0.50,       'battery': 0.15,    'charger': 0.10,
    'earphones': 0.03,    'cable': 0.05,      'circuit board': 0.15,
    phone: 0.18, smartphone: 0.18, laptop: 2.00, tablet: 0.50,
    battery: 0.15, charger: 0.10, cable: 0.05, board: 0.15,
    default: 0.50,
  },
  textile: {
    'shirt': 0.20, 'pants': 0.40, 'jeans': 0.50, 'jacket': 0.60,
    'socks': 0.05, 'cloth': 0.25, 'fabric': 0.20,
    shirt: 0.20, pants: 0.40, jeans: 0.50, jacket: 0.60,
    socks: 0.05, cloth: 0.25, fabric: 0.20,
    default: 0.25,
  },
  cardboard: {
    'cardboard box': 0.50, 'cardboard sheet': 0.15, 'carton': 0.10,
    box: 0.50, sheet: 0.15, carton: 0.10, tube: 0.05,
    default: 0.25,
  },
  // flat fallback — unknown classification
  default: 0.10,
};

// ── Animated fade-in ──────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0 }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 440, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 440, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ── Animated score ring ───────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const size = 120, stroke = 8, r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    Animated.timing(anim, { toValue: score / 100, duration: 900, delay: 200, useNativeDriver: false }).start();
  }, [score]);

  const color = score >= 70 ? C.green : score >= 40 ? C.amber : C.red;

  return (
    <View style={[s.ringWrap, { width: size, height: size }]}>
      <View style={[s.ringBg, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: C.border }]} />
      <View style={[s.ringFill, {
        width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: color,
        borderRightColor: score < 25 ? 'transparent' : color,
        borderBottomColor: score < 50 ? 'transparent' : color,
        borderLeftColor: score < 75 ? 'transparent' : color,
        transform: [{ rotate: '-90deg' }],
      }]} />
      <View style={s.ringCenter}>
        <Text style={[s.ringScore, { color }]}>{score}</Text>
        <Text style={s.ringOf}>/ 100</Text>
      </View>
    </View>
  );
};

// ── Animated progress bar ─────────────────────────────────────────────────────
const AnimatedBar = ({ pct, color, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct / 100, duration: 700, delay, useNativeDriver: false }).start();
  }, [pct]);
  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={s.barTrack}>
      <Animated.View style={[s.barFill, { width: barWidth, backgroundColor: color }]} />
    </View>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  recycled:  { color: C.green,  dim: C.greenDim,  line: C.greenLine,  icon: 'refresh-circle-outline' },
  processed: { color: C.blue,   dim: C.blueDim,   line: C.blueLine,   icon: 'checkmark-circle-outline' },
  pending:   { color: C.amber,  dim: C.amberDim,  line: C.amberLine,  icon: 'time-outline' },
  disposed:  { color: C.red,    dim: C.redDim,    line: C.redLine,    icon: 'trash-outline' },
};
const getStatusMeta = (s) => STATUS_META[s] || { color: C.slateL, dim:'rgba(139,165,188,0.13)', line:'rgba(139,165,188,0.35)', icon:'help-circle-outline' };

const formatCO2 = (v) => {
  const n = parseFloat(v) || 0;
  return n >= 1000 ? `${(n/1000).toFixed(2)}t` : `${Math.abs(n).toFixed(2)}kg`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionHeader = ({ icon, title, sub }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionIconWrap}>
      <Ionicons name={icon} size={15} color={C.teal} />
    </View>
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
    </View>
  </View>
);

const MetricCard = ({ title, value, sub, accentColor, icon }) => (
  <View style={[s.metricCard, { borderTopColor: accentColor }]}>
    <View style={[s.metricIconWrap, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44` }]}>
      <Ionicons name={icon} size={18} color={accentColor} />
    </View>
    <Text style={s.metricValue}>{value}</Text>
    <Text style={s.metricTitle}>{title}</Text>
    {sub ? <Text style={s.metricSub}>{sub}</Text> : null}
  </View>
);

const TimeBtn = ({ range, active, onPress }) => {
  const icons = { week:'calendar-outline', month:'today-outline', year:'calendar-clear-outline', all:'infinite-outline' };
  return (
    <TouchableOpacity
      style={[s.timeBtn, active && s.timeBtnActive]}
      onPress={() => onPress(range)}
      activeOpacity={0.8}
    >
      <Ionicons name={icons[range]} size={13} color={active ? C.navy : C.teal} />
      <Text style={[s.timeBtnTxt, active && s.timeBtnTxtActive]}>
        {range.charAt(0).toUpperCase() + range.slice(1)}
      </Text>
    </TouchableOpacity>
  );
};

const ProgressRow = ({ label, sublabel, pct, color, valueLabel, delay }) => (
  <View style={s.progressRow}>
    <View style={s.progressTop}>
      <View style={{ flex: 1 }}>
        <Text style={s.progressLabel}>{label}</Text>
        {sublabel ? <Text style={s.progressSublabel}>{sublabel}</Text> : null}
      </View>
      <Text style={[s.progressValue, { color }]}>{valueLabel}</Text>
    </View>
    <AnimatedBar pct={Math.min(100, Math.max(0, pct))} color={color} delay={delay || 0} />
    <Text style={s.progressPct}>{(pct).toFixed(1)}%</Text>
  </View>
);

const StatusCard = ({ status, data }) => {
  const meta = getStatusMeta(status);
  if (!data.count) return null;
  return (
    <View style={[s.statusCard, { borderTopColor: meta.color }]}>
      <View style={[s.statusIconWrap, { backgroundColor: meta.dim, borderColor: meta.line }]}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
      </View>
      <Text style={[s.statusLabel, { color: meta.color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
      <Text style={s.statusCount}>{data.count}</Text>
      <Text style={s.statusCountLabel}>items</Text>
      <View style={s.statusDivider} />
      <Text style={s.statusWeight}>{data.weight.toFixed(2)} kg</Text>
      <View style={[s.statusCO2Pill, { backgroundColor: data.total < 0 ? C.greenDim : C.redDim, borderColor: data.total < 0 ? C.greenLine : C.redLine }]}>
        <Ionicons name={data.total < 0 ? 'arrow-down' : 'arrow-up'} size={10} color={data.total < 0 ? C.green : C.red} />
        <Text style={[s.statusCO2Txt, { color: data.total < 0 ? C.green : C.red }]}>
          {formatCO2(Math.abs(data.total))} {data.total < 0 ? 'saved' : 'emitted'}
        </Text>
      </View>
    </View>
  );
};

const InsightRow = ({ icon, label, value, last }) => (
  <View style={[s.insightRow, last && { borderBottomWidth: 0 }]}>
    <View style={s.insightLeft}>
      <View style={s.insightIconWrap}>
        <Ionicons name={icon} size={14} color={C.teal} />
      </View>
      <Text style={s.insightLabel}>{label}</Text>
    </View>
    <Text style={s.insightValue}>{value}</Text>
  </View>
);

// ── FIX: EquivTile now uses flex layout, not fixed pixel width ────────────────
const EquivTile = ({ icon, color, value, label }) => (
  <View style={s.equivTile}>
    <View style={[s.equivIcon, { backgroundColor: `${color}20`, borderColor: `${color}40` }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={[s.equivValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={s.equivLabel} numberOfLines={2}>{label}</Text>
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
const WasteAnalytics = ({ navigation }) => {
  const dispatch = useDispatch();
  const { reports, loading } = useSelector((st) => st.wasteReport);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange,  setTimeRange]  = useState('all');
  const [analytics,  setAnalytics]  = useState(null);

  useEffect(() => { loadReports(); }, []);
  useEffect(() => { if (reports.length > 0) calculateAnalytics(); }, [reports, timeRange]);

  const loadReports = async () => {
    try { await dispatch(getUserReports({ limit: 1000 })).unwrap(); }
    catch (e) { console.error('Failed to load reports:', e); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadReports(); setRefreshing(false); };

  const filterByTime = (reps) => {
    if (timeRange === 'all') return reps;
    const now = new Date();
    const start = {
      week:  new Date(new Date().setDate(now.getDate() - 7)),
      month: new Date(new Date().setMonth(now.getMonth() - 1)),
      year:  new Date(new Date().setFullYear(now.getFullYear() - 1)),
    }[timeRange];
    return reps.filter(r => new Date(r.scanDate || r.createdAt) >= start);
  };

  // ── calcWeight ────────────────────────────────────────────────────────────────
  // Backend stores NO weight / quantity / itemType fields directly.
  // Real schema fields we use:
  //   r.classification   — "Plastic", "Organic", etc.
  //   r.detectedObjects  — [{ label, confidence, ... }, ...]
  //
  // Quantity  = detectedObjects.length (how many objects the AI found), min 1
  // Item type = first detected object's label, e.g. "plastic bottle" → try
  //             full label then last word to hit sub-keys like "bottle"
  const calcWeight = (r) => {
    // 1. Quantity from number of detected objects
    const quantity = (r.detectedObjects && r.detectedObjects.length > 0)
      ? r.detectedObjects.length
      : 1;

    // 2. Classification key (normalised to lowercase)
    const classKey = (r.classification || '').toLowerCase().trim();

    // 3. Item-type from the first (usually highest-confidence) detected object
    //    e.g. label = "plastic bottle" → try "plastic bottle", then "bottle"
    const rawLabel  = (r.detectedObjects?.[0]?.label || '').toLowerCase().trim();
    const labelLast = rawLabel.split(' ').pop();

    // 4. Resolve unit weight from table
    const entry = AVG_ITEM_WEIGHT[classKey];
    let unitWeight;
    if (!entry) {
      unitWeight = AVG_ITEM_WEIGHT.default;
    } else if (typeof entry === 'object') {
      unitWeight = entry[rawLabel] ?? entry[labelLast] ?? entry.default ?? AVG_ITEM_WEIGHT.default;
    } else {
      unitWeight = entry;
    }

    return unitWeight * quantity;
  };

  const calcCO2 = (r, wasteType, weight) => {
    const t = (wasteType || 'default').toLowerCase();
    switch (r.status || 'pending') {
      case 'recycled':  return -(weight * (CO2_EMISSION_FACTORS.recycling[t] || CO2_EMISSION_FACTORS.recycling.default));
      case 'processed': return -(weight * (t === 'organic' ? 0.5 : 0.3));
      case 'disposed':  return  (weight * (CO2_EMISSION_FACTORS.landfill[t]  || CO2_EMISSION_FACTORS.landfill.default));
      default:          return  (weight * (CO2_EMISSION_FACTORS.landfill[t]  || CO2_EMISSION_FACTORS.landfill.default));
    }
  };

  const calculateAnalytics = () => {
    const filtered = filterByTime(reports);
    if (!filtered.length) { setAnalytics(null); return; }



    const wasteDistribution = {}, statusDistribution = {}, co2ByWasteType = {};
    const co2ByStatus = {
      recycled:  { total:0, count:0, weight:0 },
      processed: { total:0, count:0, weight:0 },
      disposed:  { total:0, count:0, weight:0 },
      pending:   { total:0, count:0, weight:0 },
    };
    let totalConf=0, totalTips=0, totalWeight=0, totalCO2=0;

    filtered.forEach(r => {
      const wt     = r.classification || 'Unknown';
      const weight = calcWeight(r);
      const co2    = calcCO2(r, wt, weight);
      totalWeight += weight; totalCO2 += co2;
      wasteDistribution[wt] = (wasteDistribution[wt] || 0) + 1;
      if (!co2ByWasteType[wt]) co2ByWasteType[wt] = { count:0, weight:0, co2Impact:0 };
      co2ByWasteType[wt].count++;
      co2ByWasteType[wt].weight   += weight;
      co2ByWasteType[wt].co2Impact += co2;
      const st = r.status || 'pending';
      statusDistribution[st] = (statusDistribution[st] || 0) + 1;
      if (co2ByStatus[st]) { co2ByStatus[st].count++; co2ByStatus[st].weight += weight; co2ByStatus[st].total += co2; }
      totalConf += r.classificationConfidence || 0;
      totalTips += r.recyclingTips?.length || 0;
    });

    const total        = filtered.length;
    const mostCommon   = Object.entries(wasteDistribution).sort(([,a],[,b]) => b-a)[0];
    const co2Savings   = Math.max(0, -Math.min(0, totalCO2));
    const co2Emissions = Math.max(0, totalCO2);
    const sustainScore = Math.round(Math.min(100, Math.max(0, ((totalWeight*2.5 - co2Emissions)/(totalWeight*2.5))*100))) || 0;

    setAnalytics({
      totalReports: total,
      totalWeight:  totalWeight.toFixed(2),
      wasteDistribution, statusDistribution, co2ByWasteType, co2ByStatus,
      avgConfidence:     Math.round((totalConf/total)*100) || 0,
      totalRecyclingTips: totalTips,
      mostCommonWaste: mostCommon ? {
        type: mostCommon[0], count: mostCommon[1],
        percentage: Math.round((mostCommon[1]/total)*100) || 0,
      } : null,
      sustainabilityScore: sustainScore,
      recycledCount:  co2ByStatus.recycled.count,
      processedCount: co2ByStatus.processed.count,
      disposedCount:  co2ByStatus.disposed.count,
      totalCO2Impact: totalCO2.toFixed(2),
      co2Savings:     co2Savings.toFixed(2),
      co2Emissions:   co2Emissions.toFixed(2),
      environmentalEquivalents: {
        treesEquivalent:    co2Savings  > 0 ? Math.max(1, Math.round(co2Savings/21))  : 0,
        carsEquivalent:     co2Emissions > 0 ? (co2Emissions/4600).toFixed(2)         : '0',
        gasolineLiters:     co2Emissions > 0 ? Math.round(co2Emissions*0.43)          : 0,
        smartphonesCharged: co2Savings  > 0 ? Math.round(co2Savings*120)             : 0,
      },
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading && !refreshing && !analytics) {
    return (
      <SafeAreaView style={s.rootSafe} edges={['top']}>
        <StatusBar style="light" backgroundColor={C.ink} />
        <View style={s.root}>
          <View style={s.header}>
            <View style={s.headerBlob1} />
            <View style={s.headerBlob2} />
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={C.white} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerLabel}>Carbon Tracker</Text>
              <Text style={s.headerTitle}>Waste Analytics</Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
          <View style={s.loadingWrap}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={s.loadingTxt}>Crunching your data…</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.rootSafe} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />
      <View style={s.root}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerBlob1} />
          <View style={s.headerBlob2} />
          <View style={s.headerGrid} />

          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={C.white} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerLabel}>Carbon Tracker</Text>
              <Text style={s.headerTitle}>Waste Analytics</Text>
            </View>
            <View style={s.headerBadge}>
              <Ionicons name="leaf-outline" size={13} color={C.teal} />
              <Text style={s.headerBadgeTxt}>Live</Text>
            </View>
          </View>

          <View style={s.timeFilterRow}>
            {['week','month','year','all'].map((r) => (
              <TimeBtn key={r} range={r} active={timeRange === r} onPress={setTimeRange} />
            ))}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 52 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} colors={[C.teal]} />
          }
        >

          {/* ── Empty state ── */}
          {!analytics ? (
            <FadeIn delay={60}>
              <View style={s.emptyWrap}>
                <View style={s.emptyIconWrap}>
                  <Ionicons name="analytics-outline" size={40} color={C.teal} />
                </View>
                <Text style={s.emptyTitle}>No Data Yet</Text>
                <Text style={s.emptyText}>
                  {reports.length === 0
                    ? 'Create your first waste report to see carbon analytics here.'
                    : `No reports found for "${timeRange}". Try a wider time range.`}
                </Text>
              </View>
            </FadeIn>
          ) : (
            <>
              {/* ══ 1. Carbon impact overview ══ */}
              <FadeIn delay={40}>
                <View style={s.section}>
                  <SectionHeader icon="leaf-outline" title="Carbon Impact" sub="Overall waste carbon footprint" />
                  <View style={s.metricsGrid}>
                    <MetricCard title="Total Waste"  value={`${analytics.totalWeight}kg`} sub={`${analytics.totalReports} items`} accentColor={C.teal}  icon="layers-outline" />
                    <MetricCard title="CO₂ Saved"    value={formatCO2(analytics.co2Savings)}   sub="Via recycling"     accentColor={C.green} icon="cloud-outline" />
                    <MetricCard title="CO₂ Emitted"  value={formatCO2(analytics.co2Emissions)} sub="From disposal"     accentColor={C.red}   icon="cloud" />
                    <MetricCard
                      title="Net Impact"
                      value={formatCO2(analytics.totalCO2Impact)}
                      sub={parseFloat(analytics.totalCO2Impact) < 0 ? 'Carbon negative 🎉' : 'Carbon positive'}
                      accentColor={parseFloat(analytics.totalCO2Impact) < 0 ? C.green : C.amber}
                      icon={parseFloat(analytics.totalCO2Impact) < 0 ? 'trending-down-outline' : 'trending-up-outline'}
                    />
                  </View>
                </View>
              </FadeIn>

              {/* ══ 2. Sustainability score ══ */}
              <FadeIn delay={100}>
                <View style={s.section}>
                  <SectionHeader icon="star-outline" title="Sustainability Score" sub="Based on recycling behaviour" />
                  <View style={s.scoreCard}>
                    <ScoreRing score={analytics.sustainabilityScore} />
                    <View style={s.scoreRight}>
                      {[
                        { label:'Recycled',  count: analytics.recycledCount,  color: C.green },
                        { label:'Processed', count: analytics.processedCount, color: C.blue  },
                        { label:'Pending',   count: analytics.totalReports - analytics.recycledCount - analytics.processedCount - analytics.disposedCount, color: C.amber },
                        { label:'Disposed',  count: analytics.disposedCount,  color: C.red   },
                      ].map(({ label, count, color }) => (
                        <View key={label} style={s.scoreRow}>
                          <View style={[s.scoreDot, { backgroundColor: color }]} />
                          <Text style={s.scoreRowLabel}>{label}</Text>
                          <Text style={[s.scoreRowCount, { color }]}>{count}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </FadeIn>

              {/* ══ 3. Environmental equivalents ══ */}
              {analytics.environmentalEquivalents && (
                <FadeIn delay={160}>
                  <View style={s.section}>
                    <SectionHeader icon="globe-outline" title="Environmental Equivalents" sub="Your impact in real-world terms" />
                    {/* FIX: replaced equivGrid+equivTile with a proper 2-column layout */}
                    <View style={s.card}>
                      <View style={s.equivRow}>
                        <EquivTile
                          icon="leaf-outline"
                          color={C.green}
                          value={String(analytics.environmentalEquivalents.treesEquivalent)}
                          label="Trees to absorb emissions"
                        />
                        <View style={s.equivDividerV} />
                        <EquivTile
                          icon="car-outline"
                          color={C.blue}
                          value={String(analytics.environmentalEquivalents.carsEquivalent)}
                          label="Cars off road / yr"
                        />
                      </View>
                      <View style={s.equivDividerH} />
                      <View style={s.equivRow}>
                        <EquivTile
                          icon="flame-outline"
                          color={C.amber}
                          value={`${analytics.environmentalEquivalents.gasolineLiters}L`}
                          label="Gasoline equivalent"
                        />
                        <View style={s.equivDividerV} />
                        <EquivTile
                          icon="phone-portrait-outline"
                          color={C.purple}
                          value={String(analytics.environmentalEquivalents.smartphonesCharged)}
                          label="Smartphones charged"
                        />
                      </View>
                    </View>
                  </View>
                </FadeIn>
              )}

              {/* ══ 4. CO₂ by waste type ══ */}
              {Object.keys(analytics.co2ByWasteType).length > 0 && (
                <FadeIn delay={200}>
                  <View style={s.section}>
                    <SectionHeader icon="pie-chart-outline" title="CO₂ by Waste Type" sub="Which materials drive your footprint" />
                    <View style={s.card}>
                      {Object.entries(analytics.co2ByWasteType)
                        .sort(([,a],[,b]) => Math.abs(b.co2Impact) - Math.abs(a.co2Impact))
                        .map(([type, data], i) => {
                          const totalAbs = Math.abs(parseFloat(analytics.totalCO2Impact)) || 1;
                          const pct      = (Math.abs(data.co2Impact) / totalAbs) * 100;
                          const isSaving = data.co2Impact < 0;
                          const color    = isSaving ? C.green : C.red;
                          return (
                            <ProgressRow
                              key={type}
                              label={type}
                              sublabel={`${data.count} item${data.count !== 1 ? 's' : ''} · ${data.weight.toFixed(2)}kg`}
                              pct={pct}
                              color={color}
                              valueLabel={`${isSaving ? '−' : '+'}${formatCO2(data.co2Impact)}`}
                              delay={i * 60}
                            />
                          );
                        })}
                    </View>
                  </View>
                </FadeIn>
              )}

              {/* ══ 5. CO₂ by processing status ══ */}
              <FadeIn delay={240}>
                <View style={s.section}>
                  <SectionHeader icon="stats-chart-outline" title="By Processing Status" sub="CO₂ breakdown per disposal method" />
                  <View style={s.statusGrid}>
                    {Object.entries(analytics.co2ByStatus).map(([status, data]) => (
                      <StatusCard key={status} status={status} data={data} />
                    ))}
                  </View>
                </View>
              </FadeIn>

              {/* ══ 6. Insights ══ */}
              <FadeIn delay={280}>
                <View style={s.section}>
                  <SectionHeader icon="bulb-outline" title="Insights" sub="AI-generated observations" />
                  <View style={s.card}>
                    <InsightRow icon="pulse-outline"   label="Avg Classification Confidence" value={`${analytics.avgConfidence}%`} />
                    <InsightRow icon="receipt-outline" label="Recycling Tips Received"        value={`${analytics.totalRecyclingTips}`} />
                    {analytics.mostCommonWaste && (
                      <InsightRow
                        icon="podium-outline"
                        label="Most Common Waste Type"
                        value={`${analytics.mostCommonWaste.type} (${analytics.mostCommonWaste.percentage}%)`}
                        last
                      />
                    )}

                    {parseFloat(analytics.co2Emissions) > 0 && (
                      <View style={s.tipBox}>
                        <View style={[s.tipIcon, { backgroundColor: C.amberDim, borderColor: C.amberLine }]}>
                          <Ionicons name="warning-outline" size={15} color={C.amber} />
                        </View>
                        <Text style={s.tipTxt}>
                          Recycling more{' '}
                          <Text style={{ color: C.amber, fontWeight: '700' }}>
                            {Object.entries(analytics.co2ByWasteType)
                              .filter(([,d]) => d.co2Impact > 0)
                              .sort(([,a],[,b]) => b.co2Impact - a.co2Impact)
                              .slice(0, 2).map(([t]) => t).join(' and ') || 'waste'}
                          </Text>
                          {' '}could cut your emissions by up to 50%.
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </FadeIn>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default WasteAnalytics;


const CARD_SHADOW = {
  shadowColor: 'rgba(7,27,46,0.08)',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 12,
  elevation: 3,
};

const s = StyleSheet.create({
  rootSafe: { flex: 1, backgroundColor: C.ink },
  root: { flex: 1, backgroundColor: C.offWhite },

  header: {
    backgroundColor: C.ink,
    paddingTop: Platform.OS === 'ios' ? 8 : 8,
    paddingBottom: 0,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    marginBottom: 4,
  },
  headerBlob1: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: C.tealGlow, top: -100, right: -80,
  },
  headerBlob2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,201,167,0.07)', bottom: -20, left: -30,
  },
  headerGrid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: C.borderDk,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel:  { fontSize: 10, color: C.teal, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle:  { fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: -0.3 },
  headerBadge:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.tealDim, borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 1, borderColor: C.tealLine,
  },
  headerBadgeTxt: { fontSize: 11, color: C.teal, fontWeight: '700' },

  timeFilterRow: {
    flexDirection: 'row', gap: 8,
    paddingBottom: 18,
  },
  timeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: C.borderDk,
  },
  timeBtnActive:    { backgroundColor: C.teal, borderColor: C.teal },
  timeBtnTxt:       { fontSize: 11, fontWeight: '700', color: C.teal },
  timeBtnTxtActive: { color: C.navy },

  // ── Section ───────────────────────────────────────────────────────────────────
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.navy, letterSpacing: -0.2 },
  sectionSub:   { fontSize: 11, color: C.slateL, marginTop: 1 },

  // ── Generic card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border, ...CARD_SHADOW,
  },

  // ── Metrics grid ──────────────────────────────────────────────────────────────
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    flex: 1, minWidth: (width - 58) / 2,
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3,
    ...CARD_SHADOW,
  },
  metricIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  metricValue: { fontSize: 22, fontWeight: '900', color: C.navy, marginBottom: 2 },
  metricTitle: { fontSize: 10, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricSub:   { fontSize: 11, color: C.slateL, marginTop: 4 },

  // ── Score card ────────────────────────────────────────────────────────────────
  scoreCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 20,
    ...CARD_SHADOW,
  },
  ringWrap:   { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringBg:     { position: 'absolute' },
  ringFill:   { position: 'absolute' },
  ringCenter: { alignItems: 'center' },
  ringScore:  { fontSize: 30, fontWeight: '900' },
  ringOf:     { fontSize: 10, color: C.slateL, fontWeight: '700' },
  scoreRight: { flex: 1, gap: 10 },
  scoreRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  scoreRowLabel: { flex: 1, fontSize: 13, color: C.slate },
  scoreRowCount: { fontSize: 13, fontWeight: '800' },

  // ── Environmental equivalents — FIX ──────────────────────────────────────────
  // Two rows of two tiles, each row separated by a divider.
  // Tiles use flex:1 so they share the available width equally regardless of
  // screen size.  No hardcoded pixel widths.
  equivRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  equivDividerV: {
    width: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  equivDividerH: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 16,
  },
  equivTile: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  equivIcon: {
    width: 52, height: 52, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  equivValue: {
    fontSize: 20, fontWeight: '900', marginBottom: 4,
    maxWidth: '100%',
  },
  equivLabel: {
    fontSize: 11, color: C.slateL, textAlign: 'center', lineHeight: 16,
  },

  // ── Progress rows ─────────────────────────────────────────────────────────────
  progressRow:     { marginBottom: 18 },
  progressTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  progressLabel:   { fontSize: 13, color: C.navy, fontWeight: '700' },
  progressSublabel:{ fontSize: 11, color: C.slateL, marginTop: 1 },
  progressValue:   { fontSize: 12, fontWeight: '800', marginLeft: 8 },
  barTrack: {
    height: 7, backgroundColor: C.border, borderRadius: 4,
    overflow: 'hidden', marginBottom: 4,
  },
  barFill:    { height: '100%', borderRadius: 4 },
  progressPct:{ fontSize: 10, color: C.slateL, textAlign: 'right' },

  // ── Status grid ───────────────────────────────────────────────────────────────
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusCard: {
    flex: 1, minWidth: (width - 58) / 2,
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3,
    ...CARD_SHADOW,
  },
  statusIconWrap: {
    width: 34, height: 34, borderRadius: 9,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  statusLabel:     { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  statusCount:     { fontSize: 26, fontWeight: '900', color: C.navy, lineHeight: 30 },
  statusCountLabel:{ fontSize: 11, color: C.slateL, marginBottom: 6 },
  statusDivider:   { height: 1, backgroundColor: C.border, marginBottom: 8 },
  statusWeight:    { fontSize: 12, color: C.slate, fontWeight: '600', marginBottom: 8 },
  statusCO2Pill:   {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start',
  },
  statusCO2Txt: { fontSize: 11, fontWeight: '700' },

  // ── Insight rows ──────────────────────────────────────────────────────────────
  insightRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  insightLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  insightIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.tealDim, alignItems: 'center', justifyContent: 'center',
  },
  insightLabel: { fontSize: 13, color: C.slate, flex: 1 },
  insightValue: { fontSize: 14, fontWeight: '800', color: C.navy },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: 14, padding: 14, borderRadius: 12,
    backgroundColor: C.amberDim, borderWidth: 1, borderColor: C.amberLine,
  },
  tipIcon: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  tipTxt: { flex: 1, fontSize: 13, color: C.slate, lineHeight: 19 },

  // ── Empty ────────────────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 84, height: 84, borderRadius: 24,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: C.navy, marginBottom: 10, letterSpacing: -0.3 },
  emptyText:  { fontSize: 14, color: C.slateL, textAlign: 'center', lineHeight: 22 },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt:  { marginTop: 14, fontSize: 14, color: C.slate, fontWeight: '600' },
});