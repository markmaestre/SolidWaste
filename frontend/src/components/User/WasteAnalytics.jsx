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
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getUserReports } from '../../redux/slices/wasteReportSlice';

const { width } = Dimensions.get('window');

// ── Design tokens (same palette as EditProfile & ReportHistory) ───────────────
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
  redDim:   'rgba(239,68,68,0.1)',
  green:    '#22C55E',
  greenDim: 'rgba(34,197,94,0.13)',
  greenLine:'rgba(34,197,94,0.35)',
  amber:    '#F59E0B',
  amberDim: 'rgba(245,158,11,0.13)',
  amberLine:'rgba(245,158,11,0.35)',
  blue:     '#60A5FA',
  blueDim:  'rgba(96,165,250,0.13)',
  blueLine: 'rgba(96,165,250,0.35)',
  purple:   '#A78BFA',
  purpleDim:'rgba(167,139,250,0.13)',
};

// ── CO₂ emission factors ──────────────────────────────────────────────────────
const CO2_EMISSION_FACTORS = {
  recycling: { plastic:1.5,paper:0.9,glass:0.6,metal:3.0,aluminum:8.0,organic:0.1,electronic:2.5,textile:2.0,cardboard:1.1,default:1.0 },
  landfill:  { plastic:0.1,paper:0.5,glass:0.02,metal:0.05,aluminum:0.05,organic:1.5,electronic:0.8,textile:0.7,cardboard:0.5,default:0.3 },
  incineration:{ plastic:2.5,paper:0.8,glass:0.1,metal:0.1,aluminum:0.1,organic:0.3,electronic:1.2,textile:1.5,cardboard:0.9,default:1.0 },
};
const AVG_ITEM_WEIGHT = {
  plastic:{bottle:0.05,bag:0.01,container:0.03,default:0.03},
  paper:{newspaper:0.1,magazine:0.15,office:0.05,default:0.08},
  glass:{bottle:0.3,jar:0.2,default:0.25},
  metal:{can:0.015,default:0.02},
  organic:{food:0.2,yard:0.5,default:0.3},
  electronic:{small:0.5,medium:2.0,default:1.0},
  default:0.1,
};

// ── Fade-in animation (mirrors EditProfile) ───────────────────────────────────
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
const WASTE_TYPE_COLORS = {
  plastic:'#60A5FA', paper:'#34D399', glass:'#A78BFA',
  metal:'#F59E0B',   organic:'#22C55E', electronic:'#F97316',
  hazardous:'#EF4444', mixed:'#8BA5BC', unknown:'#8BA5BC',
};
const getWasteColor = (t) => WASTE_TYPE_COLORS[(t||'').toLowerCase()] || C.slateL;

const STATUS_META = {
  recycled:  { color: C.green,  dim: C.greenDim, line: C.greenLine, icon: 'refresh-circle-outline' },
  processed: { color: C.blue,   dim: C.blueDim,  line: C.blueLine,  icon: 'checkmark-circle-outline' },
  pending:   { color: C.amber,  dim: C.amberDim, line: C.amberLine, icon: 'time-outline' },
  disposed:  { color: C.red,    dim: C.redDim,   line:'rgba(239,68,68,0.35)', icon: 'trash-outline' },
};
const getStatusMeta = (s) => STATUS_META[s] || { color: C.slateL, dim:'rgba(139,165,188,0.13)', line:'rgba(139,165,188,0.35)', icon:'help-circle-outline' };

const formatCO2 = (v) => {
  const n = parseFloat(v) || 0;
  return n >= 1000 ? `${(n/1000).toFixed(2)}t` : `${Math.abs(n).toFixed(2)}kg`;
};
const formatConfidence = (v) =>
  typeof v === 'number' ? (v <= 1 ? `${Math.round(v*100)}%` : `${Math.round(v)}%`) : `${v}`;

// ─────────────────────────────────────────────────────────────────────────────
const WasteAnalytics = ({ navigation }) => {
  const dispatch   = useDispatch();
  const { reports, loading } = useSelector((s) => s.wasteReport);
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

  const calcWeight = (r) => {
    if (r.weight) return r.weight;
    const wt = (r.classification || 'default').toLowerCase();
    const tw = AVG_ITEM_WEIGHT[wt] || AVG_ITEM_WEIGHT.default;
    const w  = typeof tw === 'object' ? (tw[r.itemType || 'default'] || tw.default || AVG_ITEM_WEIGHT.default) : AVG_ITEM_WEIGHT.default;
    return w * (r.quantity || 1);
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
      recycled:{ total:0, count:0, weight:0 }, processed:{ total:0, count:0, weight:0 },
      disposed:{ total:0, count:0, weight:0 }, pending:  { total:0, count:0, weight:0 },
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
      co2ByWasteType[wt].weight  += weight;
      co2ByWasteType[wt].co2Impact += co2;
      const st = r.status || 'pending';
      statusDistribution[st] = (statusDistribution[st] || 0) + 1;
      if (co2ByStatus[st]) { co2ByStatus[st].count++; co2ByStatus[st].weight += weight; co2ByStatus[st].total += co2; }
      totalConf += r.classificationConfidence || 0;
      totalTips += r.recyclingTips?.length || 0;
    });

    const total = filtered.length;
    const mostCommonWaste = Object.entries(wasteDistribution).sort(([,a],[,b]) => b-a)[0];
    const co2Savings   = Math.max(0, -Math.min(0, totalCO2));
    const co2Emissions = Math.max(0, totalCO2);
    const sustainScore = Math.round(Math.min(100, Math.max(0, ((totalWeight*2.5 - co2Emissions)/(totalWeight*2.5))*100))) || 0;

    setAnalytics({
      totalReports: total,
      totalWeight:  totalWeight.toFixed(2),
      wasteDistribution, statusDistribution, co2ByWasteType, co2ByStatus,
      avgConfidence: Math.round((totalConf/total)*100) || 0,
      totalRecyclingTips: totalTips,
      mostCommonWaste: mostCommonWaste ? {
        type: mostCommonWaste[0],
        count: mostCommonWaste[1],
        percentage: Math.round((mostCommonWaste[1]/total)*100) || 0,
      } : null,
      sustainabilityScore: sustainScore,
      recycledCount:  co2ByStatus.recycled.count,
      processedCount: co2ByStatus.processed.count,
      disposedCount:  co2ByStatus.disposed.count,
      totalCO2Impact: totalCO2.toFixed(2),
      co2Savings:     co2Savings.toFixed(2),
      co2Emissions:   co2Emissions.toFixed(2),
      environmentalEquivalents: {
        treesEquivalent:    co2Savings  > 0 ? Math.max(1, Math.round(co2Savings/21))    : 0,
        carsEquivalent:     co2Emissions > 0 ? (co2Emissions/4600).toFixed(2)           : '0',
        gasolineLiters:     co2Emissions > 0 ? Math.round(co2Emissions*0.43)            : 0,
        smartphonesCharged: co2Savings  > 0 ? Math.round(co2Savings*120)               : 0,
      },
    });
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const SectionHeader = ({ icon, title }) => (
    <View style={s.sectionHeader}>
      <View style={s.sectionIconWrap}>
        <Ionicons name={icon} size={15} color={C.teal} />
      </View>
      <Text style={s.sectionTitle}>{title}</Text>
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

  const ProgressRow = ({ label, percentage, color, valueLabel }) => {
    const pct = Math.min(100, Math.max(0, percentage || 0));
    return (
      <View style={s.progressRow}>
        <View style={s.progressMeta}>
          <Text style={s.progressLabel}>{label}</Text>
          <Text style={[s.progressValueTxt, { color }]}>{valueLabel}</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={s.progressPct}>{pct.toFixed(1)}%</Text>
      </View>
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !refreshing && !analytics) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <View style={s.headerBlob} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Waste Analytics</Text>
            <Text style={s.headerSub}>Carbon footprint tracker</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={s.loadingTxt}>Loading analytics…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>

      {/* ── Header (mirrors EditProfile) ── */}
      <View style={s.header}>
        <View style={s.headerBlob} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Waste Analytics</Text>
          <Text style={s.headerSub}>Carbon footprint tracker</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />
        }
      >
        {/* ── Time filter ── */}
        <FadeIn delay={0}>
          <View style={s.timeFilterWrap}>
            {['week','month','year','all'].map((range) => {
              const active = timeRange === range;
              const icons  = { week:'calendar-outline', month:'today-outline', year:'calendar-clear-outline', all:'infinite-outline' };
              return (
                <TouchableOpacity
                  key={range}
                  style={[s.timeBtn, active && s.timeBtnActive]}
                  onPress={() => setTimeRange(range)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={icons[range]} size={14} color={active ? C.navy : C.teal} />
                  <Text style={[s.timeBtnTxt, active && s.timeBtnTxtActive]}>
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeIn>

        {/* ── Empty ── */}
        {!analytics ? (
          <FadeIn delay={60}>
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="analytics-outline" size={38} color={C.teal} />
              </View>
              <Text style={s.emptyTitle}>No Data Available</Text>
              <Text style={s.emptyText}>
                {reports.length === 0
                  ? 'Start by creating your first waste report to see analytics.'
                  : `No reports found for the selected time range (${timeRange}).`}
              </Text>
            </View>
          </FadeIn>
        ) : (
          <>
            {/* ── Carbon impact overview ── */}
            <FadeIn delay={60}>
              <View style={s.section}>
                <SectionHeader icon="leaf-outline" title="Carbon Impact Overview" />
                <View style={s.metricsGrid}>
                  <MetricCard
                    title="Total Waste"
                    value={`${analytics.totalWeight}kg`}
                    sub={`${analytics.totalReports} items scanned`}
                    accentColor={C.teal}
                    icon="layers-outline"
                  />
                  <MetricCard
                    title="CO₂ Saved"
                    value={formatCO2(analytics.co2Savings)}
                    sub="Through recycling"
                    accentColor={C.green}
                    icon="cloud-outline"
                  />
                  <MetricCard
                    title="CO₂ Emitted"
                    value={formatCO2(analytics.co2Emissions)}
                    sub="From disposed waste"
                    accentColor={C.red}
                    icon="cloud"
                  />
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

            {/* ── Sustainability score ── */}
            <FadeIn delay={100}>
              <View style={s.section}>
                <SectionHeader icon="star-outline" title="Sustainability Score" />
                <View style={s.scoreCard}>
                  {/* Score ring */}
                  <View style={s.scoreRing}>
                    <View style={s.scoreInner}>
                      <Text style={s.scoreNum}>{analytics.sustainabilityScore}</Text>
                      <Text style={s.scoreOf}>/ 100</Text>
                    </View>
                  </View>
                  {/* Score breakdown */}
                  <View style={s.scoreBreakdown}>
                    {[
                      { label:'Recycled',  count: analytics.recycledCount,  color: C.green },
                      { label:'Processed', count: analytics.processedCount, color: C.blue  },
                      { label:'Pending',   count: analytics.totalReports - analytics.recycledCount - analytics.processedCount - analytics.disposedCount, color: C.amber },
                      { label:'Disposed',  count: analytics.disposedCount,  color: C.red   },
                    ].map(({ label, count, color }) => (
                      <View key={label} style={s.scoreRow}>
                        <View style={[s.scoreDot, { backgroundColor: color }]} />
                        <Text style={s.scoreRowLabel}>{label}</Text>
                        <Text style={[s.scoreRowCount, { color }]}>{count} items</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </FadeIn>

            {/* ── Environmental equivalents ── */}
            {analytics.environmentalEquivalents && (
              <FadeIn delay={140}>
                <View style={s.section}>
                  <SectionHeader icon="globe-outline" title="Environmental Impact" />
                  <View style={s.card}>
                    <View style={s.equivGrid}>
                      {[
                        { icon:'leaf-outline',     color: C.green,  value: analytics.environmentalEquivalents.treesEquivalent,    label:'Trees to absorb emissions' },
                        { icon:'car-outline',       color: C.blue,   value: analytics.environmentalEquivalents.carsEquivalent,     label:'Cars off road for a year' },
                        { icon:'flame-outline',     color: C.amber,  value: `${analytics.environmentalEquivalents.gasolineLiters}L`, label:'Gasoline saved' },
                        { icon:'phone-portrait-outline', color: C.purple, value: analytics.environmentalEquivalents.smartphonesCharged, label:'Smartphones charged' },
                      ].map(({ icon, color, value, label }) => (
                        <View key={label} style={s.equivItem}>
                          <View style={[s.equivIconWrap, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
                            <Ionicons name={icon} size={22} color={color} />
                          </View>
                          <Text style={s.equivValue}>{value}</Text>
                          <Text style={s.equivLabel}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </FadeIn>
            )}

            {/* ── CO₂ by waste type ── */}
            {Object.keys(analytics.co2ByWasteType).length > 0 && (
              <FadeIn delay={180}>
                <View style={s.section}>
                  <SectionHeader icon="pie-chart-outline" title="CO₂ Impact by Waste Type" />
                  <View style={s.card}>
                    {Object.entries(analytics.co2ByWasteType)
                      .sort(([,a],[,b]) => Math.abs(b.co2Impact) - Math.abs(a.co2Impact))
                      .map(([type, data]) => {
                        const totalAbs  = Math.abs(parseFloat(analytics.totalCO2Impact)) || 1;
                        const pct       = ((Math.abs(data.co2Impact) / totalAbs) * 100).toFixed(1);
                        const isSaving  = data.co2Impact < 0;
                        const color     = isSaving ? C.green : C.red;
                        return (
                          <ProgressRow
                            key={type}
                            label={`${type} · ${data.count} item${data.count !== 1 ? 's' : ''}`}
                            percentage={pct}
                            color={color}
                            valueLabel={`${isSaving ? '−' : '+'}${formatCO2(data.co2Impact)} ${isSaving ? 'saved' : 'emitted'}`}
                          />
                        );
                      })
                    }
                  </View>
                </View>
              </FadeIn>
            )}

            {/* ── CO₂ by status ── */}
            <FadeIn delay={220}>
              <View style={s.section}>
                <SectionHeader icon="stats-chart-outline" title="CO₂ by Processing Status" />
                <View style={s.statusGrid}>
                  {Object.entries(analytics.co2ByStatus).map(([status, data]) => {
                    if (!data.count) return null;
                    const meta = getStatusMeta(status);
                    return (
                      <View key={status} style={[s.statusCard, { borderTopColor: meta.color }]}>
                        <View style={[s.statusIconWrap, { backgroundColor: meta.dim, borderColor: meta.line }]}>
                          <Ionicons name={meta.icon} size={16} color={meta.color} />
                        </View>
                        <Text style={[s.statusLabel, { color: meta.color }]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                        <Text style={s.statusCount}>{data.count} items</Text>
                        <Text style={s.statusWeight}>{data.weight.toFixed(2)}kg total</Text>
                        <View style={s.statusCO2Row}>
                          <Ionicons
                            name={data.total < 0 ? 'arrow-down-outline' : 'arrow-up-outline'}
                            size={11}
                            color={data.total < 0 ? C.green : C.red}
                          />
                          <Text style={[s.statusCO2, { color: data.total < 0 ? C.green : C.red }]}>
                            {formatCO2(Math.abs(data.total))} {data.total < 0 ? 'saved' : 'emitted'}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </FadeIn>

            {/* ── Insights ── */}
            <FadeIn delay={260}>
              <View style={s.section}>
                <SectionHeader icon="bulb-outline" title="Insights & Recommendations" />
                <View style={s.card}>
                  {[
                    { icon:'pulse-outline',   label:'Avg Classification Confidence', value: `${analytics.avgConfidence}%` },
                    { icon:'receipt-outline', label:'Recycling Tips Received',        value: `${analytics.totalRecyclingTips}` },
                    ...(analytics.mostCommonWaste ? [{
                      icon:'podium-outline',
                      label:'Most Common Waste Type',
                      value: `${analytics.mostCommonWaste.type} (${analytics.mostCommonWaste.percentage}%)`,
                    }] : []),
                  ].map(({ icon, label, value }) => (
                    <View key={label} style={s.insightRow}>
                      <View style={s.insightLeft}>
                        <Ionicons name={icon} size={16} color={C.teal} />
                        <Text style={s.insightLabel}>{label}</Text>
                      </View>
                      <Text style={s.insightValue}>{value}</Text>
                    </View>
                  ))}

                  {parseFloat(analytics.co2Emissions) > 0 && (
                    <View style={s.tipBox}>
                      <View style={[s.tipIconWrap, { backgroundColor: C.amberDim, borderColor: C.amberLine }]}>
                        <Ionicons name="warning-outline" size={16} color={C.amber} />
                      </View>
                      <Text style={s.tipTxt}>
                        To cut your CO₂ emissions by 50%, focus on recycling more{' '}
                        {Object.entries(analytics.co2ByWasteType)
                          .filter(([,d]) => d.co2Impact > 0)
                          .sort(([,a],[,b]) => b.co2Impact - a.co2Impact)
                          .slice(0,2).map(([t]) => t).join(' and ') || 'waste'}.
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
  );
};

export default WasteAnalytics;

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.offWhite },

  // ── Header (identical to EditProfile) ────────────────────────────────────────
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

  // ── Time filter ──────────────────────────────────────────────────────────────
  timeFilterWrap: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: C.ink,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  timeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: C.borderDk,
  },
  timeBtnActive: { backgroundColor: C.teal, borderColor: C.teal },
  timeBtnTxt:    { fontSize: 11, fontWeight: '700', color: C.teal },
  timeBtnTxtActive:{ color: C.navy },

  // ── Section ──────────────────────────────────────────────────────────────────
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.navy },

  // ── Generic card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: C.border,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },

  // ── Metrics grid ─────────────────────────────────────────────────────────────
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    flex: 1, minWidth: (width - 58) / 2,
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  metricIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  metricValue: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 2 },
  metricTitle: { fontSize: 11, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.4 },
  metricSub:   { fontSize: 11, color: C.slateL, marginTop: 3 },

  // ── Score card ───────────────────────────────────────────────────────────────
  scoreCard: {
    backgroundColor: C.white, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 20,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  scoreRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: C.teal,
    backgroundColor: C.tealDim,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreInner: { alignItems: 'center' },
  scoreNum:   { fontSize: 32, fontWeight: '900', color: C.navy },
  scoreOf:    { fontSize: 11, color: C.slateL, fontWeight: '700' },
  scoreBreakdown: { flex: 1, gap: 8 },
  scoreRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreDot:    { width: 8, height: 8, borderRadius: 4 },
  scoreRowLabel:{ flex: 1, fontSize: 13, color: C.slate },
  scoreRowCount:{ fontSize: 12, fontWeight: '700' },

  // ── Environmental equivalents ─────────────────────────────────────────────────
  equivGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  equivItem: {
    width: (width - 80) / 2, alignItems: 'center',
  },
  equivIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  equivValue: { fontSize: 18, fontWeight: '900', color: C.navy, marginBottom: 4 },
  equivLabel: { fontSize: 11, color: C.slateL, textAlign: 'center', lineHeight: 16 },

  // ── Progress row ─────────────────────────────────────────────────────────────
  progressRow: { marginBottom: 16 },
  progressMeta:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:{ fontSize: 12, color: C.slate, fontWeight: '600', flex: 1 },
  progressValueTxt:{ fontSize: 11, fontWeight: '700' },
  progressTrack:{ height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct:  { fontSize: 10, color: C.slateL, textAlign: 'right' },

  // ── Status grid ──────────────────────────────────────────────────────────────
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusCard: {
    flex: 1, minWidth: (width - 58) / 2,
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3,
    shadowColor: 'rgba(7,27,46,0.07)',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  statusIconWrap: {
    width: 34, height: 34, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  statusLabel:  { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  statusCount:  { fontSize: 18, fontWeight: '900', color: C.navy, marginBottom: 2 },
  statusWeight: { fontSize: 11, color: C.slateL, marginBottom: 6 },
  statusCO2Row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusCO2:    { fontSize: 11, fontWeight: '700' },

  // ── Insights ─────────────────────────────────────────────────────────────────
  insightRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  insightLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  insightLabel: { fontSize: 13, color: C.slate, flex: 1 },
  insightValue: { fontSize: 13, fontWeight: '800', color: C.navy },

  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginTop: 14, padding: 14, borderRadius: 12,
    backgroundColor: C.amberDim,
    borderWidth: 1, borderColor: C.amberLine,
  },
  tipIconWrap: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tipTxt: { flex: 1, fontSize: 12, color: C.slate, lineHeight: 18 },

  // ── Empty ────────────────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 8 },
  emptyText:  { fontSize: 14, color: C.slate, textAlign: 'center', lineHeight: 21 },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt:  { marginTop: 14, fontSize: 14, color: C.slate, fontWeight: '600' },
});