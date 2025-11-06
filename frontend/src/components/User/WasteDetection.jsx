import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { createWasteReport, clearError, clearSuccess } from '../../redux/slices/wasteReportSlice';
import { styles } from "../../components/Styles/WasteDetection";

const { width: screenWidth } = Dimensions.get("window");
const API_URL = "http://192.168.1.46:5000/detect";

const WasteDetection = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [detected, setDetected] = useState([]);
  const [classification, setClassification] = useState(null);
  const [classificationConfidence, setClassificationConfidence] = useState(0);
  const [wasteComposition, setWasteComposition] = useState({});
  const [materialBreakdown, setMaterialBreakdown] = useState({});
  const [recyclingTips, setRecyclingTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedObject, setSelectedObject] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [location, setLocation] = useState(null);
  const [manualLocation, setManualLocation] = useState("");
  const [detectionCompleted, setDetectionCompleted] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { 
    loading: reportLoading, 
    success, 
    error, 
    currentReport,
    operation 
  } = useSelector(state => state.wasteReport);

  // Clear errors and success states on component mount
  useEffect(() => {
    dispatch(clearError());
    dispatch(clearSuccess());
  }, [dispatch]);

  useEffect(() => {
    getLocation();
  }, []);

  // Enhanced error handling
  useEffect(() => {
    if (error) {
      console.log('❌ Redux Error:', error);
      
      const errorMessage = error.error || error.details || 'An unexpected error occurred';
      
      Alert.alert(
        "❌ Error", 
        errorMessage,
        [{ text: "OK", onPress: () => dispatch(clearError()) }]
      );
    }
  }, [error, dispatch]);

  // Enhanced success handling
  useEffect(() => {
    if (success && operation === 'create' && currentReport) {
      console.log('✅ Report creation success:', currentReport._id);
      
      Alert.alert(
        "✅ Report Submitted Successfully!",
        `Your waste analysis has been recorded and saved to your history.\n\n📊 Detection Summary:\n• Classification: ${currentReport.classification}\n• Objects Detected: ${currentReport.detectedObjects?.length || 0}\n• Confidence: ${Math.round((currentReport.classificationConfidence || 0) * 100)}%\n• Location: ${currentReport.location?.address || "Not specified"}\n\nReport ID: ${currentReport._id}\n\nYou can view this report in your history anytime.`,
        [
          {
            text: "📋 View History",
            onPress: () => {
              navigation.navigate('ReportHistory');
              resetForm();
            }
          },
          {
            text: "🔄 New Scan",
            onPress: () => resetForm()
          },
          {
            text: "OK",
            style: "cancel",
            onPress: () => resetForm()
          }
        ]
      );
    }
  }, [success, operation, currentReport, navigation]);

  const resetForm = () => {
    setImage(null);
    setDetected([]);
    setClassification(null);
    setClassificationConfidence(0);
    setWasteComposition({});
    setMaterialBreakdown({});
    setRecyclingTips([]);
    setDetectionCompleted(false);
    setReportModalVisible(false);
    dispatch(clearSuccess());
    dispatch(clearError());
  };

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required', 
          'Location permission is required for accurate waste reporting and analytics.',
          [
            { 
              text: 'Open Settings', 
              onPress: () => Location.getBackgroundPermissionsAsync() 
            },
            { 
              text: 'Cancel', 
              style: 'cancel' 
            }
          ]
        );
        return;
      }

      setLoading(true);
      
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000
      });
      
      setLocation({
        coordinates: {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        },
        timestamp: new Date().toISOString()
      });

      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (address[0]) {
        const city = address[0].city || '';
        const region = address[0].region || '';
        const country = address[0].country || '';
        const street = address[0].street || '';
        
        const fullAddress = [street, city, region, country].filter(Boolean).join(', ');
        setManualLocation(fullAddress);
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        "Location Error", 
        "Unable to get current location. Please enter manually."
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (fromCamera = false) => {
    try {
      let permissionResult = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required", 
          `You need to grant ${fromCamera ? 'camera' : 'media library'} permission to ${fromCamera ? 'take photos' : 'select images'}.`
        );
        return;
      }

      const pickerOptions = {
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
        exif: false
      };

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
        const selectedImage = pickerResult.assets[0];
        setImage(selectedImage.uri);
        
        // Reset previous detection results
        setDetected([]);
        setClassification(null);
        setClassificationConfidence(0);
        setWasteComposition({});
        setMaterialBreakdown({});
        setRecyclingTips([]);
        setDetectionCompleted(false);
        
        // Clear any previous errors
        dispatch(clearError());
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleDetect = async () => {
    if (!image) {
      Alert.alert("No Image", "Please select or capture an image first.");
      return;
    }

    // Validate image format
    if (!image.startsWith('file://') && !image.startsWith('content://')) {
      Alert.alert("Invalid Image", "Please select a valid image file.");
      return;
    }

    const formData = new FormData();
    formData.append("image", {
      uri: image,
      name: "waste_detection.jpg",
      type: "image/jpeg",
    });

    // Add metadata to help with processing
    formData.append("timestamp", new Date().toISOString());
    if (manualLocation) {
      formData.append("location", manualLocation);
    }

    try {
      setLoading(true);
      setDetectionCompleted(false);
      dispatch(clearError());
      
      console.log('📤 Sending detection request to:', API_URL);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response error:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const detectionData = await response.json();
      console.log('✅ Detection data received:', detectionData);

      // Validate response data
      if (!detectionData) {
        throw new Error('Empty response from server');
      }

      // Set detection results with fallbacks - DIRECT ASSIGNMENT, NO CONVERSION
      setDetected(detectionData.detected_objects || []);
      setClassification(detectionData.classification || "Unknown");
      
      // DIRECT ASSIGNMENT - whatever value comes from AI, use it as is
      setClassificationConfidence(detectionData.classification_confidence || 0);
      
      setWasteComposition(detectionData.waste_composition || {});
      setMaterialBreakdown(detectionData.material_breakdown || {});
      setRecyclingTips(detectionData.recycling_tips || []);
      setDetectionCompleted(true);

      Alert.alert(
        "🎉 Analysis Complete!",
        `We've successfully analyzed your waste image!\n\n📊 Detection Results:\n• ${detectionData.detected_objects?.length || 0} objects detected\n• Primary classification: ${detectionData.classification}\n• Analysis confidence: ${detectionData.classification_confidence}\n\nWould you like to save this report to your history?`,
        [
          {
            text: "💾 Save Report",
            onPress: () => setReportModalVisible(true)
          },
          {
            text: "Skip",
            style: "cancel",
            onPress: () => console.log("Report saving skipped")
          }
        ]
      );

    } catch (err) {
      console.error("❌ Detection error:", err);
      const errorMessage = err.message.includes('Network request failed') 
        ? "Network error: Please check your internet connection and server URL."
        : `Detection failed: ${err.message}`;
      
      Alert.alert("❌ Detection Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = () => {
    if (!user) {
      Alert.alert(
        "🔐 Login Required",
        "Please login to save your waste detection reports to your personal history.",
        [
          {
            text: "Login Now",
            onPress: () => navigation.navigate('Login')
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
      return;
    }

    // Validate required data
    if (!classification) {
      Alert.alert("Incomplete Data", "Please complete waste analysis first.");
      return;
    }

    // DIRECT ASSIGNMENT - send whatever confidence value we have, no conversion
    const reportData = {
      image: image,
      detected_objects: detected || [],
      classification: classification || "Unknown",
      classification_confidence: classificationConfidence, // DIRECT - no division/multiplication
      waste_composition: wasteComposition || {},
      material_breakdown: materialBreakdown || {},
      recycling_tips: recyclingTips || [],
      location: {
        address: manualLocation || "Not specified",
        coordinates: location?.coordinates,
        timestamp: location?.timestamp
      },
      scan_date: new Date().toISOString()
    };

    console.log('📤 Dispatching report creation:', {
      classification: reportData.classification,
      confidence: reportData.classification_confidence, // Whatever value from AI
      confidenceType: typeof reportData.classification_confidence,
      objectsCount: reportData.detected_objects.length,
      hasLocation: !!reportData.location.address
    });

    dispatch(createWasteReport(reportData));
    setReportModalVisible(false);
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

  const getMaterialColor = (material) => {
    const colors = {
      "plastic": "#FF6B6B",
      "glass": "#4ECDC4",
      "metal": "#FFD166",
      "paper": "#A0C1B8",
      "organic": "#8AC926",
      "unknown": "#B8B8B8",
      "cardboard": "#D4A574",
      "textile": "#FF69B4"
    };
    return colors[material] || colors["unknown"];
  };

  const formatPercentage = (value) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return `${Math.round(numValue)}%`;
  };

  // Format confidence for display - show as is, no conversion
  const formatConfidence = (value) => {
    if (typeof value === 'number') {
      // If it's a decimal (0-1), show as percentage, otherwise show as is
      return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
    }
    return `${value}`;
  };

  const viewReportHistory = () => {
    navigation.navigate('ReportHistory');
  };

  const onRefresh = () => {
    setRefreshing(true);
    resetForm();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>♻️ AI Waste Analysis</Text>
        <Text style={styles.subtitle}>Smart waste detection and classification</Text>
      </View>

      {/* User Info */}
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>👤 Logged in as: {user.email}</Text>
          <Text style={styles.userRole}>Role: {user.role || 'user'}</Text>
        </View>
      )}

      {/* Location Section */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>📍 Location Information</Text>
        <TextInput
          style={styles.locationInput}
          placeholder="Enter location or use auto-detected"
          value={manualLocation}
          onChangeText={setManualLocation}
          editable={!loading}
        />
        <TouchableOpacity 
          style={[styles.locationButton, loading && styles.disabledButton]} 
          onPress={getLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Image Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📸 Image Selection</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.cameraButton]} 
            onPress={() => pickImage(true)}
            disabled={loading || reportLoading}
          >
            <Text style={styles.buttonText}>📸 Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.galleryButton]} 
            onPress={() => pickImage(false)}
            disabled={loading || reportLoading}
          >
            <Text style={styles.buttonText}>🖼️ Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Report History Button */}
      <TouchableOpacity 
        style={[styles.actionButton, styles.historyButton]} 
        onPress={viewReportHistory}
        disabled={reportLoading}
      >
        <Text style={styles.buttonText}>📊 View Report History</Text>
      </TouchableOpacity>

      {/* Image Preview Section */}
      {image && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Image</Text>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: image }}
              style={styles.previewImage}
              resizeMode="contain"
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                const scaledHeight = (screenWidth * 0.9 * height) / width;
                setImageSize({ width: screenWidth * 0.9, height: scaledHeight });
              }}
            />
            
            {/* Detection Overlays */}
            {detected.map((item, index) => {
              if (!item.box || !item.box.length) return null;
              
              const [x1, y1, x2, y2] = item.box;
              const left = x1 * imageSize.width;
              const top = y1 * imageSize.height;
              const width = (x2 - x1) * imageSize.width;
              const height = (y2 - y1) * imageSize.height;
              const borderColor = getClassificationColor(item.label);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.boundingBox,
                    {
                      left,
                      top,
                      width,
                      height,
                      borderColor,
                    }
                  ]}
                  onPress={() => {
                    setSelectedObject(item);
                    setModalVisible(true);
                  }}
                >
                  <View style={[styles.labelBox, { backgroundColor: borderColor }]}>
                    <Text style={styles.labelText}>
                      {item.label} ({formatConfidence(item.confidence)})
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        {image && !detectionCompleted && (
          <View style={styles.detectSection}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0077b6" />
                <Text style={styles.loadingText}>🔄 Analyzing waste composition...</Text>
                <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.actionButton, styles.detectButton]} 
                onPress={handleDetect}
                disabled={reportLoading}
              >
                <Text style={styles.buttonText}>🔍 Analyze Waste Image</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {detectionCompleted && (
          <View style={styles.reportSection}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.reportButton]} 
              onPress={() => setReportModalVisible(true)}
              disabled={reportLoading}
            >
              {reportLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>📝 Save Analysis Report</Text>
              )}
            </TouchableOpacity>
            
            {reportLoading && (
              <Text style={styles.reportHint}>
                ⏳ Saving report to database...
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Results Section */}
      {detectionCompleted && (
        <View style={styles.resultsSection}>
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 Detection Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{detected.length}</Text>
                <Text style={styles.summaryLabel}>Objects Found</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{formatConfidence(classificationConfidence)}</Text>
                <Text style={styles.summaryLabel}>Confidence</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>
                  {Object.keys(wasteComposition).length}
                </Text>
                <Text style={styles.summaryLabel}>Categories</Text>
              </View>
            </View>
          </View>

          {/* Classification Result */}
          <View style={styles.classificationCard}>
            <Text style={styles.resultTitle}>Classification Result</Text>
            <View style={[
              styles.classificationBadge, 
              { backgroundColor: getClassificationColor(classification) }
            ]}>
              <Text style={styles.classificationText}>
                {classification}
              </Text>
              <Text style={styles.confidenceText}>
                Confidence: {formatConfidence(classificationConfidence)}
              </Text>
            </View>
          </View>

          {/* Waste Composition */}
          {Object.keys(wasteComposition).length > 0 && (
            <View style={styles.compositionCard}>
              <Text style={styles.sectionTitle}>Waste Composition</Text>
              {Object.entries(wasteComposition).map(([key, value]) => (
                <View key={key} style={styles.compositionItem}>
                  <Text style={styles.compositionLabel}>
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { 
                          width: `${value}%`,
                          backgroundColor: getClassificationColor(key.split('_')[0])
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>{formatPercentage(value)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Material Breakdown */}
          {Object.keys(materialBreakdown).length > 0 && (
            <View style={styles.materialsCard}>
              <Text style={styles.sectionTitle}>Material Breakdown</Text>
              {Object.entries(materialBreakdown).map(([material, confidence]) => (
                <View key={material} style={styles.materialItem}>
                  <View style={styles.materialInfo}>
                    <View 
                      style={[
                        styles.materialDot, 
                        { backgroundColor: getMaterialColor(material) }
                      ]} 
                    />
                    <Text style={styles.materialName}>
                      {material.charAt(0).toUpperCase() + material.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.materialConfidence}>
                    {formatConfidence(confidence)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Detected Objects */}
          {detected.length > 0 && (
            <View style={styles.objectsCard}>
              <Text style={styles.sectionTitle}>Detected Objects ({detected.length})</Text>
              {detected.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.objectItem}
                  onPress={() => {
                    setSelectedObject(item);
                    setModalVisible(true);
                  }}
                >
                  <View style={styles.objectInfo}>
                    <Text style={styles.objectLabel}>{item.label}</Text>
                    <Text style={styles.objectDetails}>
                      Confidence: {formatConfidence(item.confidence)} • Material: {item.material || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recycling Tips */}
          {recyclingTips.length > 0 && (
            <View style={styles.tipsCard}>
              <Text style={styles.sectionTitle}>♻️ Recycling Tips</Text>
              {recyclingTips.map((tip, i) => (
                <View key={i} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Report Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📋 Save Waste Report</Text>
            
            <View style={styles.reportSummary}>
              <Text style={styles.reportSummaryTitle}>Report Summary:</Text>
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Classification:</Text>
                <Text style={styles.reportDetailValue}>{classification}</Text>
              </View>
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Objects Detected:</Text>
                <Text style={styles.reportDetailValue}>{detected.length}</Text>
              </View>
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Confidence:</Text>
                <Text style={styles.reportDetailValue}>{formatConfidence(classificationConfidence)}</Text>
              </View>
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Location:</Text>
                <Text style={styles.reportDetailValue}>{manualLocation || "Not specified"}</Text>
              </View>
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Scan Date:</Text>
                <Text style={styles.reportDetailValue}>{new Date().toLocaleDateString()}</Text>
              </View>
            </View>

            <Text style={styles.modalMessage}>
              This report will be saved to your personal history and will include:
              • Detection results
              • Location data
              • Recycling recommendations
              • Timestamp
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setReportModalVisible(false)}
                disabled={reportLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSaveReport}
                disabled={reportLoading}
              >
                {reportLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>💾 Save Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Object Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedObject && (
              <>
                <Text style={styles.modalTitle}>Object Details</Text>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Label:</Text>
                  <Text style={styles.detailValue}>{selectedObject.label}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Confidence:</Text>
                  <Text style={styles.detailValue}>{formatConfidence(selectedObject.confidence)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Material:</Text>
                  <Text style={styles.detailValue}>{selectedObject.material || 'Unknown'}</Text>
                </View>
                {selectedObject.area_percentage && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Area Coverage:</Text>
                    <Text style={styles.detailValue}>{selectedObject.area_percentage}%</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default WasteDetection;