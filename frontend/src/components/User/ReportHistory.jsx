// components/User/ReportHistory.js
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

const { width: screenWidth } = Dimensions.get("window");

const ReportHistory = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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
      setHasMore(pagination.hasNext);
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
      "Recycling": "#2E8B57",
      "Organic": "#FF8C00",
      "General": "#DC143C",
      "Hazardous": "#8B0000",
      "Unknown": "#696969",
      "recyclable": "#2E8B57",
      "organic": "#FF8C00",
      "general_waste": "#DC143C",
      "hazardous": "#8B0000"
    };
    return colors[classification] || colors["Unknown"];
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
          <Image 
            source={{ uri: item.image }} 
            style={styles.reportImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.reportInfo}>
          <Text style={styles.dateText}>{formatDate(item.scanDate)}</Text>
          <Text style={styles.confidenceText}>
            Confidence: {formatConfidence(item.classificationConfidence)}
          </Text>
          <Text style={styles.objectsText}>
            Objects detected: {item.detectedObjects?.length || 0}
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
                  {/* Image */}
                  {selectedReport.image && (
                    <Image 
                      source={{ uri: selectedReport.image }} 
                      style={styles.detailImage}
                      resizeMode="cover"
                    />
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
                        Confidence: {formatConfidence(selectedReport.classificationConfidence)}
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
                  {selectedReport.detectedObjects && selectedReport.detectedObjects.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>
                        Detected Objects ({selectedReport.detectedObjects.length})
                      </Text>
                      {selectedReport.detectedObjects.map((obj, index) => (
                        <View key={index} style={styles.objectItem}>
                          <Text style={styles.objectLabel}>{obj.label}</Text>
                          <Text style={styles.objectDetails}>
                            Confidence: {formatConfidence(obj.confidence)} • Material: {obj.material || 'Unknown'}
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
                  {selectedReport.recyclingTips && selectedReport.recyclingTips.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Recycling Tips</Text>
                      {selectedReport.recyclingTips.map((tip, index) => (
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
                      {formatDate(selectedReport.scanDate)}
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