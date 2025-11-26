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
  Animated,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { createWasteReport, clearError, clearSuccess } from '../../redux/slices/wasteReportSlice';
import { styles } from "../../components/Styles/WasteDetection";

const { width: screenWidth } = Dimensions.get("window");
const API_URL = "http://192.168.1.44:5000/detect";

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
  const [userMessage, setUserMessage] = useState("");
  const [buttonPressAnim] = useState(new Animated.Value(1));
  const [usingDemoData, setUsingDemoData] = useState(false); 
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { 
    loading: reportLoading, 
    success, 
    error, 
    currentReport,
    operation 
  } = useSelector(state => state.wasteReport);

  useEffect(() => {
    dispatch(clearError());
    dispatch(clearSuccess());
  }, [dispatch]);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (error) {
      const errorMessage = error.error || error.details || 'An unexpected error occurred';
      Alert.alert("Error", errorMessage, [{ text: "OK", onPress: () => dispatch(clearError()) }]);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (success && operation === 'create' && currentReport) {
      Alert.alert(
        "Report Submitted Successfully!",
        `Your waste analysis has been recorded and saved to your history.`,
        [
          {
            text: "View History",
            onPress: () => {
              navigation.navigate('ReportHistory');
              resetForm();
            }
          },
          {
            text: "New Scan",
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
    setUserMessage("");
    setUsingDemoData(false); // Reset demo flag
    dispatch(clearSuccess());
    dispatch(clearError());
  };

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission Required', 'Location permission is required for accurate waste reporting.');
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
      Alert.alert("Location Error", "Unable to get current location. Please enter manually.");
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
        Alert.alert("Permission Required", `You need to grant ${fromCamera ? 'camera' : 'media library'} permission.`);
        return;
      }

      const pickerOptions = {
        quality: 0.8,
        allowsEditing: false,
        aspect: [4, 3],
        base64: true,
      };

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
        const selectedImage = pickerResult.assets[0];
        console.log('Selected image URI:', selectedImage.uri);
        setImage(selectedImage.uri);
        
        setDetected([]);
        setClassification(null);
        setClassificationConfidence(0);
        setWasteComposition({});
        setMaterialBreakdown({});
        setRecyclingTips([]);
        setDetectionCompleted(false);
        setUsingDemoData(false); // Reset demo flag when new image is selected
        
        dispatch(clearError());
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonPressAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonPressAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleDetect = async () => {
    if (!image) {
      Alert.alert("No Image", "Please select or capture an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", {
      uri: image,
      name: "waste_detection.jpg",
      type: "image/jpeg",
    });

    formData.append("timestamp", new Date().toISOString());
    if (manualLocation) {
      formData.append("location", manualLocation);
    }

    try {
      setLoading(true);
      setDetectionCompleted(false);
      setUsingDemoData(false); // Reset demo flag
      dispatch(clearError());
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status}`);
      }

      const detectionData = await response.json();

      setDetected(detectionData.detected_objects || []);
      setClassification(detectionData.classification || "Unknown");
      setClassificationConfidence(detectionData.classification_confidence || 0);
      setWasteComposition(detectionData.waste_composition || {});
      setMaterialBreakdown(detectionData.material_breakdown || {});
      setRecyclingTips(detectionData.recycling_tips || []);
      setDetectionCompleted(true);

      Alert.alert(
        "Analysis Complete!",
        `We've successfully analyzed your waste image!`,
        [
          {
            text: "Save Report",
            onPress: () => setReportModalVisible(true)
          },
          {
            text: "Skip",
            style: "cancel"
          }
        ]
      );

    } catch (err) {
      console.error("Detection error:", err);
      Alert.alert(
        "Demo Mode",
        "AI service unavailable. Using demo data for testing.",
        [
          {
            text: "Use Demo Data",
            onPress: () => loadDemoData()
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // NEW FUNCTION: Direct demo button handler
  const handleDemoMode = () => {
    Alert.alert(
      "Demo Mode",
      "Load demo waste analysis data for testing purposes?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Load Demo Data",
          onPress: () => {
            // Set a demo image (you can use a local image or a placeholder)
            setImage("https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Demo+Waste+Image");
            // Load demo data after a short delay to simulate processing
            setTimeout(() => {
              loadDemoData();
            }, 500);
          }
        }
      ]
    );
  };

  const loadDemoData = () => {
    const mockDetected = [
      {
        label: "plastic bottle",
        confidence: 85.5,
        box: [0.1, 0.1, 0.4, 0.6],
        material: "plastic",
        area_percentage: 45.2
      },
      {
        label: "paper",
        confidence: 78.3,
        box: [0.5, 0.2, 0.8, 0.5],
        material: "paper",
        area_percentage: 25.1
      },
      {
        label: "can",
        confidence: 72.8,
        box: [0.3, 0.7, 0.6, 0.9],
        material: "metal",
        area_percentage: 15.7
      }
    ];

    setDetected(mockDetected);
    setClassification("recyclable");
    setClassificationConfidence(82.5);
    setWasteComposition({
      recyclable_materials: 75,
      organic_materials: 15,
      general_waste: 10
    });
    setMaterialBreakdown({
      plastic: 45,
      paper: 25,
      metal: 15,
      glass: 5,
      organic: 10
    });
    setRecyclingTips([
      "Rinse plastic bottles before recycling",
      "Remove caps from bottles",
      "Separate different material types",
      "Flatten cardboard boxes to save space"
    ]);
    setDetectionCompleted(true);
    setUsingDemoData(true); // Set demo flag

    Alert.alert(
      "Demo Analysis Complete!", 
      "Using demo data for testing purposes. This shows how the app works with sample waste detection results.",
      [{ text: "OK" }]
    );
  };

  const handleSaveReport = () => {
    if (!user) {
      Alert.alert(
        "Login Required",
        "Please login to save your waste detection reports.",
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

    if (!classification) {
      Alert.alert("Incomplete Data", "Please complete waste analysis first.");
      return;
    }

    const reportData = {
      image: image,
      detected_objects: detected || [],
      classification: classification || "Unknown",
      classification_confidence: classificationConfidence,
      waste_composition: wasteComposition || {},
      material_breakdown: materialBreakdown || {},
      recycling_tips: recyclingTips || [],
      location: {
        address: manualLocation || "Not specified",
        coordinates: location?.coordinates,
        timestamp: location?.timestamp
      },
      scan_date: new Date().toISOString(),
      user_message: userMessage,
      user_email: user.email,
      is_demo: usingDemoData // Add demo flag to report
    };

    dispatch(createWasteReport(reportData));
    setReportModalVisible(false);
  };

  const getClassificationColor = (classification) => {
    const colors = {
      "Recycling": "#87CEEB",
      "Organic": "#87CEEB",
      "General": "#87CEEB",
      "Hazardous": "#87CEEB",
      "Unknown": "#87CEEB",
      "recyclable": "#87CEEB",
      "organic": "#87CEEB",
      "general_waste": "#87CEEB",
      "hazardous": "#87CEEB"
    };
    return colors[classification] || colors["Unknown"];
  };

  const getMaterialColor = (material) => {
    const colors = {
      "plastic": "#87CEEB",
      "glass": "#87CEEB",
      "metal": "#87CEEB",
      "paper": "#87CEEB",
      "organic": "#87CEEB",
      "unknown": "#87CEEB",
    };
    return colors[material] || colors["unknown"];
  };

  const formatPercentage = (value) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return `${Math.round(numValue)}%`;
  };

  const formatConfidence = (value) => {
    if (typeof value === 'number') {
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Pressable 
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed
          ]} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>AI Waste Analysis</Text>
        <Text style={styles.subtitle}>Smart waste detection and classification</Text>
      </View>

      {/* Demo Mode Indicator */}
      {usingDemoData && (
        <View style={styles.demoIndicator}>
          <Text style={styles.demoIndicatorText}> DEMO MODE - TEST DATA</Text>
        </View>
      )}

      {/* User Info */}
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>{user.email}</Text>
        </View>
      )}

      {/* Location Section */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Location Information</Text>
        <TextInput
          style={styles.locationInput}
          placeholder="Enter location or use auto-detected"
          placeholderTextColor="#B0C4DE"
          value={manualLocation}
          onChangeText={setManualLocation}
          editable={!loading}
        />
        <Pressable 
          style={({ pressed }) => [
            styles.locationButton,
            loading && styles.disabledButton,
            pressed && !loading && styles.buttonPressed
          ]} 
          onPress={getLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.locationButtonText}>Use Current Location</Text>
          )}
        </Pressable>
      </View>

      {/* Image Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Image Selection</Text>
        <View style={styles.buttonContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.actionButton, 
              styles.cameraButton,
              pressed && !loading && !reportLoading && styles.buttonPressed
            ]} 
            onPress={() => pickImage(true)}
            disabled={loading || reportLoading}
          >
            <Text style={styles.buttonText}>Take Photo</Text>
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [
              styles.actionButton, 
              styles.galleryButton,
              pressed && !loading && !reportLoading && styles.buttonPressed
            ]} 
            onPress={() => pickImage(false)}
            disabled={loading || reportLoading}
          >
            <Text style={styles.buttonText}>Choose Gallery</Text>
          </Pressable>

          {/* NEW: Demo Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.actionButton, 
              styles.demoButton,
              pressed && !loading && !reportLoading && styles.buttonPressed
            ]} 
            onPress={handleDemoMode}
            disabled={loading || reportLoading}
          >
            <Text style={styles.buttonText}>Try Demo Mode</Text>
          </Pressable>
        </View>
      </View>

      {/* Report History Button */}
      <Pressable 
        style={({ pressed }) => [
          styles.actionButton, 
          styles.historyButton,
          pressed && !reportLoading && styles.buttonPressed
        ]} 
        onPress={viewReportHistory}
        disabled={reportLoading}
      >
        <Text style={styles.buttonText}>View Report History</Text>
      </Pressable>

      {/* Image Preview with Detection Overlays */}
      {image && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {usingDemoData ? "Demo Image with Detections" : "Scanned Image with Detections"}
          </Text>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: image }}
              style={styles.previewImage}
              resizeMode="cover"
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                const scaledHeight = (screenWidth * 0.9 * height) / width;
                setImageSize({ width: screenWidth * 0.9, height: scaledHeight });
                console.log('Image loaded - Size:', { width, height, scaledHeight });
              }}
              onError={(error) => {
                console.log('Image loading error:', error.nativeEvent.error);
              }}
            />
            
            {/* Detection Overlays - Bounding Boxes */}
            {detected.map((item, index) => {
              if (!item.box || !item.box.length || imageSize.width === 0) return null;
              
              const [x1, y1, x2, y2] = item.box;
              const left = Math.max(0, x1 * imageSize.width);
              const top = Math.max(0, y1 * imageSize.height);
              const width = Math.min(imageSize.width - left, (x2 - x1) * imageSize.width);
              const height = Math.min(imageSize.height - top, (y2 - y1) * imageSize.height);
              const borderColor = getClassificationColor(item.label);

              return (
                <View
                  key={index}
                  style={[
                    styles.boundingBox,
                    {
                      position: 'absolute',
                      left,
                      top,
                      width,
                      height,
                      borderColor,
                      borderWidth: 3,
                    }
                  ]}
                >
                  <View style={[styles.labelBox, { backgroundColor: borderColor }]}>
                    <Text style={styles.labelText}>
                      {item.label} ({formatConfidence(item.confidence)})
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        {image && !detectionCompleted && !usingDemoData && (
          <View style={styles.detectSection}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#87CEEB" />
                <Text style={styles.loadingText}>Analyzing waste composition...</Text>
              </View>
            ) : (
              <Pressable 
                style={({ pressed }) => [
                  styles.actionButton, 
                  styles.detectButton,
                  pressed && !reportLoading && styles.buttonPressed
                ]} 
                onPress={handleDetect}
                disabled={reportLoading}
              >
                <Text style={styles.buttonText}>Analyze Waste Image</Text>
              </Pressable>
            )}
          </View>
        )}

        {detectionCompleted && (
          <View style={styles.reportSection}>
            <Pressable 
              style={({ pressed }) => [
                styles.actionButton, 
                styles.reportButton,
                pressed && !reportLoading && styles.buttonPressed
              ]} 
              onPress={() => setReportModalVisible(true)}
              disabled={reportLoading}
            >
              {reportLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  {usingDemoData ? "Save Demo Report" : "Save Analysis Report"}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Results Section */}
      {detectionCompleted && (
        <View style={styles.resultsSection}>
          {/* Demo Mode Notice */}
          {usingDemoData && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                🔧 You are viewing demo data. This shows sample waste detection results for testing purposes.
              </Text>
            </View>
          )}

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Detection Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{detected.length}</Text>
                <Text style={styles.summaryLabel}>Objects Found</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{formatConfidence(classificationConfidence)}</Text>
                <Text style={styles.summaryLabel}>Confidence</Text>
              </View>
            </View>
          </View>

          {/* Classification Result */}
          <View style={styles.classificationCard}>
            <Text style={styles.resultTitle}>Classification Result</Text>
            <View style={[
              styles.classificationBadge, 
              { backgroundColor: "#87CEEB" }
            ]}>
              <Text style={styles.classificationText}>
                {classification}
              </Text>
              <Text style={styles.confidenceText}>
                Confidence: {formatConfidence(classificationConfidence)}
              </Text>
            </View>
          </View>

          {/* Detected Objects */}
          {detected.length > 0 && (
            <View style={styles.objectsCard}>
              <Text style={styles.sectionTitle}>Detected Objects ({detected.length})</Text>
              {detected.map((item, i) => (
                <View key={i} style={styles.objectItem}>
                  <View style={styles.objectInfo}>
                    <Text style={styles.objectLabel}>{item.label}</Text>
                    <Text style={styles.objectDetails}>
                      Confidence: {formatConfidence(item.confidence)} • Material: {item.material || 'Unknown'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recycling Tips */}
          {recyclingTips.length > 0 && (
            <View style={styles.tipsCard}>
              <Text style={styles.sectionTitle}>Recycling Tips</Text>
              {recyclingTips.map((tip, i) => (
                <View key={i} style={styles.tipItem}>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Report Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {usingDemoData ? "Save Demo Waste Report" : "Save Waste Report"}
            </Text>
            
            {usingDemoData && (
              <View style={styles.demoModalNotice}>
                <Text style={styles.demoModalNoticeText}>
                  This is a demo report for testing purposes.
                </Text>
              </View>
            )}
            
            <ScrollView style={styles.reportSummary}>
              <Text style={styles.reportSummaryTitle}>Report Summary:</Text>
              
              {user && (
                <View style={styles.reportDetail}>
                  <Text style={styles.reportDetailLabel}>User Email:</Text>
                  <Text style={styles.reportDetailValue}>{user.email}</Text>
                </View>
              )}
              
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Classification:</Text>
                <Text style={styles.reportDetailValue}>{classification}</Text>
              </View>
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Objects Detected:</Text>
                <Text style={styles.reportDetailValue}>{detected.length}</Text>
              </View>
              <View style={styles.reportDetail}>
                <Text style={styles.reportDetailLabel}>Location:</Text>
                <Text style={styles.reportDetailValue}>{manualLocation || "Not specified"}</Text>
              </View>
              {usingDemoData && (
                <View style={styles.reportDetail}>
                  <Text style={styles.reportDetailLabel}>Data Source:</Text>
                  <Text style={styles.reportDetailValue}>Demo Data</Text>
                </View>
              )}
            </ScrollView>

            {/* Message Input Field */}
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>Add a message about this report (optional):</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Describe any additional observations..."
                placeholderTextColor="#B0C4DE"
                value={userMessage}
                onChangeText={setUserMessage}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable 
                style={({ pressed }) => [
                  styles.modalButton, 
                  styles.cancelButton,
                  pressed && !reportLoading && styles.buttonPressed
                ]}
                onPress={() => setReportModalVisible(false)}
                disabled={reportLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={({ pressed }) => [
                  styles.modalButton, 
                  styles.confirmButton,
                  pressed && !reportLoading && styles.buttonPressed
                ]}
                onPress={handleSaveReport}
                disabled={reportLoading}
              >
                {reportLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {usingDemoData ? "Save Demo Report" : "Save Report"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default WasteDetection;