import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  Modal,
  RefreshControl,
  FlatList,
  Dimensions,
} from "react-native";
import { useSelector, useDispatch } from 'react-redux';
import { 
  getUserReports, 
  deleteReport, 
  clearError, 
  clearSuccess,
  getReportById 
} from '../../redux/slices/wasteReportSlice';
import { styles } from "../../components/Styles/ReportHistory";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ReportHistory = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [selectedImageDetections, setSelectedImageDetections] = useState([]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [showDetections, setShowDetections] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);

  const dispatch = useDispatch();
  const { 
    reports, 
    loading, 
    error, 
    success, 
    operation,
    pagination,
    currentReport 
  } = useSelector(state => state.wasteReport);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    loadReports(1);
  }, []);

  useEffect(() => {
    if (error) {
      const errorMessage = error.error || error.details || 'An unexpected error occurred';
      Alert.alert("Error", errorMessage, [{ text: "OK", onPress: () => dispatch(clearError()) }]);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (success && operation === 'delete') {
      Alert.alert("Success", "Report deleted successfully");
      setDeleteModalVisible(false);
      setReportToDelete(null);
      dispatch(clearSuccess());
    }
  }, [success, operation, dispatch]);

  const loadReports = async (page = 1, loadMore = false) => {
    if (!user) {
      Alert.alert("Login Required", "Please login to view your report history.");
      navigation.navigate('Login');
      return;
    }

    try {
      await dispatch(getUserReports({ page, limit: 10 })).unwrap();
      setCurrentPage(page);
      setHasMore(pagination?.hasNext || false);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports(1).finally(() => setRefreshing(false));
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadReports(currentPage + 1, true);
    }
  };

  const handleViewDetails = async (reportId) => {
    try {
      await dispatch(getReportById(reportId)).unwrap();
      setSelectedReport(currentReport);
      setDetailModalVisible(true);
    } catch (error) {
      console.error('Failed to load report details:', error);
    }
  };

  const handleDeleteReport = (report) => {
    setReportToDelete(report);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      dispatch(deleteReport(reportToDelete._id));
    }
  };

  const openImageViewer = (imageUri, detections) => {
    setSelectedImageUri(imageUri);
    setSelectedImageDetections(detections || []);
    setImageLoading(true);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setSelectedImageUri(null);
    setSelectedImageDetections([]);
    setImageSize({ width: 0, height: 0 });
    setImageLoading(false);
  };

  const toggleDetections = () => {
    setShowDetections(!showDetections);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#FFA500',
      'processed': '#0077b6',
      'recycled': '#2E8B57',
      'disposed': '#DC143C',
      'rejected': '#8B0000'
    };
    return colors[status] || '#696969';
  };

  const getClassificationColor = (classification) => {
    const colors = {
      "Recyclable": "#2E8B57",
      "Special Waste": "#8B0000",
      "Recycling": "#2E8B57",
      "Organic": "#FF8C00",
      "General": "#DC143C",
      "Hazardous": "#8B0000",
      "Unknown": "#696969",
      "recyclable": "#2E8B57",
      "special_waste": "#8B0000",
      "organic": "#FF8C00",
      "general_waste": "#DC143C",
      "hazardous": "#8B0000"
    };
    return colors[classification] || colors["Unknown"];
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'Special Waste':
      case 'Hazardous':
        return '#FF6B6B';
      case 'Recyclable':
        return '#4CAF50';
      default:
        return '#87CEEB';
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Special Waste':
      case 'Hazardous':
        return '⚠️';
      case 'Recyclable':
        return '✅';
      default:
        return '❓';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatConfidence = (value) => {
    if (typeof value === 'number') {
      return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
    }
    return `${value}`;
  };

  // Function to render detection boxes for full screen image viewer
  const renderImageDetections = () => {
    if (!showDetections || !selectedImageDetections.length || imageSize.width === 0 || imageSize.height === 0) {
      return null;
    }

    return selectedImageDetections.map((item, index) => {
      if (!item.box || !item.box.length) return null;
      
      const [x1, y1, x2, y2] = item.box;
      
      const left = x1 * imageSize.width;
      const top = y1 * imageSize.height;
      const width = (x2 - x1) * imageSize.width;
      const height = (y2 - y1) * imageSize.height;
      
      const categoryColor = getCategoryColor(item.category || item.label);

      return (
        <View
          key={index}
          style={[
            styles.fullBoundingBox,
            {
              position: 'absolute',
              left,
              top,
              width,
              height,
              borderColor: categoryColor,
              borderWidth: 2,
            }
          ]}
        >
          <View style={[styles.fullLabelBox, { backgroundColor: categoryColor }]}>
            <Text style={styles.fullLabelText} numberOfLines={1}>
              {getCategoryIcon(item.category || item.label)} {item.label} ({formatConfidence(item.confidence)})
            </Text>
          </View>
        </View>
      );
    });
  };

  const renderReportItem = ({ item }) => (
    <View style={styles.reportCard}>
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={styles.classificationBadge}>
          <View 
            style={[
              styles.statusIndicator, 
              { backgroundColor: getClassificationColor(item.classification) }
            ]} 
          />
          <Text style={styles.classificationText}>
            {item.classification}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {/* Image and Basic Info */}
      <View style={styles.cardContent}>
        {item.image && (
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={() => openImageViewer(item.image, item.detected_objects)}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: item.image }} 
              style={styles.reportImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Text style={styles.overlayText}>Tap to view with detections</Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.reportInfo}>
          <Text style={styles.dateText}>{formatDate(item.scan_date || item.scanDate)}</Text>
          <Text style={styles.confidenceText}>
            Confidence: {formatConfidence(item.classification_confidence || item.classificationConfidence)}
          </Text>
          <Text style={styles.objectsText}>
            Objects detected: {(item.detected_objects || item.detectedObjects || []).length}
          </Text>
          {item.location?.address && (
            <Text style={styles.locationText} numberOfLines={1}>
              📍 {item.location.address}
            </Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewDetails(item._id)}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteReport(item)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Reports Yet</Text>
      <Text style={styles.emptyStateText}>
        Start by scanning waste items to see your analysis history here.
      </Text>
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => navigation.navigate('WasteDetection')}
      >
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan History</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0077b6']}
          />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && reports.length > 0 ? (
            <ActivityIndicator size="small" color="#0077b6" style={styles.loader} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Loading State */}
      {loading && reports.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0077b6" />
          <Text style={styles.loadingText}>Loading your reports...</Text>
        </View>
      )}

      {/* Image Viewer Modal */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={imageViewerVisible}
        onRequestClose={closeImageViewer}
      >
        <View style={styles.fullImageContainer}>
          {/* Header with Controls */}
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeImageViewer}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            
            <Text style={styles.imageViewerTitle}>
              Historical Image
            </Text>
            
            {selectedImageDetections.length > 0 && (
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={toggleDetections}
              >
                <Text style={styles.toggleButtonText}>
                  {showDetections ? "👁️" : "👁️‍🗨️"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Full Screen Image with Detections */}
          <View style={styles.fullImageWrapper}>
            {imageLoading && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#0077b6" />
                <Text style={styles.imageLoadingText}>Loading image...</Text>
              </View>
            )}
            
            {selectedImageUri && (
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.fullImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoad={(event) => {
                  setImageLoading(false);
                  const { width, height } = event.nativeEvent.source;
                  
                  const imageAspectRatio = width / height;
                  let displayWidth = screenWidth;
                  let displayHeight = screenWidth / imageAspectRatio;
                  
                  if (displayHeight > screenHeight - 150) {
                    displayHeight = screenHeight - 150;
                    displayWidth = displayHeight * imageAspectRatio;
                  }
                  
                  setImageSize({
                    width: displayWidth,
                    height: displayHeight
                  });
                }}
                onError={(error) => {
                  console.error('Error loading image:', error);
                  setImageLoading(false);
                  Alert.alert(
                    "Image Error",
                    "Failed to load image. Please try again.",
                    [{ text: "OK", onPress: closeImageViewer }]
                  );
                }}
              />
            )}
            
            {/* Detection Overlays */}
            {!imageLoading && renderImageDetections()}
          </View>
          
          {/* Image Info Footer */}
          <View style={styles.imageViewerFooter}>
            <Text style={styles.imageViewerInfo}>
              Historical Waste Scan
              {selectedImageDetections.length > 0 && ` • ${selectedImageDetections.length} objects detected`}
              {selectedImageDetections.length > 0 && ` • ${showDetections ? "Detections ON" : "Detections OFF"}`}
            </Text>
            
            {/* Detection Summary */}
            {selectedImageDetections.length > 0 && (
              <View style={styles.detectionSummary}>
                <View style={styles.categoryCount}>
                  <View style={[styles.categoryDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.categoryText}>
                    Recyclable: {selectedImageDetections.filter(d => d.category === 'Recyclable' || d.label?.toLowerCase().includes('plastic') || d.label?.toLowerCase().includes('paper')).length}
                  </Text>
                </View>
                <View style={styles.categoryCount}>
                  <View style={[styles.categoryDot, { backgroundColor: '#FF6B6B' }]} />
                  <Text style={styles.categoryText}>
                    Special Waste: {selectedImageDetections.filter(d => d.category === 'Special Waste' || d.label?.toLowerCase().includes('battery') || d.label?.toLowerCase().includes('bulb') || d.label?.toLowerCase().includes('medical')).length}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={styles.imageViewerActions}>
              {selectedImageDetections.length > 0 && (
                <TouchableOpacity 
                  style={styles.detectionsButton}
                  onPress={toggleDetections}
                >
                  <Text style={styles.detectionsButtonText}>
                    {showDetections ? "Hide Detections" : "Show Detections"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedReport && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Report Details</Text>
                  <TouchableOpacity 
                    onPress={() => setDetailModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Image with clickable option */}
                  {selectedReport.image && (
                    <TouchableOpacity 
                      style={styles.imageContainerDetail}
                      onPress={() => openImageViewer(selectedReport.image, selectedReport.detected_objects || selectedReport.detectedObjects)}
                      activeOpacity={0.8}
                    >
                      <Image 
                        source={{ uri: selectedReport.image }} 
                        style={styles.detailImage}
                        resizeMode="cover"
                      />
                      <View style={styles.imageOverlayDetail}>
                        <Text style={styles.overlayTextDetail}>Tap to view full image with detections</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Classification */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Classification</Text>
                    <View style={[
                      styles.classificationBadgeLarge, 
                      { backgroundColor: getClassificationColor(selectedReport.classification) }
                    ]}>
                      <Text style={styles.classificationTextLarge}>
                        {selectedReport.classification}
                      </Text>
                      <Text style={styles.confidenceTextLarge}>
                        Confidence: {formatConfidence(selectedReport.classification_confidence || selectedReport.classificationConfidence)}
                      </Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Status</Text>
                    <View style={[
                      styles.statusBadgeLarge, 
                      { backgroundColor: getStatusColor(selectedReport.status) }
                    ]}>
                      <Text style={styles.statusTextLarge}>{selectedReport.status}</Text>
                    </View>
                  </View>

                  {/* Detected Objects */}
                  {(selectedReport.detected_objects || selectedReport.detectedObjects)?.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        Detected Objects ({(selectedReport.detected_objects || selectedReport.detectedObjects).length})
                      </Text>
                      {(selectedReport.detected_objects || selectedReport.detectedObjects).map((obj, index) => (
                        <View key={index} style={[
                          styles.objectItem,
                          { borderLeftColor: getCategoryColor(obj.category || obj.label), borderLeftWidth: 4 }
                        ]}>
                          <Text style={styles.objectLabel}>
                            {getCategoryIcon(obj.category || obj.label)} {obj.label}
                          </Text>
                          <Text style={styles.objectDetails}>
                            Confidence: {formatConfidence(obj.confidence)} • Material: {obj.material || 'Unknown'}
                            {obj.category && ` • Category: ${obj.category}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Location */}
                  {selectedReport.location && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Location</Text>
                      <Text style={styles.locationTextDetail}>
                        {selectedReport.location.address || 'Not specified'}
                      </Text>
                      {selectedReport.location.coordinates && (
                        <Text style={styles.coordinatesText}>
                          Coordinates: {selectedReport.location.coordinates.lat?.toFixed(4)}, {selectedReport.location.coordinates.lng?.toFixed(4)}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Recycling Tips */}
                  {selectedReport.recycling_tips?.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Recycling Tips</Text>
                      {selectedReport.recycling_tips.map((tip, index) => (
                        <View key={index} style={styles.tipItem}>
                          <Text style={styles.tipText}>• {tip}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Scan Date */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Scan Date</Text>
                    <Text style={styles.dateTextDetail}>
                      {formatDate(selectedReport.scan_date || selectedReport.scanDate)}
                    </Text>
                  </View>

                  {/* Admin Notes */}
                  {selectedReport.adminNotes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Admin Notes</Text>
                      <Text style={styles.adminNotesText}>{selectedReport.adminNotes}</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Delete Report</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete this waste report? This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
                disabled={loading}
              >
                {loading && operation === 'delete' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
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