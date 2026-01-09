import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  RefreshControl,
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
  const [imageBase64, setImageBase64] = useState(null);
  const [detected, setDetected] = useState([]);
  const [classification, setClassification] = useState(null);
  const [classificationConfidence, setClassificationConfidence] = useState(0);
  const [wasteComposition, setWasteComposition] = useState({});
  const [materialBreakdown, setMaterialBreakdown] = useState({});
  const [recyclingTips, setRecyclingTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [location, setLocation] = useState(null);
  const [manualLocation, setManualLocation] = useState("");
  const [detectionCompleted, setDetectionCompleted] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [usingDemoData, setUsingDemoData] = useState(false); 
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
    setImageBase64(null);
    setDetected([]);
    setClassification(null);
    setClassificationConfidence(0);
    setWasteComposition({});
    setMaterialBreakdown({});
    setRecyclingTips([]);
    setDetectionCompleted(false);
    setReportModalVisible(false);
    setUserMessage("");
    setUsingDemoData(false);
    setCloudinaryUrl(null);
    setUploadProgress(0);
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

  const compressImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a compressed version
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Image compression error:', error);
      return null;
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
        quality: 0.5, // Reduced quality for smaller file size
        allowsEditing: false,
        aspect: [4, 3],
        base64: true,
        exif: false,
      };

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
        const selectedImage = pickerResult.assets[0];
        console.log('Selected image URI:', selectedImage.uri);
        
        // Show compression progress
        setUploadProgress(10);
        
        setImage(selectedImage.uri);
        
        // Store base64 for API call
        if (selectedImage.base64) {
          const base64WithPrefix = `data:image/jpeg;base64,${selectedImage.base64}`;
          console.log(`Base64 size: ${base64WithPrefix.length} characters`);
          
          // Check if image is too large
          if (base64WithPrefix.length > 10 * 1024 * 1024) { // ~7.5MB image
            Alert.alert(
              "Image Too Large",
              "The selected image is very large. Please choose a smaller image or take a new photo.",
              [{ text: "OK" }]
            );
            return;
          }
          
          setImageBase64(base64WithPrefix);
          setUploadProgress(50);
        }
        
        setDetected([]);
        setClassification(null);
        setClassificationConfidence(0);
        setWasteComposition({});
        setMaterialBreakdown({});
        setRecyclingTips([]);
        setDetectionCompleted(false);
        setUsingDemoData(false);
        setCloudinaryUrl(null);
        
        dispatch(clearError());
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert("Error", "Failed to select image. Please try again.");
      setUploadProgress(0);
    }
  };

  const handleDetect = async () => {
    if (!imageBase64) {
      Alert.alert("No Image", "Please select or capture an image first.");
      return;
    }

    // Check image size before sending
    if (imageBase64.length > 15 * 1024 * 1024) { // ~11MB image
      Alert.alert(
        "Image Too Large",
        "The image is too large to process. Please choose a smaller image.",
        [{ text: "OK" }]
      );
      return;
    }

    const formData = new FormData();
    formData.append("image", imageBase64);
    formData.append("timestamp", new Date().toISOString());
    if (manualLocation) {
      formData.append("location", manualLocation);
    }

    try {
      setLoading(true);
      setUploadProgress(20);
      setDetectionCompleted(false);
      setUsingDemoData(false);
      setCloudinaryUrl(null);
      dispatch(clearError());
      
      console.log(`📤 Sending image to API (size: ${Math.round(imageBase64.length / 1024)}KB)`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      setUploadProgress(60);

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Image too large for server. Please use a smaller image.');
        }
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const detectionData = await response.json();
      setUploadProgress(80);

      if (detectionData.error) {
        throw new Error(detectionData.message || detectionData.error);
      }

      setDetected(detectionData.detected_objects || []);
      setClassification(detectionData.classification || "Unknown");
      setClassificationConfidence(detectionData.classification_confidence || 0);
      setWasteComposition(detectionData.waste_composition || {});
      setMaterialBreakdown(detectionData.material_breakdown || {});
      setRecyclingTips(detectionData.recycling_tips || []);
      setCloudinaryUrl(detectionData.cloudinary_url || null);
      setDetectionCompleted(true);
      setUploadProgress(100);

      Alert.alert(
        "Analysis Complete!",
        `Detected ${detectionData.total_objects_detected || 0} objects.`,
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
      setUploadProgress(0);
      
      if (err.message.includes('too large') || err.message.includes('413')) {
        Alert.alert(
          "Image Too Large",
          "The image is too large to process. Please choose a smaller image or use demo mode.",
          [
            {
              text: "Use Demo Mode",
              onPress: () => loadDemoData()
            },
            {
              text: "Cancel",
              style: "cancel"
            }
          ]
        );
      } else {
        Alert.alert(
          "Connection Error",
          "Unable to connect to the analysis server. Would you like to use demo data?",
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
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

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
            setImage("https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Demo+Waste+Image");
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
    setClassification("Recycling");
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
    setUsingDemoData(true);

    Alert.alert(
      "Demo Analysis Complete!", 
      "Using demo data for testing purposes.",
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

    // Use Cloudinary URL if available, otherwise use base64
    const imageToSave = cloudinaryUrl || imageBase64;

    const reportData = {
      image: imageToSave,
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
      is_demo: usingDemoData,
      cloudinary_url: cloudinaryUrl
    };

    dispatch(createWasteReport(reportData));
    setReportModalVisible(false);
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

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${uploadProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {uploadProgress < 50 ? "Uploading image..." : 
             uploadProgress < 80 ? "Analyzing..." : 
             "Processing results..."}
          </Text>
        </View>
      )}

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

          {/* Demo Button */}
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
        <Text style={styles.imageNote}>
          Note: For best results, use images under 5MB
        </Text>
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
                      borderColor: "#87CEEB",
                      borderWidth: 2,
                    }
                  ]}
                >
                  <View style={[styles.labelBox, { backgroundColor: "#87CEEB" }]}>
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

          {/* Cloudinary Indicator */}
          {cloudinaryUrl && (
            <View style={styles.cloudinaryNotice}>
              <Text style={styles.cloudinaryNoticeText}>
                ☁️ Image uploaded to Cloudinary
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
                  <Text style={styles.tipText}>• {tip}</Text>
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
            
            {cloudinaryUrl && (
              <View style={styles.cloudinaryModalNotice}>
                <Text style={styles.cloudinaryModalNoticeText}>
                  ☁️ Image stored in Cloudinary
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
              {cloudinaryUrl && (
                <View style={styles.reportDetail}>
                  <Text style={styles.reportDetailLabel}>Storage:</Text>
                  <Text style={styles.reportDetailValue}>Cloudinary</Text>
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