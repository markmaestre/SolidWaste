import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  RefreshControl,
  FlatList,
  Dimensions,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSelector, useDispatch } from "react-redux";
import {
  getUserReports,
  archiveReport,
  clearError,
  clearSuccess,
  getReportById,
} from "../../redux/slices/wasteReportSlice";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// ── Design tokens ───────────────────────────────────────────────
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
  redLine:  'rgba(239,68,68,0.25)',
  green:    '#22C55E',
  orange:   '#F97316',
  amber:    '#F59E0B',
  indigo:   '#818CF8',
  violet:   '#A78BFA',
  blue:     '#60A5FA',
  slateDim: 'rgba(71,85,105,0.13)',
  slateLine: 'rgba(71,85,105,0.35)',
};

// ── Fade-in animation ──────────────────────────────────────────
const FadeIn = ({ children, delay = 0 }) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
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

// ── Status meta ─────────────────────────────────────────────────
const STATUS_META = {
  pending:   { label: 'Pending',   color: C.amber,  bg: 'rgba(245,158,11,0.13)',  border: 'rgba(245,158,11,0.35)',  icon: 'time-outline' },
  scheduled: { label: 'Scheduled', color: C.indigo, bg: 'rgba(129,140,248,0.13)', border: 'rgba(129,140,248,0.35)', icon: 'calendar-outline' },
  processed: { label: 'Processed', color: C.blue,   bg: 'rgba(96,165,250,0.13)',  border: 'rgba(96,165,250,0.35)',  icon: 'sync-outline' },
  recycled:  { label: 'Recycled',  color: C.green,  bg: 'rgba(34,197,94,0.13)',   border: 'rgba(34,197,94,0.35)',   icon: 'refresh-circle-outline' },
  completed: { label: 'Completed', color: C.teal,   bg: C.tealDim,                border: C.tealLine,                icon: 'checkmark-done-circle-outline' },
  disposed:  { label: 'Disposed',  color: C.red,    bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.35)',   icon: 'trash-outline' },
  rejected:  { label: 'Rejected',  color: C.violet, bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.35)', icon: 'close-circle-outline' },
};

const getStatusMeta = (s) =>
  STATUS_META[s] || {
    label: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown',
    color: C.slateL,
    bg: 'rgba(139,165,188,0.13)',
    border: 'rgba(139,165,188,0.35)',
    icon: 'help-circle-outline',
  };

// Filter options
const FILTER_OPTIONS = [
  { key: 'all', label: 'Active', icon: 'layers-outline', color: C.teal },
  { key: 'archived', label: 'Archived', icon: 'archive-outline', color: C.slate },
  { key: 'pending', label: 'Pending', icon: 'time-outline', color: C.amber },
  { key: 'scheduled', label: 'Scheduled', icon: 'calendar-outline', color: C.indigo },
  { key: 'processed', label: 'Processed', icon: 'sync-outline', color: C.blue },
  { key: 'recycled', label: 'Recycled', icon: 'refresh-circle-outline', color: C.green },
  { key: 'completed', label: 'Completed', icon: 'checkmark-done-circle-outline', color: C.teal },
  { key: 'disposed', label: 'Disposed', icon: 'trash-outline', color: C.red },
  { key: 'rejected', label: 'Rejected', icon: 'close-circle-outline', color: C.violet },
];

const CLASS_META = {
  Recyclable:      { color: C.green,  icon: 'leaf-outline' },
  recyclable:      { color: C.green,  icon: 'leaf-outline' },
  Organic:         { color: C.orange, icon: 'nutrition-outline' },
  organic:         { color: C.orange, icon: 'nutrition-outline' },
  'Special Waste': { color: C.red,    icon: 'alert-circle-outline' },
  special_waste:   { color: C.red,    icon: 'alert-circle-outline' },
  Hazardous:       { color: C.red,    icon: 'skull-outline' },
  hazardous:       { color: C.red,    icon: 'skull-outline' },
  General:         { color: C.slate,  icon: 'trash-bin-outline' },
  general_waste:   { color: C.slate,  icon: 'trash-bin-outline' },
  'Residual / Non-Recyclable': { color: C.slate, icon: 'trash-outline' },
};

const getClassMeta = (c) => CLASS_META[c] || { color: C.slateL, icon: 'help-circle-outline' };

const getConfidenceColor = (value) => {
  const pct = typeof value === 'number' ? (value <= 1 ? value * 100 : value) : 0;
  if (pct >= 80) return C.green;
  if (pct >= 50) return C.amber;
  return C.red;
};

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatShortDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatConfidence = (value) => {
  if (typeof value !== 'number') return `${value}`;
  return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
};

// ────────────────────────────────────────────────────────────────
const ReportHistory = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [archiveModalVisible, setArchiveModalVisible] = useState(false);
  const [unarchiveModalVisible, setUnarchiveModalVisible] = useState(false);
  const [reportToArchive, setReportToArchive] = useState(null);
  const [reportToUnarchive, setReportToUnarchive] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [selectedImageDets, setSelectedImageDets] = useState([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [showDetections, setShowDetections] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const dispatch = useDispatch();
  const { reports, loading, error, success, operation, pagination, currentReport } =
    useSelector((state) => state.wasteReport);
  const { user } = useSelector((state) => state.auth);

  // Filter reports based on selected filter
  const filteredReports = reports.filter((r) => {
    if (selectedFilter === 'all') {
      return !r.isArchived;
    }
    if (selectedFilter === 'archived') {
      return r.isArchived === true;
    }
    return r.status === selectedFilter && !r.isArchived;
  });

  useEffect(() => { loadReports(1); }, []);

  useEffect(() => {
    if (error) {
      const msg = error.error || error.details || 'An unexpected error occurred';
      Alert.alert('Error', msg, [{ text: 'OK', onPress: () => dispatch(clearError()) }]);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (success) {
      if (operation === 'archive') {
        Alert.alert('Success', 'Report archived successfully');
        setArchiveModalVisible(false);
        setReportToArchive(null);
        dispatch(clearSuccess());
        loadReports(1);
      }
      if (operation === 'unarchive') {
        Alert.alert('Success', 'Report restored from archive');
        setUnarchiveModalVisible(false);
        setReportToUnarchive(null);
        dispatch(clearSuccess());
        loadReports(1);
      }
    }
  }, [success, operation, dispatch]);

  const loadReports = async (page = 1) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to view your report history.');
      navigation.navigate('Login');
      return;
    }
    try {
      // IMPORTANT: Set includeArchived to true to get ALL reports including archived
      const result = await dispatch(getUserReports({ 
        page, 
        limit: 10,
        includeArchived: true  // This is the key fix!
      })).unwrap();
      setCurrentPage(page);
      setHasMore(result?.hasMore || false);
    } catch (e) { 
      console.error('Failed to load reports:', e);
      Alert.alert('Error', 'Failed to load reports. Please try again.');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports(1).finally(() => setRefreshing(false));
  };

  const loadMore = () => { if (hasMore && !loading) loadReports(currentPage + 1); };

  const handleViewDetails = async (reportId) => {
    try {
      await dispatch(getReportById(reportId)).unwrap();
      setSelectedReport(currentReport);
      setDetailModalVisible(true);
    } catch (e) { 
      console.error('Failed to load report details:', e);
      Alert.alert('Error', 'Failed to load report details');
    }
  };

  const handleArchiveReport = (report) => { 
    setReportToArchive(report); 
    setArchiveModalVisible(true); 
  };

  const handleUnarchiveReport = (report) => { 
    setReportToUnarchive(report); 
    setUnarchiveModalVisible(true); 
  };

  const confirmArchive = async () => { 
    if (reportToArchive) {
      await dispatch(archiveReport(reportToArchive._id));
    }
  };

  const confirmUnarchive = async () => { 
    if (reportToUnarchive) {
      await dispatch(archiveReport(reportToUnarchive._id));
    }
  };

  const openImageViewer = (uri, dets) => {
    setSelectedImageUri(uri);
    setSelectedImageDets(dets || []);
    setImageLoading(true);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUri(null);
    setSelectedImageDets([]);
    setImageSize({ width: 0, height: 0 });
    setImageLoading(false);
  };

  const renderDetections = () => {
    if (!showDetections || !selectedImageDets.length || imageSize.width === 0) return null;
    return selectedImageDets.map((item, i) => {
      if (!item.box?.length) return null;
      const [x1, y1, x2, y2] = item.box;
      const left = x1 * imageSize.width;
      const top = y1 * imageSize.height;
      const width = (x2 - x1) * imageSize.width;
      const height = (y2 - y1) * imageSize.height;
      const meta = getClassMeta(item.category || item.label);
      return (
        <View key={i} style={[s.detectionBox, { left, top, width, height, borderColor: meta.color }]}>
          <View style={[s.detectionLabel, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon} size={11} color={C.white} style={{ marginRight: 4 }} />
            <Text style={s.detectionLabelTxt} numberOfLines={1}>
              {item.label} ({formatConfidence(item.confidence)})
            </Text>
          </View>
        </View>
      );
    });
  };

  const TableHeaderRow = () => (
    <View style={s.tableHeaderRow}>
      <Text style={[s.tableHeaderTxt, { flex: 2.6 }]}>Item</Text>
      <Text style={[s.tableHeaderTxt, { flex: 1.3 }]}>Status</Text>
      <Text style={[s.tableHeaderTxt, { flex: 0.9, textAlign: 'right' }]}>Conf.</Text>
      <View style={{ width: 28 }} />
    </View>
  );

  const renderFilterChip = (filter) => {
    const isActive = selectedFilter === filter.key;
    let count = 0;
    
    if (filter.key === 'all') {
      count = reports.filter(r => !r.isArchived).length;
    } else if (filter.key === 'archived') {
      count = reports.filter(r => r.isArchived).length;
    } else {
      count = reports.filter(r => r.status === filter.key && !r.isArchived).length;
    }
    
    return (
      <TouchableOpacity
        key={filter.key}
        style={[
          s.filterChip,
          isActive && { backgroundColor: filter.color, borderColor: filter.color }
        ]}
        onPress={() => setSelectedFilter(filter.key)}
        activeOpacity={0.8}
      >
        <Ionicons name={filter.icon} size={13} color={isActive ? C.white : filter.color} />
        <Text style={[s.filterChipTxt, isActive && s.filterChipTxtActive]}>
          {filter.label}
        </Text>
        <View style={[s.filterChipBadge, isActive && s.filterChipBadgeActive]}>
          <Text style={[s.filterChipBadgeTxt, isActive && s.filterChipBadgeTxtActive]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReportItem = ({ item, index }) => {
    const statusMeta = getStatusMeta(item.status);
    const classMeta = getClassMeta(item.classification);
    const objectsCount = (item.detected_objects || item.detectedObjects || []).length;
    const confValue = item.classification_confidence ?? item.classificationConfidence;
    const isLast = index === filteredReports.length - 1;
    const isArchived = item.isArchived === true;

    return (
      <TouchableOpacity
        style={[s.tableRow, isLast && s.tableRowLast, isArchived && s.archivedRow]}
        onPress={() => handleViewDetails(item._id)}
        activeOpacity={0.6}
      >
        <View style={s.cellItem}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={s.rowThumb} resizeMode="cover" />
          ) : (
            <View style={[s.rowThumb, s.rowThumbPlaceholder, { backgroundColor: `${classMeta.color}1A`, borderColor: `${classMeta.color}40` }]}>
              <Ionicons name={classMeta.icon} size={16} color={classMeta.color} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={s.rowTitleRow}>
              <Ionicons name={classMeta.icon} size={12} color={classMeta.color} />
              <Text style={[s.rowTitle, { color: classMeta.color }]} numberOfLines={1}>
                {item.classification}
              </Text>
              {isArchived && (
                <View style={s.archivedBadge}>
                  <Ionicons name="archive-outline" size={10} color={C.slate} />
                  <Text style={s.archivedBadgeTxt}>Archived</Text>
                </View>
              )}
            </View>
            <Text style={s.rowSub} numberOfLines={1}>
              {objectsCount} object{objectsCount !== 1 ? 's' : ''} · {formatShortDate(item.scan_date || item.scanDate)}
            </Text>
          </View>
        </View>

        <View style={s.cellStatus}>
          <View style={[s.statusBadgeSmall, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
            <Ionicons name={statusMeta.icon} size={10} color={statusMeta.color} />
            <Text style={[s.statusBadgeSmallTxt, { color: statusMeta.color }]} numberOfLines={1}>
              {statusMeta.label}
            </Text>
          </View>
        </View>

        <View style={s.cellConf}>
          <Text style={[s.rowConf, { color: getConfidenceColor(confValue) }]}>
            {formatConfidence(confValue)}
          </Text>
        </View>

        <TouchableOpacity
          style={s.cellAction}
          onPress={() => isArchived ? handleUnarchiveReport(item) : handleArchiveReport(item)}
          activeOpacity={0.6}
        >
          <Ionicons 
            name={isArchived ? "refresh-outline" : "archive-outline"} 
            size={15} 
            color={isArchived ? C.teal : C.slateL} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const currentFilter = FILTER_OPTIONS.find(f => f.key === selectedFilter);
    
    if (selectedFilter === 'archived' && filteredReports.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIconWrap, { backgroundColor: C.slateDim, borderColor: C.slateLine }]}>
            <Ionicons name="archive-outline" size={32} color={C.slate} />
          </View>
          <Text style={s.emptyTitle}>No Archived Reports</Text>
          <Text style={s.emptyText}>
            You don't have any archived reports yet. When you archive a report, it will appear here.
          </Text>
          <TouchableOpacity
            style={s.emptyScanBtn}
            onPress={() => setSelectedFilter('all')}
            activeOpacity={0.85}
          >
            <Ionicons name="layers-outline" size={15} color={C.navy} />
            <Text style={s.emptyScanBtnTxt}>View Active Reports</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (selectedFilter !== 'all' && selectedFilter !== 'archived' && filteredReports.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIconWrap, { backgroundColor: `${currentFilter?.color}1A`, borderColor: `${currentFilter?.color}40` }]}>
            <Ionicons name={currentFilter?.icon || "document-outline"} size={32} color={currentFilter?.color || C.slate} />
          </View>
          <Text style={s.emptyTitle}>No {currentFilter?.label} Reports</Text>
          <Text style={s.emptyText}>
            You don't have any active reports with "{currentFilter?.label}" status.
          </Text>
          <TouchableOpacity
            style={s.emptyScanBtn}
            onPress={() => setSelectedFilter('all')}
            activeOpacity={0.85}
          >
            <Ionicons name="layers-outline" size={15} color={C.navy} />
            <Text style={s.emptyScanBtnTxt}>View All Active Reports</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (reports.filter(r => !r.isArchived).length === 0 && reports.length > 0) {
      return (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIconWrap, { backgroundColor: C.slateDim, borderColor: C.slateLine }]}>
            <Ionicons name="archive-outline" size={32} color={C.slate} />
          </View>
          <Text style={s.emptyTitle}>All Reports Archived</Text>
          <Text style={s.emptyText}>
            All your reports have been archived. Switch to Archived tab to view them.
          </Text>
          <TouchableOpacity
            style={s.emptyScanBtn}
            onPress={() => setSelectedFilter('archived')}
            activeOpacity={0.85}
          >
            <Ionicons name="archive-outline" size={15} color={C.navy} />
            <Text style={s.emptyScanBtnTxt}>View Archived Reports</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (reports.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="document-outline" size={32} color={C.teal} />
          </View>
          <Text style={s.emptyTitle}>No Reports Yet</Text>
          <Text style={s.emptyText}>
            Start by scanning waste items to see your analysis history here.
          </Text>
          <TouchableOpacity
            style={s.emptyScanBtn}
            onPress={() => navigation.navigate('WasteDetection')}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={15} color={C.navy} />
            <Text style={s.emptyScanBtnTxt}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  const activeCount = reports.filter(r => !r.isArchived).length;
  const archivedCount = reports.filter(r => r.isArchived).length;
  const completedCount = reports.filter(r => r.status === 'completed' && !r.isArchived).length;
  const recyclableCount = reports.filter(r => 
    (r.classification === 'Recyclable' || r.classification === 'recyclable') && !r.isArchived
  ).length;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="light" backgroundColor={C.ink} />

      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={C.white} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Scan History</Text>
            <Text style={s.headerSub}>Your waste analysis reports</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {reports.length > 0 && (
          <FadeIn delay={0}>
            <View style={s.statsRow}>
              <TouchableOpacity 
                style={[s.statCard, selectedFilter === 'all' && s.statCardActive]}
                onPress={() => setSelectedFilter('all')}
                activeOpacity={0.7}
              >
                <View style={[s.statCardIconWrap, { backgroundColor: C.tealDim, borderColor: C.tealLine }]}>
                  <Ionicons name="layers-outline" size={14} color={C.teal} />
                </View>
                <Text style={s.statCardNum}>{activeCount}</Text>
                <Text style={s.statCardLabel}>Active</Text>
              </TouchableOpacity>

              <View style={s.statCard}>
                <View style={[s.statCardIconWrap, { backgroundColor: C.tealDim, borderColor: C.tealLine }]}>
                  <Ionicons name="checkmark-done-circle-outline" size={14} color={C.teal} />
                </View>
                <Text style={[s.statCardNum, { color: C.teal }]}>{completedCount}</Text>
                <Text style={s.statCardLabel}>Completed</Text>
              </View>
              
              <View style={s.statCard}>
                <View style={[s.statCardIconWrap, { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)' }]}>
                  <Ionicons name="leaf-outline" size={14} color={C.green} />
                </View>
                <Text style={[s.statCardNum, { color: C.green }]}>
                  {recyclableCount}
                </Text>
                <Text style={s.statCardLabel}>Recyclable</Text>
              </View>
            </View>
          </FadeIn>
        )}

        {reports.length > 0 && (
          <FadeIn delay={40}>
            <View style={s.filterBarWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterBarContent}
              >
                {FILTER_OPTIONS.map(renderFilterChip)}
              </ScrollView>
            </View>
          </FadeIn>
        )}

        <View style={s.tableCard}>
          <FlatList
            data={filteredReports}
            renderItem={renderReportItem}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />
            }
            ListHeaderComponent={filteredReports.length > 0 ? TableHeaderRow : null}
            ListEmptyComponent={!loading ? renderEmptyState : null}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && reports.length > 0 ? (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={C.teal} />
                </View>
              ) : null
            }
            contentContainerStyle={s.tableBody}
          />
        </View>

        {loading && reports.length === 0 && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={s.loadingTxt}>Loading your reports…</Text>
          </View>
        )}
      </View>

      {/* Image Viewer Modal */}
      <Modal animationType="fade" transparent={false} visible={imageViewerVisible} onRequestClose={closeImageViewer}>
        <SafeAreaView style={s.imgViewerRoot} edges={['top']}>
          <StatusBar style="light" backgroundColor={C.ink} />
          <View style={s.imgViewerHeader}>
            <TouchableOpacity style={s.backBtn} onPress={closeImageViewer} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={C.white} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Historical Image</Text>
              {selectedImageDets.length > 0 && (
                <Text style={s.headerSub}>{selectedImageDets.length} objects detected</Text>
              )}
            </View>
            {selectedImageDets.length > 0 ? (
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => setShowDetections(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons name={showDetections ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.teal} />
              </TouchableOpacity>
            ) : <View style={{ width: 36 }} />}
          </View>

          <View style={s.imgViewerBody}>
            {imageLoading && (
              <View style={s.imgLoading}>
                <ActivityIndicator size="large" color={C.teal} />
                <Text style={s.imgLoadingTxt}>Loading image…</Text>
              </View>
            )}
            {selectedImageUri && (
              <Image
                source={{ uri: selectedImageUri }}
                style={s.fullImg}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoad={(e) => {
                  setImageLoading(false);
                  const { width, height } = e.nativeEvent.source;
                  const ratio = width / height;
                  let dW = screenWidth, dH = screenWidth / ratio;
                  if (dH > screenHeight - 200) { dH = screenHeight - 200; dW = dH * ratio; }
                  setImageSize({ width: dW, height: dH });
                }}
                onError={() => {
                  setImageLoading(false);
                  Alert.alert('Image Error', 'Failed to load image.', [{ text: 'OK', onPress: closeImageViewer }]);
                }}
              />
            )}
            {!imageLoading && renderDetections()}
          </View>

          <View style={s.imgViewerFooter}>
            <View style={s.detectionSummary}>
              <View style={s.detSumItem}>
                <View style={[s.detSumDot, { backgroundColor: C.green }]} />
                <Text style={s.detSumTxt}>
                  Recyclable: {selectedImageDets.filter(d => d.category === 'Recyclable').length}
                </Text>
              </View>
              <View style={s.detSumItem}>
                <View style={[s.detSumDot, { backgroundColor: C.red }]} />
                <Text style={s.detSumTxt}>
                  Special: {selectedImageDets.filter(d => d.category === 'Special Waste').length}
                </Text>
              </View>
            </View>
            {selectedImageDets.length > 0 && (
              <TouchableOpacity
                style={[s.btnSave, { marginTop: 10 }]}
                onPress={() => setShowDetections(v => !v)}
                activeOpacity={0.85}
              >
                <Ionicons name={showDetections ? 'eye-off-outline' : 'eye-outline'} size={15} color={C.navy} />
                <Text style={s.btnSaveTxt}>{showDetections ? 'Hide Detections' : 'Show Detections'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Archive Confirm Modal */}
      <Modal animationType="fade" transparent={true} visible={archiveModalVisible} onRequestClose={() => setArchiveModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.confirmSheet}>
            <View style={[s.formCardIconWrap, { width: 48, height: 48, borderRadius: 14, backgroundColor: C.slateDim, borderColor: C.slateLine, marginBottom: 14 }]}>
              <Ionicons name="archive-outline" size={22} color={C.slate} />
            </View>
            <Text style={s.confirmTitle}>Archive Report</Text>
            <Text style={s.confirmText}>
              Are you sure you want to archive this waste report? You can restore it later from the archived section.
            </Text>
            <View style={s.btnRow}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => setArchiveModalVisible(false)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={s.btnCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, { backgroundColor: C.slate, shadowColor: C.slate, flex: 2 }]}
                onPress={confirmArchive}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading && operation === 'archive' ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="archive-outline" size={15} color={C.white} style={{ marginRight: 6 }} />
                    <Text style={[s.btnSaveTxt, { color: C.white }]}>Archive</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unarchive (Restore) Confirm Modal */}
      <Modal animationType="fade" transparent={true} visible={unarchiveModalVisible} onRequestClose={() => setUnarchiveModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.confirmSheet}>
            <View style={[s.formCardIconWrap, { width: 48, height: 48, borderRadius: 14, backgroundColor: C.tealDim, borderColor: C.tealLine, marginBottom: 14 }]}>
              <Ionicons name="refresh-outline" size={22} color={C.teal} />
            </View>
            <Text style={s.confirmTitle}>Restore Report</Text>
            <Text style={s.confirmText}>
              Are you sure you want to restore this waste report? It will reappear in your active reports.
            </Text>
            <View style={s.btnRow}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => setUnarchiveModalVisible(false)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={s.btnCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, { backgroundColor: C.teal, shadowColor: C.teal, flex: 2 }]}
                onPress={confirmUnarchive}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading && operation === 'unarchive' ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={15} color={C.white} style={{ marginRight: 6 }} />
                    <Text style={[s.btnSaveTxt, { color: C.white }]}>Restore</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal - same as before */}
      <Modal animationType="slide" transparent={true} visible={detailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={s.modalHeaderLeft}>
                <View style={s.formCardIconWrap}>
                  <Ionicons name="document-text-outline" size={16} color={C.teal} />
                </View>
                <Text style={s.modalTitle}>Report Details</Text>
              </View>
              <TouchableOpacity style={s.modalCloseBtn} onPress={() => setDetailModalVisible(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={C.slate} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {selectedReport.image && (
                  <TouchableOpacity
                    style={s.detailImgWrap}
                    onPress={() => openImageViewer(
                      selectedReport.image,
                      selectedReport.detected_objects || selectedReport.detectedObjects
                    )}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: selectedReport.image }} style={s.detailImg} resizeMode="cover" />
                    <View style={s.detailImgOverlay}>
                      <Ionicons name="scan-outline" size={20} color={C.white} />
                      <Text style={s.detailImgOverlayTxt}>Tap to view with detections</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <View style={s.chipRow}>
                  {(() => {
                    const m = getClassMeta(selectedReport.classification);
                    return (
                      <View style={[s.chip, { borderColor: m.color, backgroundColor: `${m.color}22` }]}>
                        <Ionicons name={m.icon} size={13} color={m.color} />
                        <Text style={[s.chipTxt, { color: m.color }]}>{selectedReport.classification}</Text>
                      </View>
                    );
                  })()}
                  {(() => {
                    const m = getStatusMeta(selectedReport.status);
                    return (
                      <View style={[s.chip, { borderColor: m.border, backgroundColor: m.bg }]}>
                        <Ionicons name={m.icon} size={12} color={m.color} />
                        <Text style={[s.chipTxt, { color: m.color }]}>{m.label}</Text>
                      </View>
                    );
                  })()}
                  {selectedReport.isArchived && (
                    <View style={[s.chip, { borderColor: C.slateLine, backgroundColor: C.slateDim }]}>
                      <Ionicons name="archive-outline" size={12} color={C.slate} />
                      <Text style={[s.chipTxt, { color: C.slate }]}>Archived</Text>
                    </View>
                  )}
                </View>

                <View style={s.detailSection}>
                  <View style={s.detailSectionHeader}>
                    <Ionicons name="stats-chart-outline" size={13} color={C.teal} />
                    <Text style={s.detailSectionTitle}>Confidence</Text>
                  </View>
                  <View style={s.confidenceBarBg}>
                    <View style={[s.confidenceBarFill, {
                      width: `${Math.round(
                        (selectedReport.classification_confidence || selectedReport.classificationConfidence || 0) <= 1
                          ? (selectedReport.classification_confidence || selectedReport.classificationConfidence || 0) * 100
                          : (selectedReport.classification_confidence || selectedReport.classificationConfidence || 0)
                      )}%`,
                    }]} />
                  </View>
                  <Text style={s.confidenceNum}>
                    {formatConfidence(selectedReport.classification_confidence || selectedReport.classificationConfidence)}
                  </Text>
                </View>

                {(selectedReport.detected_objects || selectedReport.detectedObjects)?.length > 0 && (
                  <View style={s.detailSection}>
                    <View style={s.detailSectionHeader}>
                      <Ionicons name="search-outline" size={13} color={C.teal} />
                      <Text style={s.detailSectionTitle}>
                        Detected Objects ({(selectedReport.detected_objects || selectedReport.detectedObjects).length})
                      </Text>
                    </View>
                    {(selectedReport.detected_objects || selectedReport.detectedObjects).map((obj, i) => {
                      const m = getClassMeta(obj.category || obj.label);
                      return (
                        <View key={i} style={[s.objectRow, { borderLeftColor: m.color }]}>
                          <View style={[s.objectIconWrap, { backgroundColor: `${m.color}1A` }]}>
                            <Ionicons name={m.icon} size={16} color={m.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.objectLabel}>{obj.label}</Text>
                            <Text style={s.objectMeta}>
                              {formatConfidence(obj.confidence)} confidence
                              {obj.material ? ` · ${obj.material}` : ''}
                              {obj.category ? ` · ${obj.category}` : ''}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {selectedReport.location && (
                  <View style={s.detailSection}>
                    <View style={s.detailSectionHeader}>
                      <Ionicons name="location-outline" size={13} color={C.teal} />
                      <Text style={s.detailSectionTitle}>Location</Text>
                    </View>
                    <Text style={s.detailValue}>{selectedReport.location.address || 'Not specified'}</Text>
                    {selectedReport.location.coordinates && (
                      <Text style={s.detailSub}>
                        {selectedReport.location.coordinates.lat?.toFixed(4)}, {selectedReport.location.coordinates.lng?.toFixed(4)}
                      </Text>
                    )}
                  </View>
                )}

                {selectedReport.recycling_tips?.length > 0 && (
                  <View style={s.detailSection}>
                    <View style={s.detailSectionHeader}>
                      <Ionicons name="bulb-outline" size={13} color={C.teal} />
                      <Text style={s.detailSectionTitle}>Recycling Tips</Text>
                    </View>
                    {selectedReport.recycling_tips.map((tip, i) => (
                      <View key={i} style={s.tipRow}>
                        <View style={s.tipDot} />
                        <Text style={s.tipTxt}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={s.detailSection}>
                  <View style={s.detailSectionHeader}>
                    <Ionicons name="calendar-outline" size={13} color={C.teal} />
                    <Text style={s.detailSectionTitle}>Scan Date</Text>
                  </View>
                  <Text style={s.detailValue}>{formatDate(selectedReport.scan_date || selectedReport.scanDate)}</Text>
                </View>

                {selectedReport.archivedAt && (
                  <View style={s.detailSection}>
                    <View style={s.detailSectionHeader}>
                      <Ionicons name="archive-outline" size={13} color={C.slate} />
                      <Text style={s.detailSectionTitle}>Archived Date</Text>
                    </View>
                    <Text style={s.detailValue}>{formatDate(selectedReport.archivedAt)}</Text>
                  </View>
                )}

                {selectedReport.adminNotes && (
                  <View style={s.detailSection}>
                    <View style={s.detailSectionHeader}>
                      <Ionicons name="chatbubble-outline" size={13} color={C.teal} />
                      <Text style={s.detailSectionTitle}>Admin Notes</Text>
                    </View>
                    <Text style={s.detailValue}>{selectedReport.adminNotes}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ReportHistory;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.offWhite,
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDk,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: C.borderDk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: C.ghost,
    fontWeight: '500',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  statCardActive: {
    borderColor: C.teal,
    borderWidth: 2,
  },
  statCardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statCardNum: {
    fontSize: 17,
    fontWeight: '800',
    color: C.navy,
  },
  statCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.slateL,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterBarWrap: {
    marginBottom: 12,
  },
  filterBarContent: {
    paddingHorizontal: 20,
    paddingRight: 24,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: C.white,
    borderColor: C.border,
    marginRight: 8,
  },
  filterChipTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: C.slate,
  },
  filterChipTxtActive: {
    color: C.white,
  },
  filterChipBadge: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(7,27,46,0.06)',
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterChipBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: C.slate,
  },
  filterChipBadgeTxtActive: {
    color: C.white,
  },
  tableCard: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  tableBody: {
    flexGrow: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.offWhite,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
  },
  tableHeaderTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: C.slateL,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 8,
    backgroundColor: C.white,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  archivedRow: {
    backgroundColor: 'rgba(71,85,105,0.03)',
  },
  cellItem: {
    flex: 2.6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cellStatus: {
    flex: 1.3,
    alignItems: 'flex-start',
  },
  cellConf: {
    flex: 0.9,
    alignItems: 'flex-end',
  },
  cellAction: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 11,
    color: C.slateL,
    marginTop: 2,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: C.slateDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  archivedBadgeTxt: {
    fontSize: 9,
    fontWeight: '600',
    color: C.slate,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
    alignSelf: 'flex-start',
  },
  statusBadgeSmallTxt: {
    fontSize: 10,
    fontWeight: '700',
  },
  rowConf: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: C.tealDim,
    borderWidth: 1.5,
    borderColor: C.tealLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: C.slate,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.teal,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  emptyScanBtnTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: C.navy,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.offWhite,
  },
  loadingTxt: {
    marginTop: 14,
    fontSize: 14,
    color: C.slate,
    fontWeight: '600',
  },
  imgViewerRoot: {
    flex: 1,
    backgroundColor: C.ink,
  },
  imgViewerHeader: {
    backgroundColor: C.ink,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDk,
  },
  imgViewerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImg: {
    width: screenWidth,
    height: screenHeight - 200,
  },
  imgLoading: {
    position: 'absolute',
    alignItems: 'center',
    gap: 12,
  },
  imgLoadingTxt: {
    fontSize: 13,
    color: C.ghost,
  },
  detectionBox: {
    position: 'absolute',
    borderWidth: 2,
  },
  detectionLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detectionLabelTxt: {
    fontSize: 10,
    color: C.white,
    fontWeight: '700',
  },
  imgViewerFooter: {
    backgroundColor: C.navy,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.borderDk,
  },
  detectionSummary: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  detSumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detSumDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detSumTxt: {
    fontSize: 12,
    color: C.ghost,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7,27,46,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    maxHeight: screenHeight * 0.88,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.navy,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImgWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    height: 190,
  },
  detailImg: {
    width: '100%',
    height: '100%',
  },
  detailImgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailImgOverlayTxt: {
    fontSize: 13,
    color: C.white,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  chipTxt: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailSection: {
    marginBottom: 18,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.slateL,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: C.navy,
    lineHeight: 21,
  },
  detailSub: {
    fontSize: 12,
    color: C.slateL,
    marginTop: 2,
  },
  confidenceBarBg: {
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: C.teal,
    borderRadius: 4,
  },
  confidenceNum: {
    fontSize: 13,
    fontWeight: '700',
    color: C.teal,
  },
  objectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.offWhite,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  objectIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.navy,
    marginBottom: 2,
  },
  objectMeta: {
    fontSize: 11,
    color: C.slateL,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.teal,
    marginTop: 6,
  },
  tipTxt: {
    flex: 1,
    fontSize: 13,
    color: C.slate,
    lineHeight: 19,
  },
  confirmSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.navy,
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: C.slate,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelTxt: {
    fontSize: 14,
    color: C.slate,
    fontWeight: '600',
  },
  btnSave: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: C.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: C.navy,
  },
  formCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.tealDim,
    borderWidth: 1,
    borderColor: C.tealLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});