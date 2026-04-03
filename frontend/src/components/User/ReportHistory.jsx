import React, { useState, useEffect, useRef } from "react";
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
import { useSelector, useDispatch } from "react-redux";
import {
  getUserReports,
  deleteReport,
  clearError,
  clearSuccess,
  getReportById,
} from "../../redux/slices/wasteReportSlice";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// ── Design tokens (same palette as EditProfile) ───────────────────────────────
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

// ── Status / classification helpers ──────────────────────────────────────────
const STATUS_META = {
  pending:   { color: C.amber,  bg: 'rgba(245,158,11,0.13)',  border: 'rgba(245,158,11,0.35)',  icon: 'time-outline' },
  processed: { color: '#60A5FA', bg: 'rgba(96,165,250,0.13)', border: 'rgba(96,165,250,0.35)',  icon: 'checkmark-circle-outline' },
  recycled:  { color: C.green,  bg: 'rgba(34,197,94,0.13)',   border: 'rgba(34,197,94,0.35)',   icon: 'refresh-circle-outline' },
  disposed:  { color: C.red,    bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.35)',   icon: 'trash-outline' },
  rejected:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.13)',border: 'rgba(167,139,250,0.35)', icon: 'close-circle-outline' },
};

const CLASS_META = {
  Recyclable:    { color: C.green,  icon: '♻️' },
  recyclable:    { color: C.green,  icon: '♻️' },
  Organic:       { color: C.orange, icon: '🌿' },
  organic:       { color: C.orange, icon: '🌿' },
  'Special Waste':{ color: C.red,   icon: '⚠️' },
  special_waste: { color: C.red,    icon: '⚠️' },
  Hazardous:     { color: C.red,    icon: '☢️' },
  hazardous:     { color: C.red,    icon: '☢️' },
  General:       { color: C.slate,  icon: '🗑️' },
  general_waste: { color: C.slate,  icon: '🗑️' },
};

const getStatusMeta  = (s) => STATUS_META[s]  || { color: C.slateL, bg: 'rgba(139,165,188,0.13)', border: 'rgba(139,165,188,0.35)', icon: 'help-circle-outline' };
const getClassMeta   = (c) => CLASS_META[c]   || { color: C.slateL, icon: '❓' };

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatConfidence = (value) => {
  if (typeof value !== 'number') return `${value}`;
  return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
};

// ─────────────────────────────────────────────────────────────────────────────
const ReportHistory = ({ navigation }) => {
  const [refreshing,         setRefreshing]         = useState(false);
  const [selectedReport,     setSelectedReport]     = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reportToDelete,     setReportToDelete]     = useState(null);
  const [currentPage,        setCurrentPage]        = useState(1);
  const [hasMore,            setHasMore]            = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri,   setSelectedImageUri]   = useState(null);
  const [selectedImageDets,  setSelectedImageDets]  = useState([]);
  const [imageSize,          setImageSize]          = useState({ width: 0, height: 0 });
  const [showDetections,     setShowDetections]     = useState(true);
  const [imageLoading,       setImageLoading]       = useState(false);

  const dispatch = useDispatch();
  const { reports, loading, error, success, operation, pagination, currentReport } =
    useSelector((state) => state.wasteReport);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => { loadReports(1); }, []);

  useEffect(() => {
    if (error) {
      const msg = error.error || error.details || 'An unexpected error occurred';
      Alert.alert('Error', msg, [{ text: 'OK', onPress: () => dispatch(clearError()) }]);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (success && operation === 'delete') {
      Alert.alert('Success', 'Report deleted successfully');
      setDeleteModalVisible(false);
      setReportToDelete(null);
      dispatch(clearSuccess());
    }
  }, [success, operation, dispatch]);

  const loadReports = async (page = 1) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to view your report history.');
      navigation.navigate('Login');
      return;
    }
    try {
      await dispatch(getUserReports({ page, limit: 10 })).unwrap();
      setCurrentPage(page);
      setHasMore(pagination?.hasNext || false);
    } catch (e) { console.error('Failed to load reports:', e); }
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
    } catch (e) { console.error('Failed to load report details:', e); }
  };

  const handleDeleteReport = (report) => { setReportToDelete(report); setDeleteModalVisible(true); };
  const confirmDelete = () => { if (reportToDelete) dispatch(deleteReport(reportToDelete._id)); };

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

  // ── Detection boxes ────────────────────────────────────────────────────────
  const renderDetections = () => {
    if (!showDetections || !selectedImageDets.length || imageSize.width === 0) return null;
    return selectedImageDets.map((item, i) => {
      if (!item.box?.length) return null;
      const [x1, y1, x2, y2] = item.box;
      const left   = x1 * imageSize.width;
      const top    = y1 * imageSize.height;
      const width  = (x2 - x1) * imageSize.width;
      const height = (y2 - y1) * imageSize.height;
      const meta   = getClassMeta(item.category || item.label);
      return (
        <View key={i} style={[s.detectionBox, { left, top, width, height, borderColor: meta.color }]}>
          <View style={[s.detectionLabel, { backgroundColor: meta.color }]}>
            <Text style={s.detectionLabelTxt} numberOfLines={1}>
              {meta.icon} {item.label} ({formatConfidence(item.confidence)})
            </Text>
          </View>
        </View>
      );
    });
  };

  // ── Report card ────────────────────────────────────────────────────────────
  const renderReportItem = ({ item, index }) => {
    const statusMeta = getStatusMeta(item.status);
    const classMeta  = getClassMeta(item.classification);
    const objectsCount = (item.detected_objects || item.detectedObjects || []).length;

    return (
      <FadeIn delay={index * 60}>
        <View style={s.reportCard}>
          {/* Card top accent line */}
          <View style={[s.cardAccent, { backgroundColor: classMeta.color }]} />

          {/* Header row */}
          <View style={s.cardHeader}>
            <View style={s.classRow}>
              <Text style={s.classIcon}>{classMeta.icon}</Text>
              <Text style={[s.classText, { color: classMeta.color }]}>
                {item.classification}
              </Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
              <Ionicons name={statusMeta.icon} size={11} color={statusMeta.color} />
              <Text style={[s.statusText, { color: statusMeta.color }]}>{item.status}</Text>
            </View>
          </View>

          {/* Image + meta */}
          <View style={s.cardBody}>
            {item.image && (
              <TouchableOpacity
                style={s.thumbWrap}
                onPress={() => openImageViewer(item.image, item.detected_objects)}
                activeOpacity={0.82}
              >
                <Image source={{ uri: item.image }} style={s.thumbImg} resizeMode="cover" />
                <View style={s.thumbOverlay}>
                  <Ionicons name="scan-outline" size={18} color={C.white} />
                </View>
              </TouchableOpacity>
            )}

            <View style={s.cardMeta}>
              <View style={s.metaRow}>
                <Ionicons name="calendar-outline" size={12} color={C.slateL} />
                <Text style={s.metaTxt}>{formatDate(item.scan_date || item.scanDate)}</Text>
              </View>
              <View style={s.metaRow}>
                <Ionicons name="stats-chart-outline" size={12} color={C.slateL} />
                <Text style={s.metaTxt}>
                  Confidence: {formatConfidence(item.classification_confidence || item.classificationConfidence)}
                </Text>
              </View>
              <View style={s.metaRow}>
                <Ionicons name="search-outline" size={12} color={C.slateL} />
                <Text style={s.metaTxt}>{objectsCount} object{objectsCount !== 1 ? 's' : ''} detected</Text>
              </View>
              {item.location?.address && (
                <View style={s.metaRow}>
                  <Ionicons name="location-outline" size={12} color={C.slateL} />
                  <Text style={[s.metaTxt, { flex: 1 }]} numberOfLines={1}>
                    {item.location.address}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={s.cardDivider} />

          {/* Action buttons */}
          <View style={s.cardActions}>
            <TouchableOpacity
              style={s.btnView}
              onPress={() => handleViewDetails(item._id)}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={14} color={C.navy} />
              <Text style={s.btnViewTxt}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnDelete}
              onPress={() => handleDeleteReport(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={14} color={C.red} />
              <Text style={s.btnDeleteTxt}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </FadeIn>
    );
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  const renderEmptyState = () => (
    <FadeIn delay={0}>
      <View style={s.emptyWrap}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="document-outline" size={38} color={C.teal} />
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
          <Ionicons name="camera-outline" size={16} color={C.navy} />
          <Text style={s.emptyScanBtnTxt}>Start Scanning</Text>
        </TouchableOpacity>
      </View>
    </FadeIn>
  );

  // ── Root render ────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* ── Header (mirrors EditProfile) ── */}
      <View style={s.header}>
        <View style={s.headerBlob} />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Scan History</Text>
          <Text style={s.headerSub}>Your waste analysis reports</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Stats bar ── */}
      {reports.length > 0 && (
        <FadeIn delay={0}>
          <View style={s.statsBar}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{reports.length}</Text>
              <Text style={s.statLabel}>Total</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: C.green }]}>
                {reports.filter(r => r.classification === 'Recyclable' || r.classification === 'recyclable').length}
              </Text>
              <Text style={s.statLabel}>Recyclable</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: C.amber }]}>
                {reports.filter(r => r.status === 'pending').length}
              </Text>
              <Text style={s.statLabel}>Pending</Text>
            </View>
          </View>
        </FadeIn>
      )}

      {/* ── List ── */}
      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && reports.length > 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={C.teal} />
            </View>
          ) : null
        }
        contentContainerStyle={s.listContent}
      />

      {/* ── Initial loading ── */}
      {loading && reports.length === 0 && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={s.loadingTxt}>Loading your reports…</Text>
        </View>
      )}

      {/* ══ Image Viewer Modal ══ */}
      <Modal animationType="fade" transparent={false} visible={imageViewerVisible} onRequestClose={closeImageViewer}>
        <View style={s.imgViewerRoot}>
          {/* Header */}
          <View style={s.imgViewerHeader}>
            <View style={s.headerBlob} />
            <TouchableOpacity style={s.backBtn} onPress={closeImageViewer} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={C.white} />
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
                <Ionicons name={showDetections ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.teal} />
              </TouchableOpacity>
            ) : <View style={{ width: 38 }} />}
          </View>

          {/* Image */}
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

          {/* Footer */}
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
        </View>
      </Modal>

      {/* ══ Detail Modal ══ */}
      <Modal animationType="slide" transparent={true} visible={detailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {/* Modal header */}
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
                {/* Image */}
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

                {/* Classification + Status chips */}
                <View style={s.chipRow}>
                  {(() => {
                    const m = getClassMeta(selectedReport.classification);
                    return (
                      <View style={[s.chip, { borderColor: m.color, backgroundColor: `${m.color}22` }]}>
                        <Text style={s.chipIcon}>{m.icon}</Text>
                        <Text style={[s.chipTxt, { color: m.color }]}>{selectedReport.classification}</Text>
                      </View>
                    );
                  })()}
                  {(() => {
                    const m = getStatusMeta(selectedReport.status);
                    return (
                      <View style={[s.chip, { borderColor: m.border, backgroundColor: m.bg }]}>
                        <Ionicons name={m.icon} size={12} color={m.color} />
                        <Text style={[s.chipTxt, { color: m.color }]}>{selectedReport.status}</Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Confidence */}
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

                {/* Detected Objects */}
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
                          <Text style={s.objectIcon}>{m.icon}</Text>
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

                {/* Location */}
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

                {/* Recycling Tips */}
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

                {/* Scan Date */}
                <View style={s.detailSection}>
                  <View style={s.detailSectionHeader}>
                    <Ionicons name="calendar-outline" size={13} color={C.teal} />
                    <Text style={s.detailSectionTitle}>Scan Date</Text>
                  </View>
                  <Text style={s.detailValue}>{formatDate(selectedReport.scan_date || selectedReport.scanDate)}</Text>
                </View>

                {/* Admin Notes */}
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

      {/* ══ Delete Confirm Modal ══ */}
      <Modal animationType="fade" transparent={true} visible={deleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.confirmSheet}>
            <View style={[s.formCardIconWrap, { width: 48, height: 48, borderRadius: 14, backgroundColor: C.redDim, borderColor: C.redLine, marginBottom: 14 }]}>
              <Ionicons name="trash-outline" size={22} color={C.red} />
            </View>
            <Text style={s.confirmTitle}>Delete Report</Text>
            <Text style={s.confirmText}>
              Are you sure you want to delete this waste report? This action cannot be undone.
            </Text>
            <View style={s.btnRow}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => setDeleteModalVisible(false)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={s.btnCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, { backgroundColor: C.red, shadowColor: C.red, flex: 2 }]}
                onPress={confirmDelete}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading && operation === 'delete' ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={15} color={C.white} style={{ marginRight: 6 }} />
                    <Text style={[s.btnSaveTxt, { color: C.white }]}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ReportHistory;

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

  // ── Stats bar ─────────────────────────────────────────────────────────────────
  statsBar: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  statItem:    { alignItems: 'center' },
  statNum:     { fontSize: 22, fontWeight: '900', color: C.white },
  statLabel:   { fontSize: 10, color: C.slateL, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: C.borderDk },

  // ── List ─────────────────────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },

  // ── Report card ──────────────────────────────────────────────────────────────
  reportCard: {
    backgroundColor: C.white, borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: 'rgba(7,27,46,0.08)',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
  },
  cardAccent:  { height: 3, width: '100%' },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  classRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  classIcon:   { fontSize: 16 },
  classText:   { fontSize: 14, fontWeight: '800' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
  },
  statusText:  { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  cardBody:    { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  thumbWrap:   { width: 82, height: 82, borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: C.border },
  thumbImg:    { width: '100%', height: '100%' },
  thumbOverlay:{
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta:    { flex: 1, gap: 5, justifyContent: 'center' },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt:     { fontSize: 12, color: C.slate },
  cardDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  cardActions: { flexDirection: 'row', gap: 10, padding: 14 },
  btnView: {
    flex: 2, height: 40, borderRadius: 10,
    backgroundColor: C.teal,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  btnViewTxt:   { fontSize: 13, fontWeight: '800', color: C.navy },
  btnDelete: {
    flex: 1, height: 40, borderRadius: 10,
    backgroundColor: C.redDim, borderWidth: 1, borderColor: C.redLine,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  btnDeleteTxt: { fontSize: 13, fontWeight: '700', color: C.red },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: C.tealDim, borderWidth: 1.5, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle:   { fontSize: 20, fontWeight: '900', color: C.navy, marginBottom: 8 },
  emptyText:    { fontSize: 14, color: C.slate, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  emptyScanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.teal, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 28,
    shadowColor: C.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  emptyScanBtnTxt: { fontSize: 15, fontWeight: '800', color: C.navy },

  // ── Loading ──────────────────────────────────────────────────────────────────
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: C.offWhite },
  loadingTxt:     { marginTop: 14, fontSize: 14, color: C.slate, fontWeight: '600' },

  // ── Image viewer ─────────────────────────────────────────────────────────────
  imgViewerRoot:   { flex: 1, backgroundColor: C.ink },
  imgViewerHeader: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 18, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.borderDk,
    overflow: 'hidden',
  },
  imgViewerBody:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImg:         { width: screenWidth, height: screenHeight - 200 },
  imgLoading:      { position: 'absolute', alignItems: 'center', gap: 12 },
  imgLoadingTxt:   { fontSize: 13, color: C.ghost },
  detectionBox:    { position: 'absolute', borderWidth: 2 },
  detectionLabel:  { position: 'absolute', top: 0, left: 0, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  detectionLabelTxt:{ fontSize: 10, color: C.white, fontWeight: '700' },

  imgViewerFooter: { backgroundColor: C.navy, padding: 16, borderTopWidth: 1, borderTopColor: C.borderDk },
  detectionSummary:{ flexDirection: 'row', gap: 20, justifyContent: 'center' },
  detSumItem:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detSumDot:       { width: 8, height: 8, borderRadius: 4 },
  detSumTxt:       { fontSize: 12, color: C.ghost, fontWeight: '600' },

  // ── Modals ───────────────────────────────────────────────────────────────────
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(7,27,46,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 24, paddingHorizontal: 20, maxHeight: screenHeight * 0.88,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle:      { fontSize: 17, fontWeight: '900', color: C.navy },
  modalCloseBtn: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: C.offWhite, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  detailImgWrap:     { borderRadius: 16, overflow: 'hidden', marginBottom: 16, height: 200 },
  detailImg:         { width: '100%', height: '100%' },
  detailImgOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  detailImgOverlayTxt: { fontSize: 13, color: C.white, fontWeight: '700' },

  chipRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
  },
  chipIcon:   { fontSize: 13 },
  chipTxt:    { fontSize: 12, fontWeight: '700' },

  detailSection:       { marginBottom: 18 },
  detailSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  detailSectionTitle:  { fontSize: 11, fontWeight: '700', color: C.slateL, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:         { fontSize: 14, color: C.navy, lineHeight: 21 },
  detailSub:           { fontSize: 12, color: C.slateL, marginTop: 2 },

  confidenceBarBg: { height: 8, backgroundColor: C.border, borderRadius: 4, marginBottom: 6 },
  confidenceBarFill:{ height: '100%', backgroundColor: C.teal, borderRadius: 4 },
  confidenceNum:   { fontSize: 13, fontWeight: '700', color: C.teal },

  objectRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.offWhite, borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3,
  },
  objectIcon:  { fontSize: 16, marginTop: 1 },
  objectLabel: { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 2 },
  objectMeta:  { fontSize: 11, color: C.slateL },

  tipRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  tipDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal, marginTop: 6 },
  tipTxt:     { flex: 1, fontSize: 13, color: C.slate, lineHeight: 19 },

  // ── Confirm delete modal ──────────────────────────────────────────────────────
  confirmSheet: {
    backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, alignItems: 'center',
  },
  confirmTitle: { fontSize: 18, fontWeight: '900', color: C.navy, marginBottom: 8 },
  confirmText:  { fontSize: 14, color: C.slate, textAlign: 'center', lineHeight: 21, marginBottom: 24 },

  // ── Shared button styles (mirrors EditProfile) ────────────────────────────────
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
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

  // ── Form card icon wrap (reused from EditProfile) ─────────────────────────────
  formCardIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.tealDim, borderWidth: 1, borderColor: C.tealLine,
    alignItems: 'center', justifyContent: 'center',
  },
});