import React, { useState, useEffect, useRef } from "react";
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
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";  
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { createWasteReport, clearError, clearSuccess } from '../../redux/slices/wasteReportSlice';
import { Ionicons, MaterialIcons, FontAwesome5, FontAwesome, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const API_URL = "http://192.168.1.44:5000/detect";

const WASTE_CATEGORIES = {
  'Recyclable': ['can', 'glass bottle', 'plastic bottle', 'paper'],
  'Residual': ['styrofoam cups'],
  'Special Waste': []
};

const MATERIAL_TYPES = {
  'can': 'metal',
  'glass bottle': 'glass',
  'plastic bottle': 'plastic',
  'paper': 'paper',
  'styrofoam cups': 'foam'
};

const WasteDetection = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [detected, setDetected] = useState([]);
  const [overallCategory, setOverallCategory] = useState(null);
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [wasteComposition, setWasteComposition] = useState({
    special_waste: 0,
    recyclable: 0,
    residual: 0
  });
  const [recyclingTips, setRecyclingTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [fullImageSize, setFullImageSize] = useState({ width: 0, height: 0 });
  const [location, setLocation] = useState(null);
  const [manualLocation, setManualLocation] = useState("");
  const [detectionCompleted, setDetectionCompleted] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [usingDemoData, setUsingDemoData] = useState(false); 
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [showDetections, setShowDetections] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [allowTraining, setAllowTraining] = useState(false);
  const [datasetSize, setDatasetSize] = useState(0);
  
  // Image Viewer Modal State
  const [fullImageModalVisible, setFullImageModalVisible] = useState(false);
  
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
    fetchDatasetSize();
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

  const fetchDatasetSize = async () => {
    try {
      const response = await fetch('http://192.168.1.44:5000/dataset-info');
      const data = await response.json();
      setDatasetSize(data.total_samples || 0);
    } catch (error) {
      console.log('Could not fetch dataset size:', error);
    }
  };

  const resetForm = () => {
    setImage(null);
    setImageBase64(null);
    setDetected([]);
    setOverallCategory(null);
    setOverallConfidence(0);
    setWasteComposition({
      special_waste: 0,
      recyclable: 0,
      residual: 0
    });
    setRecyclingTips([]);
    setDetectionCompleted(false);
    setReportModalVisible(false);
    setUserMessage("");
    setUsingDemoData(false);
    setCloudinaryUrl(null);
    setUploadProgress(0);
    setImageViewerVisible(false);
    setFullImageModalVisible(false);
    setSelectedImageUri(null);
    setShowDetections(true);
    setAllowTraining(false);
    setShowCamera(false);
    setLiveDetections([]);
    setShowLiveResults(false);
    setLiveClassification(null);
    dispatch(clearSuccess());
    dispatch(clearError());
  };

  const openFullImageModal = (imageUri) => {
    console.log('Opening full image modal with URI:', imageUri);
    setSelectedImageUri(imageUri);
    setImageLoading(true);
    setFullImageModalVisible(true);
  };

  const closeFullImageModal = () => {
    setFullImageModalVisible(false);
    setSelectedImageUri(null);
    setImageLoading(false);
  };

  const toggleDetections = () => {
    setShowDetections(!showDetections);
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
        quality: 0.7,
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
        
        setUploadProgress(10);
        setImage(selectedImage.uri);
        
        if (selectedImage.base64) {
          const base64WithPrefix = `data:image/jpeg;base64,${selectedImage.base64}`;
          console.log(`Base64 length: ${base64WithPrefix.length} characters (~${Math.round(base64WithPrefix.length / 1024)}KB)`);
          
          if (base64WithPrefix.length > 10 * 1024 * 1024) {
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
        setOverallCategory(null);
        setOverallConfidence(0);
        setWasteComposition({
          special_waste: 0,
          recyclable: 0,
          residual: 0
        });
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

    try {
      setLoading(true);
      setUploadProgress(20);
      setDetectionCompleted(false);
      setUsingDemoData(false);
      setCloudinaryUrl(null);
      dispatch(clearError());
      
      console.log(`📤 Sending image to API (size: ${Math.round(imageBase64.length / 1024)}KB)`);
      
      const payload = {
        image: imageBase64,
        allow_training: allowTraining,
        user_id: user?.email || 'anonymous',
        timestamp: new Date().toISOString(),
      };
      
      if (manualLocation) {
        payload.location = manualLocation;
      }

      console.log("Sending JSON payload to API...");

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      setUploadProgress(60);

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        
        if (response.status === 413) {
          throw new Error('Image too large for server. Please use a smaller image.');
        }
        throw new Error(errorMessage);
      }

      const detectionData = await response.json();
      setUploadProgress(80);

      console.log("API Response received:", detectionData);

      if (!detectionData.success) {
        throw new Error(detectionData.message || "Analysis failed");
      }

      const detectedObjects = detectionData.detected_objects || [];
      setDetected(detectedObjects);
      setOverallCategory(detectionData.overall_category || "Unknown");
      setOverallConfidence(detectionData.overall_confidence || 0);
      
      if (detectionData.waste_composition) {
        setWasteComposition({
          special_waste: detectionData.waste_composition.special_waste || 0,
          recyclable: detectionData.waste_composition.recyclable || 0,
          residual: detectionData.waste_composition.residual || 0
        });
      } else {
        setWasteComposition({
          special_waste: 0,
          recyclable: 0,
          residual: 0
        });
      }
      
      setRecyclingTips(detectionData.recycling_tips || []);
      setCloudinaryUrl(detectionData.cloudinary_url || null);
      setDatasetSize(detectionData.dataset_size || datasetSize);
      setDetectionCompleted(true);
      setUploadProgress(100);

      Alert.alert(
        "Analysis Complete!",
        `Detected ${detectionData.total_objects_detected || 0} objects. Overall category: ${detectionData.overall_category || "Unknown"}`,
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
      
      let errorMessage = err.message || "Unknown error occurred";
      
      if (errorMessage.includes('Network request failed')) {
        errorMessage = "Network connection failed. Please check your internet connection and server URL.";
      } else if (errorMessage.includes('fetch')) {
        errorMessage = "Cannot connect to server. Please make sure the API server is running at " + API_URL;
      } else if (errorMessage.includes('JSON')) {
        errorMessage = "Server returned invalid response. Please try again.";
      }
      
      Alert.alert(
        "Analysis Failed",
        errorMessage,
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
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const startLiveCamera = async () => {
    Alert.alert(
      "Live Detection",
      "For live detection, please use the 'Take Photo' option and analyze the image. Full live video detection requires additional setup.",
      [{ text: "OK", onPress: () => pickImage(true) }]
    );
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
            const demoImageUri = "https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Demo+Waste+Image";
            setImage(demoImageUri);
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
        category: "Recyclable",
        area_percentage: 45.2,
        features: {}
      },
      {
        label: "can",
        confidence: 92.3,
        box: [0.5, 0.2, 0.8, 0.5],
        material: "metal",
        category: "Recyclable",
        area_percentage: 15.1,
        features: {}
      },
      {
        label: "paper",
        confidence: 88.7,
        box: [0.3, 0.7, 0.6, 0.9],
        material: "paper",
        category: "Recyclable",
        area_percentage: 20.7,
        features: {}
      },
      {
        label: "glass bottle",
        confidence: 78.4,
        box: [0.7, 0.4, 0.9, 0.7],
        material: "glass",
        category: "Recyclable",
        area_percentage: 12.5,
        features: {}
      },
      {
        label: "styrofoam cups",
        confidence: 82.1,
        box: [0.6, 0.6, 0.9, 0.8],
        material: "foam",
        category: "Residual / Non-Recyclable",
        area_percentage: 8.5,
        features: {}
      }
    ];

    setDetected(mockDetected);
    setOverallCategory("Recyclable");
    setOverallConfidence(88.5);
    setWasteComposition({
      special_waste: 0,
      recyclable: 80,
      residual: 20
    });
    
    setRecyclingTips([
      "RECYCLABLE ITEMS DETECTED:",
      "• Rinse cans and bottles before recycling",
      "• Remove caps from plastic bottles",
      "• Flatten cardboard and paper to save space",
      "• Glass bottles can be recycled endlessly",
      "• Check local recycling guidelines for specifics",
      "STYROFOAM CUPS: Typically non-recyclable - dispose in regular trash"
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

    if (!overallCategory) {
      Alert.alert("Incomplete Data", "Please complete waste analysis first.");
      return;
    }

    const imageToSave = cloudinaryUrl || imageBase64;

    const reportData = {
      image: imageToSave,
      detected_objects: detected || [],
      classification: overallCategory || "Unknown",
      classification_confidence: parseFloat(overallConfidence) || 0,
      waste_composition: wasteComposition || {},
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
      cloudinary_url: cloudinaryUrl,
      allow_training: allowTraining,
    };

    console.log("Saving report with data:", {
      classification: reportData.classification,
      classification_confidence: reportData.classification_confidence,
      user_email: reportData.user_email
    });

    dispatch(createWasteReport(reportData));
    setReportModalVisible(false);
  };

  const formatConfidence = (value) => {
    if (typeof value === 'number') {
      return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
    }
    return `${value}`;
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'Special Waste':
        return '#FF6B6B';
      case 'Recyclable':
        return '#4CAF50';
      case 'Residual / Non-Recyclable':
        return '#FF9800';
      default:
        return '#87CEEB';
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Special Waste':
        return <MaterialIcons name="dangerous" size={20} color="white" />;
      case 'Recyclable':
        return <MaterialIcons name="recycling" size={20} color="white" />;
      case 'Residual / Non-Recyclable':
        return <MaterialIcons name="delete" size={20} color="white" />;
      default:
        return <MaterialIcons name="help" size={20} color="white" />;
    }
  };

  const getMaterialIcon = (material) => {
    switch(material) {
      case 'plastic':
        return <MaterialCommunityIcons name="bottle-soda" size={16} color="#666" />;
      case 'metal':
        return <FontAwesome5 name="cubes" size={16} color="#666" />;
      case 'glass':
        return <MaterialCommunityIcons name="glass-mug" size={16} color="#666" />;
      case 'paper':
        return <Entypo name="news" size={16} color="#666" />;
      case 'foam':
        return <MaterialCommunityIcons name="cup" size={16} color="#666" />;
      default:
        return <MaterialIcons name="category" size={16} color="#666" />;
    }
  };

  const renderPreviewDetections = () => {
    if (!detected.length || imageSize.width === 0 || !showDetections) return null;

    return detected.map((item, index) => {
      if (!item.box || !item.box.length) return null;
      
      const [x1, y1, x2, y2] = item.box;
      const left = Math.max(0, x1 * imageSize.width);
      const top = Math.max(0, y1 * imageSize.height);
      const width = Math.min(imageSize.width - left, (x2 - x1) * imageSize.width);
      const height = Math.min(imageSize.height - top, (y2 - y1) * imageSize.height);
      
      const categoryColor = getCategoryColor(item.category);

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
              borderColor: categoryColor,
              borderWidth: 2,
            }
          ]}
        >
          <View style={[styles.labelBox, { backgroundColor: categoryColor }]}>
            <Text style={styles.labelText} numberOfLines={1}>
              {item.label} ({formatConfidence(item.confidence)})
            </Text>
          </View>
        </View>
      );
    });
  };

  const renderFullImageDetections = () => {
    if (!detected.length || !fullImageModalVisible) return null;

    return detected.map((item, index) => {
      if (!item.box || !item.box.length) return null;
      
      const [x1, y1, x2, y2] = item.box;
      const left = Math.max(0, x1 * screenWidth * 0.9);
      const top = Math.max(0, y1 * (screenWidth * 0.9 * (imageSize.height / imageSize.width)) || 300);
      const width = Math.min(screenWidth * 0.9 - left, (x2 - x1) * screenWidth * 0.9);
      const height = Math.min((screenWidth * 0.9 * (imageSize.height / imageSize.width)) - top, 
                             (y2 - y1) * (screenWidth * 0.9 * (imageSize.height / imageSize.width)) || 300);
      
      const categoryColor = getCategoryColor(item.category);

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
              borderColor: categoryColor,
              borderWidth: 3,
            }
          ]}
        >
          <View style={[styles.labelBox, { 
            backgroundColor: categoryColor,
            minWidth: 120,
            paddingHorizontal: 8,
          }]}>
            <View style={styles.labelRow}>
              {getCategoryIcon(item.category)}
              <Text style={styles.labelText} numberOfLines={1}>
                {item.label} ({formatConfidence(item.confidence)})
              </Text>
            </View>
          </View>
        </View>
      );
    });
  };

  const renderCompositionChart = () => {
    const specialPercent = wasteComposition.special_waste || 0;
    const recyclablePercent = wasteComposition.recyclable || 0;
    const residualPercent = wasteComposition.residual || 0;

    return (
      <View style={styles.compositionCard}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="pie-chart" size={20} color="#1976D2" />
          <Text style={styles.sectionTitle}>Waste Composition</Text>
        </View>
        <View style={styles.compositionChart}>
          <View style={styles.chartLabels}>
            <View style={styles.chartLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.chartLabelText}>
                Special Waste: {specialPercent}%
              </Text>
            </View>
            <View style={styles.chartLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.chartLabelText}>
                Recyclable: {recyclablePercent}%
              </Text>
            </View>
            <View style={styles.chartLabel}>
              <View style={[styles.colorIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.chartLabelText}>
                Residual: {residualPercent}%
              </Text>
            </View>
          </View>
          
          <View style={styles.chartBar}>
            <View 
              style={[
                styles.chartSegment, 
                { 
                  width: `${specialPercent}%`, 
                  backgroundColor: '#FF6B6B' 
                }
              ]} 
            />
            <View 
              style={[
                styles.chartSegment, 
                { 
                  width: `${recyclablePercent}%`, 
                  backgroundColor: '#4CAF50' 
                }
              ]} 
            />
            <View 
              style={[
                styles.chartSegment, 
                { 
                  width: `${residualPercent}%`, 
                  backgroundColor: '#FF9800' 
                }
              ]} 
            />
          </View>
        </View>
      </View>
    );
  };

  const viewReportHistory = () => {
    navigation.navigate('ReportHistory');
  };

  const onRefresh = () => {
    setRefreshing(true);
    resetForm();
    fetchDatasetSize();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const trainModel = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://192.168.1.44:5000/train', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          min_samples: 50,
          test_size: 0.2,
          retrain_yolo: false
        })
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert("Training Successful", `Model accuracy: ${(data.accuracy * 100).toFixed(1)}%`);
        fetchDatasetSize();
      } else {
        Alert.alert("Training Failed", data.message);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to train model");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1976D2" />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable 
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed
              ]} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>AI Waste Analysis</Text>
              <Text style={styles.subtitle}>Detect & Classify Waste Types</Text>
            </View>
          </View>
        </View>

        {/* Dataset Info */}
        <View style={styles.datasetInfo}>
          <View style={styles.datasetLeft}>
            <Ionicons name="analytics" size={18} color="#1976D2" />
            <Text style={styles.datasetText}>
              Training Dataset: {datasetSize} samples
            </Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.trainButton,
              (loading || datasetSize < 50) && styles.disabledTrainButton
            ]}
            onPress={trainModel} 
            disabled={loading || datasetSize < 50}
          >
            <Ionicons name="refresh" size={16} color={datasetSize < 50 ? "#9E9E9E" : "#4CAF50"} />
            <Text style={[
              styles.trainButtonText,
              (loading || datasetSize < 50) && styles.disabledTrainButtonText
            ]}>
              Train
            </Text>
          </TouchableOpacity>
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
            <Ionicons name="beaker" size={16} color="white" />
            <Text style={styles.demoIndicatorText}> DEMO MODE - TEST DATA</Text>
          </View>
        )}

        {/* User Info */}
        {user && (
          <View style={styles.userInfo}>
            <Ionicons name="person-circle" size={20} color="#1976D2" />
            <Text style={styles.userText}>{user.email}</Text>
          </View>
        )}

        {/* Location Section */}
        <View style={styles.locationSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#1976D2" />
            <Text style={styles.sectionTitle}>Location Information</Text>
          </View>
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
              <>
                <Ionicons name="locate" size={18} color="white" />
                <Text style={styles.locationButtonText}>Use Current Location</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Training Consent */}
        <View style={styles.consentSection}>
          <View style={styles.consentRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAllowTraining(!allowTraining)}
            >
              {allowTraining && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
            </TouchableOpacity>
            <Text style={styles.consentText}>
              Allow using this scan to improve AI model (anonymous)
            </Text>
          </View>
          <Text style={styles.consentNote}>
            <Ionicons name="information-circle" size={14} color="#666" /> 
            Your data helps train the model to recognize new waste types
          </Text>
        </View>

        {/* Image Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera" size={20} color="#1976D2" />
            <Text style={styles.sectionTitle}>Detection Method</Text>
          </View>
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
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.buttonText}>Cam</Text>
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
              <Ionicons name="images" size={20} color="white" />
              <Text style={styles.buttonText}>IMG</Text>
            </Pressable>

            <Pressable 
              style={({ pressed }) => [
                styles.actionButton, 
                styles.liveButton,
                pressed && !loading && !reportLoading && styles.buttonPressed
              ]} 
              onPress={startLiveCamera}
              disabled={loading || reportLoading}
            >
              <Ionicons name="videocam" size={20} color="white" />
              <Text style={styles.buttonText}>Live</Text>
            </Pressable>

            <Pressable 
              style={({ pressed }) => [
                styles.actionButton, 
                styles.demoButton,
                pressed && !loading && !reportLoading && styles.buttonPressed
              ]} 
              onPress={handleDemoMode}
              disabled={loading || reportLoading}
            >
              <Ionicons name="beaker" size={20} color="white" />
              <Text style={styles.buttonText}>Demo</Text>
            </Pressable>
          </View>
          <Text style={styles.imageNote}>
            <Ionicons name="information-circle" size={14} color="#666" /> 
            For best results, use clear images under 5MB
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
          <Ionicons name="time" size={20} color="white" />
          <Text style={styles.buttonText}>Report History</Text>
        </Pressable>

        {/* Image Preview with Detection Overlays */}
        {image && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="image" size={20} color="#1976D2" />
              <Text style={styles.sectionTitle}>
                {usingDemoData ? "Demo Image with Detections" : "Scanned Image with Detections"}
              </Text>
            </View>
            
            {/* Clickable Image Preview */}
            <TouchableOpacity 
              style={styles.imageContainer}
              activeOpacity={0.8}
              onPress={() => openFullImageModal(image)}
            >
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
              
              <View style={styles.imageOverlay}>
                <Ionicons name="expand" size={20} color="white" />
                <Text style={styles.overlayText}>Tap to view full image</Text>
              </View>
              
              {renderPreviewDetections()}
            </TouchableOpacity>
            
            <View style={styles.imageInfoContainer}>
              <Text style={styles.imageInfoText}>
                <Ionicons name="information-circle" size={14} color="#1976D2" />
                {detectionCompleted ? 
                  ` Click the image above to view full size with ${detected.length} detections` : 
                  " Image selected for analysis"}
              </Text>
            </View>

            {/* Toggle Detections Button */}
            {detected.length > 0 && (
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={toggleDetections}
              >
                <Ionicons 
                  name={showDetections ? "eye-off" : "eye"} 
                  size={18} 
                  color="#1976D2" 
                />
                <Text style={styles.toggleButtonText}>
                  {showDetections ? "Hide Detections" : "Show Detections"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          {image && !detectionCompleted && !usingDemoData && (
            <View style={styles.detectSection}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1976D2" />
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
                  <Ionicons name="analytics" size={20} color="white" />
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
                  <>
                    <Ionicons name="save" size={20} color="white" />
                    <Text style={styles.buttonText}>
                      {usingDemoData ? "Save Demo Report" : "Save Analysis Report"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {/* Results Section */}
        {detectionCompleted && (
          <View style={styles.resultsSection}>
            {usingDemoData && (
              <View style={styles.demoNotice}>
                <Ionicons name="beaker" size={16} color="#E65100" />
                <Text style={styles.demoNoticeText}>
                  You are viewing demo data. This shows sample waste detection results for testing purposes.
                </Text>
              </View>
            )}

            {cloudinaryUrl && (
              <View style={styles.cloudinaryNotice}>
                <Ionicons name="cloud" size={16} color="#1976D2" />
                <Text style={styles.cloudinaryNoticeText}>
                  Image uploaded to Cloudinary
                </Text>
              </View>
            )}

            {allowTraining && (
              <View style={styles.trainingNotice}>
                <Ionicons name="brain" size={16} color="#2E7D32" />
                <Text style={styles.trainingNoticeText}>
                  This scan will help improve the AI model
                </Text>
              </View>
            )}

            <View style={styles.summaryCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color="#1976D2" />
                <Text style={styles.summaryTitle}>Detection Summary</Text>
              </View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{detected.length}</Text>
                  <Text style={styles.summaryLabel}>Objects Found</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{formatConfidence(overallConfidence)}</Text>
                  <Text style={styles.summaryLabel}>Confidence</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{datasetSize}</Text>
                  <Text style={styles.summaryLabel}>Training Data</Text>
                </View>
              </View>
            </View>

            <View style={styles.classificationCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="category" size={20} color="#1976D2" />
                <Text style={styles.resultTitle}>Overall Category</Text>
              </View>
              <View style={[
                styles.classificationBadge, 
                { backgroundColor: getCategoryColor(overallCategory) }
              ]}>
                <View style={styles.classificationContent}>
                  {getCategoryIcon(overallCategory)}
                  <Text style={styles.classificationText}>
                    {overallCategory}
                  </Text>
                </View>
                <Text style={styles.confidenceText}>
                  Confidence: {formatConfidence(overallConfidence)}
                </Text>
              </View>
            </View>

            {renderCompositionChart()}

            {/* Detected Objects */}
            {detected.length > 0 && (
              <View style={styles.objectsCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="search" size={20} color="#1976D2" />
                  <Text style={styles.sectionTitle}>All Detected Objects ({detected.length})</Text>
                </View>
                {detected.map((item, i) => (
                  <View key={i} style={[
                    styles.objectItem,
                    { borderLeftColor: getCategoryColor(item.category), borderLeftWidth: 4 }
                  ]}>
                    <View style={styles.objectInfo}>
                      <View style={styles.objectHeader}>
                        <View style={styles.objectLabelContainer}>
                          {getCategoryIcon(item.category)}
                          <Text style={styles.objectLabel}>
                            {item.label}
                          </Text>
                        </View>
                        <View style={[
                          styles.objectCategory,
                          { backgroundColor: getCategoryColor(item.category) + '20' }
                        ]}>
                          <Text style={[styles.objectCategoryText, { color: getCategoryColor(item.category) }]}>
                            {item.category}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.objectDetails}>
                        <View style={styles.detailRow}>
                          {getMaterialIcon(item.material)}
                          <Text style={styles.detailText}>{item.material}</Text>
                          <Ionicons name="speedometer" size={14} color="#666" style={styles.detailIcon} />
                          <Text style={styles.detailText}>Confidence: {formatConfidence(item.confidence)}</Text>
                          <Ionicons name="square" size={14} color="#666" style={styles.detailIcon} />
                          <Text style={styles.detailText}>Area: {item.area_percentage?.toFixed(1)}%</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recycling Tips */}
            {recyclingTips.length > 0 && (
              <View style={styles.tipsCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="bulb" size={20} color="#1976D2" />
                  <Text style={styles.sectionTitle}>Recycling Tips</Text>
                </View>
                {recyclingTips.map((tip, i) => (
                  <View key={i} style={styles.tipItem}>
                    {tip.includes(':') ? (
                      <>
                        <Text style={styles.tipHeader}>{tip.split(':')[0]}:</Text>
                        <Text style={styles.tipText}>{tip.split(':')[1]}</Text>
                      </>
                    ) : tip.startsWith('•') ? (
                      <View style={styles.tipBullet}>
                        <Text style={styles.tipBulletDot}>•</Text>
                        <Text style={styles.tipText}>{tip.substring(1)}</Text>
                      </View>
                    ) : (
                      <Text style={styles.tipText}>{tip}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Full Image Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={fullImageModalVisible}
          onRequestClose={closeFullImageModal}
        >
          <View style={styles.fullImageModalOverlay}>
            <View style={styles.fullImageModalContent}>
              <View style={styles.fullImageHeader}>
                <Text style={styles.fullImageTitle}>Full Image with Detections</Text>
                <Pressable onPress={closeFullImageModal}>
                  <Ionicons name="close" size={28} color="white" />
                </Pressable>
              </View>
              
              <View style={styles.fullImageContainer}>
                {imageLoading ? (
                  <View style={styles.fullImageLoading}>
                    <ActivityIndicator size="large" color="#1976D2" />
                    <Text style={styles.fullImageLoadingText}>Loading image...</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: selectedImageUri || image }}
                    style={styles.fullImage}
                    resizeMode="contain"
                    onLoadEnd={() => setImageLoading(false)}
                  />
                )}
                {renderFullImageDetections()}
              </View>
              
              <View style={styles.fullImageStats}>
                <Text style={styles.fullImageStatsText}>
                  <Ionicons name="cube" size={16} color="white" /> 
                  {detected.length} objects detected
                </Text>
                <Text style={styles.fullImageStatsText}>
                  <Ionicons name="analytics" size={16} color="white" /> 
                  Overall: {overallCategory} ({formatConfidence(overallConfidence)})
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Report Confirmation Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={reportModalVisible}
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {usingDemoData ? "Save Demo Waste Report" : "Save Waste Report"}
                </Text>
                <Pressable onPress={() => setReportModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </Pressable>
              </View>
              
              {usingDemoData && (
                <View style={styles.demoModalNotice}>
                  <Ionicons name="beaker" size={16} color="#E65100" />
                  <Text style={styles.demoModalNoticeText}>
                    This is a demo report for testing purposes.
                  </Text>
                </View>
              )}
              
              {cloudinaryUrl && (
                <View style={styles.cloudinaryModalNotice}>
                  <Ionicons name="cloud" size={16} color="#1976D2" />
                  <Text style={styles.cloudinaryModalNoticeText}>
                    Image stored in Cloudinary
                  </Text>
                </View>
              )}
              
              {allowTraining && (
                <View style={styles.trainingModalNotice}>
                  <Ionicons name="brain" size={16} color="#2E7D32" />
                  <Text style={styles.trainingModalNoticeText}>
                    This data will be used to improve the AI model
                  </Text>
                </View>
              )}
              
              <ScrollView style={styles.reportSummary}>
                <Text style={styles.reportSummaryTitle}>Report Summary:</Text>
                
                {user && (
                  <View style={styles.reportDetail}>
                    <Ionicons name="person" size={16} color="#666" style={styles.reportIcon} />
                    <Text style={styles.reportDetailLabel}>User Email:</Text>
                    <Text style={styles.reportDetailValue}>{user.email}</Text>
                  </View>
                )}
                
                <View style={styles.reportDetail}>
                  <Ionicons name="category" size={16} color="#666" style={styles.reportIcon} />
                  <Text style={styles.reportDetailLabel}>Overall Category:</Text>
                  <Text style={[
                    styles.reportDetailValue,
                    { color: getCategoryColor(overallCategory) }
                  ]}>
                    {overallCategory}
                  </Text>
                </View>
                <View style={styles.reportDetail}>
                  <Ionicons name="cube" size={16} color="#666" style={styles.reportIcon} />
                  <Text style={styles.reportDetailLabel}>Objects Detected:</Text>
                  <Text style={styles.reportDetailValue}>{detected.length}</Text>
                </View>
                <View style={styles.reportDetail}>
                  <Ionicons name="location" size={16} color="#666" style={styles.reportIcon} />
                  <Text style={styles.reportDetailLabel}>Location:</Text>
                  <Text style={styles.reportDetailValue}>{manualLocation || "Not specified"}</Text>
                </View>
                <View style={styles.reportDetail}>
                  <Ionicons name="pie-chart" size={16} color="#666" style={styles.reportIcon} />
                  <Text style={styles.reportDetailLabel}>Waste Composition:</Text>
                  <Text style={styles.reportDetailValue}>
                    Special: {wasteComposition.special_waste}%,
                    Recyclable: {wasteComposition.recyclable}%,
                    Residual: {wasteComposition.residual}%
                  </Text>
                </View>
                
                {usingDemoData && (
                  <View style={styles.reportDetail}>
                    <Ionicons name="beaker" size={16} color="#666" style={styles.reportIcon} />
                    <Text style={styles.reportDetailLabel}>Data Source:</Text>
                    <Text style={styles.reportDetailValue}>Demo Data</Text>
                  </View>
                )}
                {cloudinaryUrl && (
                  <View style={styles.reportDetail}>
                    <Ionicons name="cloud" size={16} color="#666" style={styles.reportIcon} />
                    <Text style={styles.reportDetailLabel}>Storage:</Text>
                    <Text style={styles.reportDetailValue}>Cloudinary</Text>
                  </View>
                )}
                {allowTraining && (
                  <View style={styles.reportDetail}>
                    <Ionicons name="brain" size={16} color="#666" style={styles.reportIcon} />
                    <Text style={styles.reportDetailLabel}>Training:</Text>
                    <Text style={styles.reportDetailValue}>Will improve model</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.messageSection}>
                <View style={styles.messageHeader}>
                  <Ionicons name="chatbubble" size={18} color="#333" />
                  <Text style={styles.messageLabel}>Add a message about this report (optional):</Text>
                </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  datasetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 15,
  },
  datasetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datasetText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  trainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  disabledTrainButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  trainButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledTrainButtonText: {
    color: '#9E9E9E',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  demoIndicator: {
    backgroundColor: '#FF9800',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  demoIndicatorText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  userInfo: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  userText: {
    color: '#1976D2',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  locationSection: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  locationButton: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  locationButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  consentSection: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  consentNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '22%',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
  },
  galleryButton: {
    backgroundColor: '#2196F3',
  },
  liveButton: {
    backgroundColor: '#9C27B0',
  },
  demoButton: {
    backgroundColor: '#FF9800',
  },
  historyButton: {
    backgroundColor: '#607D8B',
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  detectButton: {
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  reportButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  imageNote: {
    fontSize: 12,
    color: '#666',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    marginBottom: 10,
    minHeight: 200,
  },
  previewImage: {
    width: '100%',
    height: 300,
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  overlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  boundingBox: {
    borderWidth: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  labelBox: {
    position: 'absolute',
    top: -28,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 100,
    maxWidth: 200,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  imageInfoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  imageInfoText: {
    color: '#1976D2',
    fontSize: 13,
    textAlign: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 10,
  },
  toggleButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  detectSection: {
    marginTop: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  reportSection: {
    marginTop: 10,
  },
  resultsSection: {
    paddingHorizontal: 20,
  },
  demoNotice: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  demoNoticeText: {
    color: '#E65100',
    fontSize: 13,
    flex: 1,
  },
  cloudinaryNotice: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cloudinaryNoticeText: {
    color: '#1976D2',
    fontSize: 13,
    flex: 1,
  },
  trainingNotice: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  trainingNoticeText: {
    color: '#2E7D32',
    fontSize: 13,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  classificationCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  classificationBadge: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  classificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  classificationText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  confidenceText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  compositionCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  compositionChart: {
    marginTop: 10,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 10,
  },
  chartLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  chartLabelText: {
    fontSize: 13,
    color: '#666',
  },
  chartBar: {
    height: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  chartSegment: {
    height: '100%',
  },
  objectsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  objectItem: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  objectInfo: {},
  objectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  objectLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  objectLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  objectCategory: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  objectCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  objectDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  detailIcon: {
    marginRight: 2,
  },
  tipsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  tipItem: {
    marginBottom: 10,
  },
  tipHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tipBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBulletDot: {
    fontSize: 16,
    color: '#4CAF50',
  },
  tipText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  // Full Image Modal Styles
  fullImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageModalContent: {
    width: '100%',
    height: '100%',
    padding: 20,
  },
  fullImageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 40,
  },
  fullImageTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: '80%',
    borderRadius: 8,
  },
  fullImageLoading: {
    alignItems: 'center',
  },
  fullImageLoadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
  fullImageStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  fullImageStatsText: {
    color: 'white',
    fontSize: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Report Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  demoModalNotice: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoModalNoticeText: {
    color: '#E65100',
    fontSize: 13,
    flex: 1,
  },
  cloudinaryModalNotice: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cloudinaryModalNoticeText: {
    color: '#1976D2',
    fontSize: 13,
    flex: 1,
  },
  trainingModalNotice: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainingModalNoticeText: {
    color: '#2E7D32',
    fontSize: 13,
    flex: 1,
  },
  reportSummary: {
    maxHeight: 200,
    marginBottom: 15,
  },
  reportSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  reportDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reportIcon: {
    width: 20,
  },
  reportDetailLabel: {
    fontSize: 13,
    color: '#666',
    width: 120,
  },
  reportDetailValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  messageSection: {
    marginBottom: 20,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  messageLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#1976D2',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default WasteDetection;

// import React, { useState, useEffect, useRef } from "react";
// import {
//   View,
//   Text,
//   Image,
//   ActivityIndicator,
//   Alert,
//   Dimensions,
//   ScrollView,
//   Modal,
//   TextInput,
//   RefreshControl,
//   Pressable,
//   TouchableOpacity,
//   StyleSheet,
//   Platform,
//   SafeAreaView,
// } from "react-native";
// import { CameraView, useCameraPermissions } from 'expo-camera';
// import * as ImagePicker from "expo-image-picker";  
// import * as Location from 'expo-location';
// import { useSelector, useDispatch } from 'react-redux';
// import { createWasteReport, clearError, clearSuccess } from '../../redux/slices/wasteReportSlice';
// import { Ionicons, MaterialIcons, FontAwesome5, FontAwesome, MaterialCommunityIcons, Entypo } from '@expo/vector-icons';

// const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
// const API_URL = "http://192.168.1.44:5000";
// const WS_URL = "ws://192.168.1.44:5000/ws/live-detection";

// const WASTE_CATEGORIES = {
//   'Recyclable': ['can', 'glass bottle', 'plastic bottle', 'paper'],
//   'Residual / Non-Recyclable': ['styrofoam cups'],
//   'Special Waste': []
// };

// const MATERIAL_TYPES = {
//   'can': 'metal',
//   'glass bottle': 'glass',
//   'plastic bottle': 'plastic',
//   'paper': 'paper',
//   'styrofoam cups': 'foam'
// };

// // Confidence threshold - only show boxes above this
// const CONFIDENCE_THRESHOLD = 0.45; // 45% minimum confidence

// // Non-Maximum Suppression function to remove redundant boxes
// const nonMaxSuppression = (boxes, iouThreshold = 0.5) => {
//   if (!boxes || boxes.length === 0) return [];
  
//   // Sort by confidence
//   const sortedBoxes = [...boxes].sort((a, b) => b.confidence - a.confidence);
//   const selectedBoxes = [];
  
//   while (sortedBoxes.length > 0) {
//     const current = sortedBoxes.shift();
//     selectedBoxes.push(current);
    
//     // Remove boxes that overlap too much with current
//     const remainingBoxes = [];
//     for (const box of sortedBoxes) {
//       const iou = calculateIoU(current.box, box.box);
//       if (iou < iouThreshold) {
//         remainingBoxes.push(box);
//       }
//     }
//     sortedBoxes.length = 0;
//     sortedBoxes.push(...remainingBoxes);
//   }
  
//   return selectedBoxes;
// };

// // Calculate Intersection over Union
// const calculateIoU = (box1, box2) => {
//   const [x1, y1, x2, y2] = box1;
//   const [x3, y3, x4, y4] = box2;
  
//   const xi1 = Math.max(x1, x3);
//   const yi1 = Math.max(y1, y3);
//   const xi2 = Math.min(x2, x4);
//   const yi2 = Math.min(y2, y4);
  
//   const interArea = Math.max(0, xi2 - xi1) * Math.max(0, yi2 - yi1);
  
//   const box1Area = (x2 - x1) * (y2 - y1);
//   const box2Area = (x4 - x3) * (y4 - y3);
  
//   const unionArea = box1Area + box2Area - interArea;
  
//   return interArea / unionArea;
// };

// const WasteDetection = ({ navigation }) => {
//   const [image, setImage] = useState(null);
//   const [imageBase64, setImageBase64] = useState(null);
//   const [detected, setDetected] = useState([]);
//   const [overallCategory, setOverallCategory] = useState(null);
//   const [overallConfidence, setOverallConfidence] = useState(0);
//   const [wasteComposition, setWasteComposition] = useState({
//     special_waste: 0,
//     recyclable: 0,
//     residual: 0
//   });
//   const [recyclingTips, setRecyclingTips] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
//   const [location, setLocation] = useState(null);
//   const [manualLocation, setManualLocation] = useState("");
//   const [detectionCompleted, setDetectionCompleted] = useState(false);
//   const [reportModalVisible, setReportModalVisible] = useState(false);
//   const [refreshing, setRefreshing] = useState(false);
//   const [userMessage, setUserMessage] = useState("");
//   const [usingDemoData, setUsingDemoData] = useState(false); 
//   const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [selectedImageUri, setSelectedImageUri] = useState(null);
//   const [showDetections, setShowDetections] = useState(true);
//   const [imageLoading, setImageLoading] = useState(false);
//   const [allowTraining, setAllowTraining] = useState(false);
//   const [datasetSize, setDatasetSize] = useState(0);
//   const [processingTime, setProcessingTime] = useState(null);
//   const [fps, setFps] = useState(null);
//   const [liveStatus, setLiveStatus] = useState(null);
  
//   // REAL-TIME LIVE DETECTION STATES
//   const [permission, requestPermission] = useCameraPermissions();
//   const [cameraActive, setCameraActive] = useState(false);
//   const [liveDetections, setLiveDetections] = useState([]);
//   const [liveBoxes, setLiveBoxes] = useState([]);
//   const [cameraRef, setCameraRef] = useState(null);
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [streamingQuality, setStreamingQuality] = useState(40); // Higher quality for better detection
//   const [currentFps, setCurrentFps] = useState(0);
//   const [cameraDimensions, setCameraDimensions] = useState({ width: 0, height: 0 });
//   const [lastDetectionTime, setLastDetectionTime] = useState(0);
  
//   // Detection history to filter out false positives
//   const detectionHistory = useRef({});
//   const stableBoxesRef = useRef([]);
//   const noDetectionCount = useRef(0);
  
//   // WebSocket reference
//   const ws = useRef(null);
//   const streamingInterval = useRef(null);
//   const lastFrameTime = useRef(0);
//   const frameCount = useRef(0);
//   const fpsUpdateInterval = useRef(null);
  
//   // Image Viewer Modal State
//   const [fullImageModalVisible, setFullImageModalVisible] = useState(false);
  
//   const dispatch = useDispatch();
//   const { user } = useSelector(state => state.auth);
//   const { 
//     loading: reportLoading, 
//     success, 
//     error, 
//     currentReport,
//     operation 
//   } = useSelector(state => state.wasteReport);

//   // ============= USE EFFECTS =============
//   useEffect(() => {
//     dispatch(clearError());
//     dispatch(clearSuccess());
//   }, [dispatch]);

//   useEffect(() => {
//     getLocation();
//     fetchDatasetInfo();
//     fetchLiveStatus();
    
//     return () => {
//       stopLiveStreaming();
//       if (ws.current) {
//         ws.current.close();
//       }
//       if (fpsUpdateInterval.current) {
//         clearInterval(fpsUpdateInterval.current);
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (error) {
//       const errorMessage = error.error || error.details || 'An unexpected error occurred';
//       Alert.alert("Error", errorMessage, [{ text: "OK", onPress: () => dispatch(clearError()) }]);
//     }
//   }, [error, dispatch]);

//   useEffect(() => {
//     if (success && operation === 'create' && currentReport) {
//       Alert.alert(
//         "Report Submitted Successfully!",
//         `Your waste analysis has been recorded and saved to your history.`,
//         [
//           {
//             text: "View History",
//             onPress: () => {
//               navigation.navigate('ReportHistory');
//               resetForm();
//             }
//           },
//           {
//             text: "New Scan",
//             onPress: () => resetForm()
//           }
//         ]
//       );
//     }
//   }, [success, operation, currentReport, navigation]);

//   // ============= LOCATION FUNCTIONS =============
//   const getLocation = async () => {
//     try {
//       let { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== 'granted') {
//         Alert.alert('Location Permission Required', 'Location permission is required for accurate waste reporting.');
//         return;
//       }

//       let location = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.Balanced,
//         timeout: 15000
//       });
      
//       setLocation({
//         coordinates: {
//           lat: location.coords.latitude,
//           lng: location.coords.longitude
//         },
//         timestamp: new Date().toISOString()
//       });

//       let address = await Location.reverseGeocodeAsync({
//         latitude: location.coords.latitude,
//         longitude: location.coords.longitude
//       });
      
//       if (address[0]) {
//         const city = address[0].city || '';
//         const region = address[0].region || '';
//         const country = address[0].country || '';
//         const street = address[0].street || '';
        
//         const fullAddress = [street, city, region, country].filter(Boolean).join(', ');
//         setManualLocation(fullAddress);
//       }
//     } catch (error) {
//       console.error('Location error:', error);
//       Alert.alert("Location Error", "Unable to get current location. Please enter manually.");
//     }
//   };

//   // ============= API FUNCTIONS =============
//   const fetchDatasetInfo = async () => {
//     try {
//       const response = await fetch(`${API_URL}/dataset-info`);
//       const data = await response.json();
//       setDatasetSize(data.total_samples || 0);
//     } catch (error) {
//       console.log('Could not fetch dataset info:', error);
//     }
//   };

//   const fetchLiveStatus = async () => {
//     try {
//       const response = await fetch(`${API_URL}/live-status`);
//       const data = await response.json();
//       setLiveStatus(data);
//       console.log('Live status:', data);
//     } catch (error) {
//       console.log('Could not fetch live status:', error);
//     }
//   };

//   // ============= RESET FORM =============
//   const resetForm = () => {
//     setImage(null);
//     setImageBase64(null);
//     setDetected([]);
//     setOverallCategory(null);
//     setOverallConfidence(0);
//     setWasteComposition({
//       special_waste: 0,
//       recyclable: 0,
//       residual: 0
//     });
//     setRecyclingTips([]);
//     setDetectionCompleted(false);
//     setReportModalVisible(false);
//     setUserMessage("");
//     setUsingDemoData(false);
//     setCloudinaryUrl(null);
//     setUploadProgress(0);
//     setSelectedImageUri(null);
//     setShowDetections(true);
//     setAllowTraining(false);
//     setLiveDetections([]);
//     setLiveBoxes([]);
//     setProcessingTime(null);
//     setFps(null);
    
//     stopLiveStreaming();
    
//     dispatch(clearSuccess());
//     dispatch(clearError());
//   };

//   // ============= OPTIMIZED LIVE DETECTION FUNCTIONS =============
//   const startLiveCamera = async () => {
//     if (!permission?.granted) {
//       const result = await requestPermission();
//       if (!result.granted) {
//         Alert.alert("Camera Permission", "Camera permission is required for live detection.");
//         return;
//       }
//     }
    
//     // Reset states
//     setLiveDetections([]);
//     setLiveBoxes([]);
//     setCameraActive(true);
//     setIsStreaming(true);
//     detectionHistory.current = {};
//     stableBoxesRef.current = [];
//     noDetectionCount.current = 0;
    
//     // Connect WebSocket
//     connectWebSocket();
    
//     // Start FPS counter
//     startFpsCounter();
    
//     Alert.alert(
//       "Live Detection Started",
//       `Using confidence threshold: ${CONFIDENCE_THRESHOLD * 100}% - boxes appear only for confident detections`,
//       [{ text: "OK" }]
//     );
//   };

//   const connectWebSocket = () => {
//     try {
//       ws.current = new WebSocket(WS_URL);
      
//       ws.current.onopen = () => {
//         console.log('✅ WebSocket connected');
//       };
      
//       ws.current.onmessage = (event) => {
//         const data = JSON.parse(event.data);
        
//         if (data.success) {
//           // Update frame count for FPS
//           frameCount.current += 1;
          
//           // Process detections
//           if (data.detections && data.detections.length > 0) {
//             // Filter by confidence threshold
//             let validDetections = data.detections.filter(d => 
//               d.confidence / 100 >= CONFIDENCE_THRESHOLD
//             );
            
//             if (validDetections.length > 0) {
//               // Remove redundant boxes using NMS
//               validDetections = nonMaxSuppression(validDetections, 0.5);
              
//               // Update stable boxes
//               stableBoxesRef.current = validDetections;
//               setLiveBoxes(validDetections);
//               noDetectionCount.current = 0;
//               setLastDetectionTime(Date.now());
              
//               // Update detection history for summary
//               updateDetectionHistory(validDetections);
//             } else {
//               handleNoDetection();
//             }
//           } else {
//             handleNoDetection();
//           }
//         }
//       };
      
//       ws.current.onerror = (error) => {
//         console.log('WebSocket error:', error);
//       };
      
//       ws.current.onclose = () => {
//         console.log('WebSocket disconnected');
//         setLiveBoxes([]);
//       };
      
//     } catch (error) {
//       console.error('WebSocket connection error:', error);
//       Alert.alert("Connection Error", "Failed to connect to live detection server.");
//     }
//   };

//   const handleNoDetection = () => {
//     noDetectionCount.current += 1;
    
//     // Keep boxes for 3 frames then clear
//     if (noDetectionCount.current >= 3) {
//       setLiveBoxes([]);
//       stableBoxesRef.current = [];
//     } else if (stableBoxesRef.current.length > 0) {
//       // Keep last valid boxes but mark as stale
//       const staleBoxes = stableBoxesRef.current.map(box => ({
//         ...box,
//         stale: true
//       }));
//       setLiveBoxes(staleBoxes);
//     }
//   };

//   const updateDetectionHistory = (detections) => {
//     const now = Date.now();
    
//     detections.forEach(det => {
//       const label = det.label;
//       if (!detectionHistory.current[label]) {
//         detectionHistory.current[label] = {
//           label: det.label,
//           category: det.category,
//           material: det.material,
//           confidenceSum: det.confidence,
//           count: 1,
//           lastSeen: now,
//           firstSeen: now
//         };
//       } else {
//         const history = detectionHistory.current[label];
//         history.confidenceSum += det.confidence;
//         history.count += 1;
//         history.lastSeen = now;
//       }
//     });
    
//     // Clean up old detections (not seen for 5 seconds)
//     Object.keys(detectionHistory.current).forEach(label => {
//       if (now - detectionHistory.current[label].lastSeen > 5000) {
//         delete detectionHistory.current[label];
//       }
//     });
    
//     // Convert to array for display
//     const historyArray = Object.values(detectionHistory.current).map(h => ({
//       label: h.label,
//       category: h.category,
//       material: h.material,
//       avg_confidence: Math.round(h.confidenceSum / h.count),
//       count: h.count,
//       firstSeen: h.firstSeen
//     }));
    
//     // Sort by first seen (newest first)
//     historyArray.sort((a, b) => b.firstSeen - a.firstSeen);
    
//     setLiveDetections(historyArray);
//   };

//   const startFpsCounter = () => {
//     frameCount.current = 0;
//     lastFrameTime.current = Date.now();
    
//     fpsUpdateInterval.current = setInterval(() => {
//       const now = Date.now();
//       const elapsed = (now - lastFrameTime.current) / 1000;
//       const currentFpsValue = frameCount.current / elapsed;
      
//       setCurrentFps(Math.round(currentFpsValue * 10) / 10);
      
//       frameCount.current = 0;
//       lastFrameTime.current = now;
//     }, 1000);
//   };

//   const captureAndSendFrame = async () => {
//     if (!cameraRef || !isStreaming || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//       return;
//     }
    
//     try {
//       const photo = await cameraRef.takePictureAsync({
//         quality: streamingQuality / 100,
//         base64: true,
//         skipProcessing: true,
//       });
      
//       if (photo.base64) {
//         const base64Frame = `data:image/jpeg;base64,${photo.base64}`;
        
//         ws.current.send(JSON.stringify({
//           frame: base64Frame,
//           fps_limit: 6, // Lower FPS for better quality per frame
//           quality: streamingQuality,
//           user_id: user?.email || 'anonymous',
//           allow_training: allowTraining
//         }));
//       }
//     } catch (error) {
//       console.error('Frame capture error:', error);
//     }
//   };

//   const stopLiveStreaming = () => {
//     setIsStreaming(false);
//     setCameraActive(false);
//     setLiveBoxes([]);
//     setLiveDetections([]);
//     detectionHistory.current = {};
//     stableBoxesRef.current = [];
    
//     if (streamingInterval.current) {
//       clearInterval(streamingInterval.current);
//       streamingInterval.current = null;
//     }
    
//     if (fpsUpdateInterval.current) {
//       clearInterval(fpsUpdateInterval.current);
//       fpsUpdateInterval.current = null;
//     }
    
//     if (ws.current) {
//       ws.current.close();
//       ws.current = null;
//     }
//   };

//   const handleCameraReady = () => {
//     if (streamingInterval.current) {
//       clearInterval(streamingInterval.current);
//     }
    
//     // Fixed interval for stability (6 FPS)
//     streamingInterval.current = setInterval(captureAndSendFrame, 166);
//   };

//   const saveLiveResults = () => {
//     if (liveDetections.length === 0) {
//       Alert.alert("No Detections", "No items were confidently detected during live session.");
//       return;
//     }
    
//     // Convert live detections to report format
//     const mockDetected = liveDetections.map((det, index) => ({
//       label: det.label,
//       confidence: det.avg_confidence,
//       box: [0.1 + (index * 0.05), 0.1, 0.2 + (index * 0.05), 0.3],
//       material: det.material || 'unknown',
//       category: det.category || 'Unknown',
//       area_percentage: 10 + index * 5,
//       features: {}
//     }));
    
//     setDetected(mockDetected);
//     setOverallCategory(liveDetections[0]?.category || 'Mixed');
//     setOverallConfidence(liveDetections[0]?.avg_confidence || 85);
//     setDetectionCompleted(true);
    
//     stopLiveStreaming();
//     setReportModalVisible(true);
//   };

//   // ============= IMAGE PICKER FUNCTIONS =============
//   const pickImage = async (fromCamera = false) => {
//     try {
//       stopLiveStreaming();
      
//       let permissionResult = fromCamera
//         ? await ImagePicker.requestCameraPermissionsAsync()
//         : await ImagePicker.requestMediaLibraryPermissionsAsync();

//       if (!permissionResult.granted) {
//         Alert.alert("Permission Required", `You need to grant ${fromCamera ? 'camera' : 'media library'} permission.`);
//         return;
//       }

//       const pickerOptions = {
//         quality: 0.8, // Higher quality for better detection
//         allowsEditing: false,
//         aspect: [4, 3],
//         base64: true,
//         exif: false,
//       };

//       const pickerResult = fromCamera
//         ? await ImagePicker.launchCameraAsync(pickerOptions)
//         : await ImagePicker.launchImageLibraryAsync(pickerOptions);

//       if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
//         const selectedImage = pickerResult.assets[0];
        
//         setUploadProgress(10);
//         setImage(selectedImage.uri);
        
//         if (selectedImage.base64) {
//           const base64WithPrefix = `data:image/jpeg;base64,${selectedImage.base64}`;
          
//           if (base64WithPrefix.length > 10 * 1024 * 1024) {
//             Alert.alert("Image Too Large", "Please choose a smaller image.");
//             return;
//           }
          
//           setImageBase64(base64WithPrefix);
//           setUploadProgress(50);
//         }
        
//         setDetected([]);
//         setOverallCategory(null);
//         setOverallConfidence(0);
//         setDetectionCompleted(false);
//         setUsingDemoData(false);
//         setCloudinaryUrl(null);
        
//         dispatch(clearError());
//         setUploadProgress(0);
//       }
//     } catch (error) {
//       console.error('Image picker error:', error);
//       Alert.alert("Error", "Failed to select image. Please try again.");
//       setUploadProgress(0);
//     }
//   };

//   // ============= DETECTION FUNCTIONS =============
//   const handleDetect = async () => {
//     if (!imageBase64) {
//       Alert.alert("No Image", "Please select or capture an image first.");
//       return;
//     }

//     try {
//       setLoading(true);
//       setUploadProgress(20);
//       setDetectionCompleted(false);
//       setUsingDemoData(false);
//       setCloudinaryUrl(null);
//       dispatch(clearError());

//       const payload = {
//         image: imageBase64,
//         allow_training: allowTraining,
//         user_id: user?.email || 'anonymous',
//         live_detection: false,
//       };

//       const response = await fetch(`${API_URL}/detect`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//         },
//         body: JSON.stringify(payload),
//       });

//       setUploadProgress(60);

//       if (!response.ok) {
//         throw new Error(`Server error: ${response.status}`);
//       }

//       const detectionData = await response.json();
//       setUploadProgress(80);

//       if (!detectionData.success) {
//         throw new Error(detectionData.message || "Analysis failed");
//       }

//       // Filter by confidence threshold
//       let detectedObjects = detectionData.detected_objects || [];
//       detectedObjects = detectedObjects.filter(d => d.confidence >= CONFIDENCE_THRESHOLD * 100);
      
//       // Apply NMS to remove redundant boxes
//       detectedObjects = nonMaxSuppression(detectedObjects, 0.5);
      
//       setDetected(detectedObjects);
//       setOverallCategory(detectionData.overall_category || "Unknown");
//       setOverallConfidence(detectionData.overall_confidence || 0);
//       setProcessingTime(detectionData.processing_time);
//       setFps(detectionData.fps);
      
//       if (detectionData.waste_composition) {
//         setWasteComposition({
//           special_waste: detectionData.waste_composition.special_waste || 0,
//           recyclable: detectionData.waste_composition.recyclable || 0,
//           residual: detectionData.waste_composition.residual || 0
//         });
//       }
      
//       setRecyclingTips(detectionData.recycling_tips || []);
//       setCloudinaryUrl(detectionData.cloudinary_url || null);
//       setDatasetSize(detectionData.dataset_size || datasetSize);
//       setDetectionCompleted(true);
//       setUploadProgress(100);

//       Alert.alert(
//         "Analysis Complete!",
//         `Detected ${detectedObjects.length} objects with confidence >${CONFIDENCE_THRESHOLD * 100}%.`,
//         [
//           {
//             text: "Save Report",
//             onPress: () => setReportModalVisible(true)
//           },
//           {
//             text: "Skip",
//             style: "cancel"
//           }
//         ]
//       );

//     } catch (err) {
//       console.error("Detection error:", err);
//       setUploadProgress(0);
      
//       Alert.alert(
//         "Analysis Failed",
//         err.message,
//         [
//           {
//             text: "Use Demo Mode",
//             onPress: () => loadDemoData()
//           },
//           {
//             text: "Cancel",
//             style: "cancel"
//           }
//         ]
//       );
//     } finally {
//       setLoading(false);
//       setUploadProgress(0);
//     }
//   };

//   const loadDemoData = () => {
//     const mockDetected = [
//       {
//         label: "plastic bottle",
//         confidence: 85.5,
//         box: [0.1, 0.1, 0.4, 0.6],
//         material: "plastic",
//         category: "Recyclable",
//         area_percentage: 45.2,
//         features: {}
//       },
//       {
//         label: "can",
//         confidence: 92.3,
//         box: [0.5, 0.2, 0.8, 0.5],
//         material: "metal",
//         category: "Recyclable",
//         area_percentage: 15.1,
//         features: {}
//       },
//       {
//         label: "paper",
//         confidence: 88.7,
//         box: [0.3, 0.7, 0.6, 0.9],
//         material: "paper",
//         category: "Recyclable",
//         area_percentage: 20.7,
//         features: {}
//       },
//       {
//         label: "glass bottle",
//         confidence: 78.4,
//         box: [0.7, 0.4, 0.9, 0.7],
//         material: "glass",
//         category: "Recyclable",
//         area_percentage: 12.5,
//         features: {}
//       },
//       {
//         label: "styrofoam cups",
//         confidence: 82.1,
//         box: [0.6, 0.6, 0.9, 0.8],
//         material: "foam",
//         category: "Residual / Non-Recyclable",
//         area_percentage: 8.5,
//         features: {}
//       }
//     ];

//     setDetected(mockDetected);
//     setOverallCategory("Recyclable");
//     setOverallConfidence(88.5);
//     setWasteComposition({
//       special_waste: 0,
//       recyclable: 80,
//       residual: 20
//     });
    
//     setRecyclingTips([
//       "RECYCLABLE ITEMS DETECTED:",
//       "• Rinse cans and bottles before recycling",
//       "• Remove caps from plastic bottles",
//       "• Flatten cardboard and paper to save space",
//       "• Glass bottles can be recycled endlessly",
//       "• Check local recycling guidelines for specifics",
//     ]);
//     setDetectionCompleted(true);
//     setUsingDemoData(true);

//     Alert.alert("Demo Analysis Complete!", "Using demo data for testing.");
//   };

//   // ============= REPORT FUNCTIONS =============
//   const handleSaveReport = () => {
//     if (!user) {
//       Alert.alert(
//         "Login Required",
//         "Please login to save your waste detection reports.",
//         [
//           {
//             text: "Login Now",
//             onPress: () => navigation.navigate('Login')
//           },
//           {
//             text: "Cancel",
//             style: "cancel"
//           }
//         ]
//       );
//       return;
//     }

//     if (!overallCategory && liveDetections.length === 0) {
//       Alert.alert("Incomplete Data", "Please complete waste analysis first.");
//       return;
//     }

//     const imageToSave = cloudinaryUrl || imageBase64;

//     const reportData = {
//       image: imageToSave,
//       detected_objects: detected.length > 0 ? detected : liveDetections.map(d => ({
//         label: d.label,
//         confidence: d.avg_confidence,
//         material: d.material,
//         category: d.category,
//         area_percentage: 10
//       })),
//       classification: overallCategory || liveDetections[0]?.category || "Mixed",
//       classification_confidence: overallConfidence || liveDetections[0]?.avg_confidence || 85,
//       waste_composition: wasteComposition,
//       recycling_tips: recyclingTips,
//       location: {
//         address: manualLocation || "Not specified",
//         coordinates: location?.coordinates,
//         timestamp: location?.timestamp
//       },
//       scan_date: new Date().toISOString(),
//       user_message: userMessage,
//       user_email: user.email,
//       is_demo: usingDemoData,
//       processing_time: processingTime,
//       fps: fps,
//       cloudinary_url: cloudinaryUrl,
//       allow_training: allowTraining,
//     };

//     dispatch(createWasteReport(reportData));
//     setReportModalVisible(false);
//   };

//   // ============= UTILITY FUNCTIONS =============
//   const formatConfidence = (value) => {
//     if (typeof value === 'number') {
//       return value <= 1 ? `${Math.round(value * 100)}%` : `${Math.round(value)}%`;
//     }
//     return `${value}`;
//   };

//   const getCategoryColor = (category) => {
//     switch(category) {
//       case 'Special Waste':
//         return '#FF6B6B';
//       case 'Recyclable':
//         return '#4CAF50';
//       case 'Residual / Non-Recyclable':
//         return '#FF9800';
//       default:
//         return '#87CEEB';
//     }
//   };

//   const getCategoryIcon = (category) => {
//     switch(category) {
//       case 'Special Waste':
//         return <MaterialIcons name="dangerous" size={20} color="white" />;
//       case 'Recyclable':
//         return <MaterialIcons name="recycling" size={20} color="white" />;
//       case 'Residual / Non-Recyclable':
//         return <MaterialIcons name="delete" size={20} color="white" />;
//       default:
//         return <MaterialIcons name="help" size={20} color="white" />;
//     }
//   };

//   const getMaterialIcon = (material) => {
//     switch(material) {
//       case 'plastic':
//         return <MaterialCommunityIcons name="bottle-soda" size={16} color="#666" />;
//       case 'metal':
//         return <FontAwesome5 name="cubes" size={16} color="#666" />;
//       case 'glass':
//         return <MaterialCommunityIcons name="glass-mug" size={16} color="#666" />;
//       case 'paper':
//         return <Entypo name="news" size={16} color="#666" />;
//       case 'foam':
//         return <MaterialCommunityIcons name="cup" size={16} color="#666" />;
//       default:
//         return <MaterialIcons name="category" size={16} color="#666" />;
//     }
//   };

//   const viewReportHistory = () => {
//     navigation.navigate('ReportHistory');
//   };

//   const onRefresh = () => {
//     setRefreshing(true);
//     resetForm();
//     fetchDatasetInfo();
//     fetchLiveStatus();
//     setTimeout(() => setRefreshing(false), 1000);
//   };

//   const trainModel = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`${API_URL}/train`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           min_samples: 50,
//           test_size: 0.2,
//           retrain_yolo: false
//         })
//       });

//       const data = await response.json();
      
//       if (data.success) {
//         Alert.alert("Training Successful", `Model accuracy: ${(data.accuracy * 100).toFixed(1)}%`);
//         fetchDatasetInfo();
//       } else {
//         Alert.alert("Training Failed", data.message);
//       }
//     } catch (error) {
//       Alert.alert("Error", "Failed to train model");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ============= RENDER FUNCTIONS =============
//   const renderLiveCamera = () => {
//     if (!cameraActive) return null;
    
//     const previewWidth = screenWidth - 40;
//     const previewHeight = previewWidth * (4/3);
    
//     return (
//       <View style={styles.liveCameraContainer}>
//         <View style={styles.liveCameraHeader}>
//           <View style={styles.liveCameraTitle}>
//             <Ionicons name="videocam" size={20} color="#9C27B0" />
//             <Text style={styles.liveCameraTitleText}>Live Detection</Text>
//           </View>
//           <View style={styles.liveCameraStats}>
//             <Text style={styles.liveCameraStatsText}>{currentFps} FPS</Text>
//             <View style={styles.confidenceBadge}>
//               <Text style={styles.confidenceBadgeText}>
//                 Min Conf: {CONFIDENCE_THRESHOLD * 100}%
//               </Text>
//             </View>
//           </View>
//         </View>
        
//         <View style={[styles.cameraPreview, { width: previewWidth, height: previewHeight }]}>
//           <CameraView
//             ref={ref => setCameraRef(ref)}
//             style={StyleSheet.absoluteFillObject}
//             facing="back"
//             onCameraReady={handleCameraReady}
//             ratio="4:3"
//           />
          
//           {/* Live Detection Boxes - Filtered and NMS applied */}
//           {liveBoxes.map((detection, index) => {
//             if (!detection.box || detection.box.length < 4) return null;
            
//             const [x1, y1, x2, y2] = detection.box;
//             const left = x1 * previewWidth;
//             const top = y1 * previewHeight;
//             const width = (x2 - x1) * previewWidth;
//             const height = (y2 - y1) * previewHeight;
            
//             const categoryColor = getCategoryColor(detection.category);
//             const opacity = detection.stale ? 0.5 : 1;
            
//             return (
//               <View
//                 key={`live-${index}-${detection.label}`}
//                 style={[
//                   styles.liveBoundingBox,
//                   {
//                     left,
//                     top,
//                     width,
//                     height,
//                     borderColor: categoryColor,
//                     opacity,
//                   }
//                 ]}
//               >
//                 <View style={[styles.liveLabelBox, { backgroundColor: categoryColor }]}>
//                   <Text style={styles.liveLabelText} numberOfLines={1}>
//                     {detection.label} ({Math.round(detection.confidence)}%)
//                   </Text>
//                 </View>
//               </View>
//             );
//           })}
          
//           {/* No Detection Overlay */}
//           {liveBoxes.length === 0 && (
//             <View style={styles.noDetectionOverlay}>
//               <Text style={styles.noDetectionText}>No items detected</Text>
//               <Text style={styles.noDetectionSubtext}>
//                 Min confidence: {CONFIDENCE_THRESHOLD * 100}%
//               </Text>
//             </View>
//           )}
//         </View>
        
//         {/* Live Detection Summary - Shows all detected items with counts */}
//         {liveDetections.length > 0 && (
//           <View style={styles.liveSummary}>
//             <Text style={styles.liveSummaryTitle}>Detected Items:</Text>
//             {liveDetections.map((det, idx) => (
//               <View key={idx} style={styles.liveSummaryItem}>
//                 <View style={[styles.liveSummaryDot, { backgroundColor: getCategoryColor(det.category) }]} />
//                 <Text style={styles.liveSummaryText}>
//                   {det.label} - {det.avg_confidence}% ({det.count}x)
//                 </Text>
//               </View>
//             ))}
//           </View>
//         )}
        
//         {/* Live Controls */}
//         <View style={styles.liveControls}>
//           <TouchableOpacity 
//             style={[styles.liveControlButton, styles.liveStopButton]}
//             onPress={stopLiveStreaming}
//           >
//             <Ionicons name="stop" size={20} color="white" />
//             <Text style={styles.liveControlText}>Stop</Text>
//           </TouchableOpacity>
          
//           <TouchableOpacity 
//             style={[styles.liveControlButton, styles.liveSaveButton]}
//             onPress={saveLiveResults}
//             disabled={liveDetections.length === 0}
//           >
//             <Ionicons name="save" size={20} color="white" />
//             <Text style={styles.liveControlText}>Save Results</Text>
//           </TouchableOpacity>
//         </View>
        
//         {/* Quality Control */}
//         <View style={styles.qualityControl}>
//           <Text style={styles.qualityLabel}>Quality: {streamingQuality}%</Text>
//           <View style={styles.qualityButtons}>
//             <TouchableOpacity 
//               style={styles.qualityButton}
//               onPress={() => setStreamingQuality(Math.max(30, streamingQuality - 10))}
//             >
//               <Text style={styles.qualityButtonText}>-</Text>
//             </TouchableOpacity>
//             <TouchableOpacity 
//               style={styles.qualityButton}
//               onPress={() => setStreamingQuality(Math.min(70, streamingQuality + 10))}
//             >
//               <Text style={styles.qualityButtonText}>+</Text>
//             </TouchableOpacity>
//           </View>
//           <Text style={styles.qualityHint}>Higher = Better detection but slower</Text>
//         </View>
//       </View>
//     );
//   };

//   const renderPreviewDetections = () => {
//     if (!detected.length || imageSize.width === 0 || !showDetections) return null;

//     return detected.map((item, index) => {
//       if (!item.box || !item.box.length) return null;
      
//       const [x1, y1, x2, y2] = item.box;
//       const left = Math.max(0, x1 * imageSize.width);
//       const top = Math.max(0, y1 * imageSize.height);
//       const width = Math.min(imageSize.width - left, (x2 - x1) * imageSize.width);
//       const height = Math.min(imageSize.height - top, (y2 - y1) * imageSize.height);
      
//       const categoryColor = getCategoryColor(item.category);

//       return (
//         <View
//           key={index}
//           style={[
//             styles.boundingBox,
//             {
//               position: 'absolute',
//               left,
//               top,
//               width,
//               height,
//               borderColor: categoryColor,
//               borderWidth: 2,
//             }
//           ]}
//         >
//           <View style={[styles.labelBox, { backgroundColor: categoryColor }]}>
//             <Text style={styles.labelText} numberOfLines={1}>
//               {item.label} ({formatConfidence(item.confidence)})
//             </Text>
//           </View>
//         </View>
//       );
//     });
//   };

//   const renderFullImageDetections = () => {
//     if (!detected.length || !fullImageModalVisible) return null;

//     return detected.map((item, index) => {
//       if (!item.box || !item.box.length) return null;
      
//       const [x1, y1, x2, y2] = item.box;
//       const left = Math.max(0, x1 * screenWidth * 0.9);
//       const top = Math.max(0, y1 * (screenWidth * 0.9 * (imageSize.height / imageSize.width)) || 300);
//       const width = Math.min(screenWidth * 0.9 - left, (x2 - x1) * screenWidth * 0.9);
//       const height = Math.min((screenWidth * 0.9 * (imageSize.height / imageSize.width)) - top, 
//                              (y2 - y1) * (screenWidth * 0.9 * (imageSize.height / imageSize.width)) || 300);
      
//       const categoryColor = getCategoryColor(item.category);

//       return (
//         <View
//           key={index}
//           style={[
//             styles.boundingBox,
//             {
//               position: 'absolute',
//               left,
//               top,
//               width,
//               height,
//               borderColor: categoryColor,
//               borderWidth: 3,
//             }
//           ]}
//         >
//           <View style={[styles.labelBox, { 
//             backgroundColor: categoryColor,
//             minWidth: 120,
//             paddingHorizontal: 8,
//           }]}>
//             <View style={styles.labelRow}>
//               {getCategoryIcon(item.category)}
//               <Text style={styles.labelText} numberOfLines={1}>
//                 {item.label} ({formatConfidence(item.confidence)})
//               </Text>
//             </View>
//           </View>
//         </View>
//       );
//     });
//   };

//   const renderCompositionChart = () => {
//     const specialPercent = wasteComposition.special_waste || 0;
//     const recyclablePercent = wasteComposition.recyclable || 0;
//     const residualPercent = wasteComposition.residual || 0;

//     return (
//       <View style={styles.compositionCard}>
//         <View style={styles.sectionHeader}>
//           <MaterialIcons name="pie-chart" size={20} color="#1976D2" />
//           <Text style={styles.sectionTitle}>Waste Composition</Text>
//         </View>
//         <View style={styles.compositionChart}>
//           <View style={styles.chartLabels}>
//             <View style={styles.chartLabel}>
//               <View style={[styles.colorIndicator, { backgroundColor: '#FF6B6B' }]} />
//               <Text style={styles.chartLabelText}>
//                 Special: {specialPercent}%
//               </Text>
//             </View>
//             <View style={styles.chartLabel}>
//               <View style={[styles.colorIndicator, { backgroundColor: '#4CAF50' }]} />
//               <Text style={styles.chartLabelText}>
//                 Recyclable: {recyclablePercent}%
//               </Text>
//             </View>
//             <View style={styles.chartLabel}>
//               <View style={[styles.colorIndicator, { backgroundColor: '#FF9800' }]} />
//               <Text style={styles.chartLabelText}>
//                 Residual: {residualPercent}%
//               </Text>
//             </View>
//           </View>
          
//           <View style={styles.chartBar}>
//             <View 
//               style={[
//                 styles.chartSegment, 
//                 { 
//                   width: `${specialPercent}%`, 
//                   backgroundColor: '#FF6B6B' 
//                 }
//               ]} 
//             />
//             <View 
//               style={[
//                 styles.chartSegment, 
//                 { 
//                   width: `${recyclablePercent}%`, 
//                   backgroundColor: '#4CAF50' 
//                 }
//               ]} 
//             />
//             <View 
//               style={[
//                 styles.chartSegment, 
//                 { 
//                   width: `${residualPercent}%`, 
//                   backgroundColor: '#FF9800' 
//                 }
//               ]} 
//             />
//           </View>
//         </View>
//       </View>
//     );
//   };

//   // ============= MAIN RENDER =============
//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <ScrollView 
//         style={styles.container} 
//         contentContainerStyle={styles.contentContainer}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1976D2" />
//         }
//       >
//         {/* Header Section */}
//         <View style={styles.header}>
//           <View style={styles.headerTop}>
//             <Pressable 
//               style={({ pressed }) => [
//                 styles.backButton,
//                 pressed && styles.backButtonPressed
//               ]} 
//               onPress={() => navigation.goBack()}
//             >
//               <Ionicons name="arrow-back" size={24} color="white" />
//             </Pressable>
//             <View style={styles.headerTitleContainer}>
//               <Text style={styles.title}>AI Waste Analysis</Text>
//               <Text style={styles.subtitle}>Smart Detection with NMS</Text>
//             </View>
//           </View>
//         </View>

//         {/* Live Status Indicator */}
//         {liveStatus && (
//           <View style={styles.liveStatusContainer}>
//             <View style={[styles.liveStatusDot, liveStatus.model_loaded ? styles.statusActive : styles.statusInactive]} />
//             <Text style={styles.liveStatusText}>
//               Model: {liveStatus.model_loaded ? 'Ready' : 'Not Ready'} | 
//               Classes: {liveStatus?.supported_classes?.length || 5}
//             </Text>
//           </View>
//         )}

//         {/* Dataset Info */}
//         <View style={styles.datasetInfo}>
//           <View style={styles.datasetLeft}>
//             <Ionicons name="analytics" size={18} color="#1976D2" />
//             <Text style={styles.datasetText}>
//               Dataset: {datasetSize} samples
//             </Text>
//           </View>
//           <TouchableOpacity 
//             style={[
//               styles.trainButton,
//               (loading || datasetSize < 50) && styles.disabledTrainButton
//             ]}
//             onPress={trainModel} 
//             disabled={loading || datasetSize < 50}
//           >
//             <Ionicons name="refresh" size={16} color={datasetSize < 50 ? "#9E9E9E" : "#4CAF50"} />
//             <Text style={[
//               styles.trainButtonText,
//               (loading || datasetSize < 50) && styles.disabledTrainButtonText
//             ]}>
//               Train
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Upload Progress */}
//         {uploadProgress > 0 && uploadProgress < 100 && (
//           <View style={styles.progressContainer}>
//             <View style={styles.progressBar}>
//               <View 
//                 style={[
//                   styles.progressFill, 
//                   { width: `${uploadProgress}%` }
//                 ]} 
//               />
//             </View>
//             <Text style={styles.progressText}>
//               {uploadProgress < 50 ? "Uploading..." : 
//                uploadProgress < 80 ? "Analyzing..." : 
//                "Processing..."}
//             </Text>
//           </View>
//         )}

//         {/* User Info */}
//         {user && (
//           <View style={styles.userInfo}>
//             <Ionicons name="person-circle" size={20} color="#1976D2" />
//             <Text style={styles.userText}>{user.email}</Text>
//           </View>
//         )}

//         {/* Location Section */}
//         <View style={styles.locationSection}>
//           <View style={styles.sectionHeader}>
//             <Ionicons name="location" size={20} color="#1976D2" />
//             <Text style={styles.sectionTitle}>Location</Text>
//           </View>
//           <TextInput
//             style={styles.locationInput}
//             placeholder="Enter location"
//             placeholderTextColor="#B0C4DE"
//             value={manualLocation}
//             onChangeText={setManualLocation}
//             editable={!loading}
//           />
//           <Pressable 
//             style={({ pressed }) => [
//               styles.locationButton,
//               loading && styles.disabledButton,
//               pressed && !loading && styles.buttonPressed
//             ]} 
//             onPress={getLocation}
//             disabled={loading}
//           >
//             {loading ? (
//               <ActivityIndicator size="small" color="white" />
//             ) : (
//               <>
//                 <Ionicons name="locate" size={18} color="white" />
//                 <Text style={styles.locationButtonText}>Use Current</Text>
//               </>
//             )}
//           </Pressable>
//         </View>

//         {/* Training Consent */}
//         <View style={styles.consentSection}>
//           <View style={styles.consentRow}>
//             <TouchableOpacity
//               style={styles.checkbox}
//               onPress={() => setAllowTraining(!allowTraining)}
//             >
//               {allowTraining && <Ionicons name="checkmark" size={20} color="#4CAF50" />}
//             </TouchableOpacity>
//             <Text style={styles.consentText}>
//               Help improve AI (anonymous)
//             </Text>
//           </View>
//         </View>

//         {/* Image Selection Section */}
//         <View style={styles.section}>
//           <View style={styles.sectionHeader}>
//             <Ionicons name="camera" size={20} color="#1976D2" />
//             <Text style={styles.sectionTitle}>Detection Mode</Text>
//           </View>
//           <View style={styles.buttonContainer}>
//             <Pressable 
//               style={({ pressed }) => [
//                 styles.actionButton, 
//                 styles.cameraButton,
//                 pressed && !loading && !reportLoading && styles.buttonPressed
//               ]} 
//               onPress={() => pickImage(true)}
//               disabled={loading || reportLoading || cameraActive}
//             >
//               <Ionicons name="camera" size={20} color="white" />
//               <Text style={styles.buttonText}>Photo</Text>
//             </Pressable>
            
//             <Pressable 
//               style={({ pressed }) => [
//                 styles.actionButton, 
//                 styles.galleryButton,
//                 pressed && !loading && !reportLoading && styles.buttonPressed
//               ]} 
//               onPress={() => pickImage(false)}
//               disabled={loading || reportLoading || cameraActive}
//             >
//               <Ionicons name="images" size={20} color="white" />
//               <Text style={styles.buttonText}>Gallery</Text>
//             </Pressable>

//             <Pressable 
//               style={({ pressed }) => [
//                 styles.actionButton, 
//                 styles.liveButton,
//                 pressed && !loading && !reportLoading && styles.buttonPressed,
//                 cameraActive && styles.activeLiveButton
//               ]} 
//               onPress={cameraActive ? stopLiveStreaming : startLiveCamera}
//               disabled={loading || reportLoading}
//             >
//               <Ionicons name={cameraActive ? "videocam-off" : "videocam"} size={20} color="white" />
//               <Text style={styles.buttonText}>{cameraActive ? "Stop" : "Live"}</Text>
//             </Pressable>

//             <Pressable 
//               style={({ pressed }) => [
//                 styles.actionButton, 
//                 styles.demoButton,
//                 pressed && !loading && !reportLoading && styles.buttonPressed
//               ]} 
//               onPress={loadDemoData}
//               disabled={loading || reportLoading}
//             >
//               <Ionicons name="beaker" size={20} color="white" />
//               <Text style={styles.buttonText}>Demo</Text>
//             </Pressable>
//           </View>
//           <Text style={styles.imageNote}>
//             <Ionicons name="information-circle" size={14} color="#666" /> 
//             Min confidence: {CONFIDENCE_THRESHOLD * 100}% | NMS removes redundant boxes
//           </Text>
//         </View>

//         {/* Report History Button */}
//         <Pressable 
//           style={({ pressed }) => [
//             styles.actionButton, 
//             styles.historyButton,
//             pressed && !reportLoading && styles.buttonPressed
//           ]} 
//           onPress={viewReportHistory}
//           disabled={reportLoading}
//         >
//           <Ionicons name="time" size={20} color="white" />
//           <Text style={styles.buttonText}>History</Text>
//         </Pressable>

//         {/* LIVE CAMERA SECTION */}
//         {renderLiveCamera()}

//         {/* Regular Image Preview */}
//         {image && !cameraActive && (
//           <View style={styles.section}>
//             <View style={styles.sectionHeader}>
//               <Ionicons name="image" size={20} color="#1976D2" />
//               <Text style={styles.sectionTitle}>
//                 {usingDemoData ? "Demo Image" : "Selected Image"}
//               </Text>
//             </View>
            
//             <TouchableOpacity 
//               style={styles.imageContainer}
//               activeOpacity={0.8}
//               onPress={() => {
//                 setSelectedImageUri(image);
//                 setImageLoading(true);
//                 setFullImageModalVisible(true);
//               }}
//             >
//               <Image
//                 source={{ uri: image }}
//                 style={styles.previewImage}
//                 resizeMode="cover"
//                 onLoad={(event) => {
//                   const { width, height } = event.nativeEvent.source;
//                   const scaledHeight = (screenWidth * 0.9 * height) / width;
//                   setImageSize({ width: screenWidth * 0.9, height: scaledHeight });
//                 }}
//               />
              
//               <View style={styles.imageOverlay}>
//                 <Ionicons name="expand" size={20} color="white" />
//                 <Text style={styles.overlayText}>View Full</Text>
//               </View>
              
//               {renderPreviewDetections()}
//             </TouchableOpacity>

//             {/* Toggle Detections Button */}
//             {detected.length > 0 && (
//               <TouchableOpacity 
//                 style={styles.toggleButton}
//                 onPress={() => setShowDetections(!showDetections)}
//               >
//                 <Ionicons 
//                   name={showDetections ? "eye-off" : "eye"} 
//                   size={18} 
//                   color="#1976D2" 
//                 />
//                 <Text style={styles.toggleButtonText}>
//                   {showDetections ? "Hide Boxes" : "Show Boxes"}
//                 </Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}

//         {/* Analyze Button */}
//         {image && !detectionCompleted && !usingDemoData && !cameraActive && (
//           <View style={styles.section}>
//             <View style={styles.detectSection}>
//               {loading ? (
//                 <View style={styles.loadingContainer}>
//                   <ActivityIndicator size="large" color="#1976D2" />
//                   <Text style={styles.loadingText}>Analyzing...</Text>
//                 </View>
//               ) : (
//                 <Pressable 
//                   style={({ pressed }) => [
//                     styles.actionButton, 
//                     styles.detectButton,
//                     pressed && !reportLoading && styles.buttonPressed
//                   ]} 
//                   onPress={handleDetect}
//                   disabled={reportLoading}
//                 >
//                   <Ionicons name="analytics" size={20} color="white" />
//                   <Text style={styles.buttonText}>Analyze</Text>
//                 </Pressable>
//               )}
//             </View>
//           </View>
//         )}

//         {/* Results Section */}
//         {detectionCompleted && !cameraActive && (
//           <View style={styles.resultsSection}>
//             {usingDemoData && (
//               <View style={styles.demoNotice}>
//                 <Ionicons name="beaker" size={16} color="#E65100" />
//                 <Text style={styles.demoNoticeText}>Demo Mode</Text>
//               </View>
//             )}

//             {processingTime && (
//               <View style={styles.processingNotice}>
//                 <Ionicons name="timer" size={16} color="#1976D2" />
//                 <Text style={styles.processingNoticeText}>
//                   Time: {processingTime}s | Conf: {CONFIDENCE_THRESHOLD * 100}% min
//                 </Text>
//               </View>
//             )}

//             <View style={styles.summaryCard}>
//               <View style={styles.sectionHeader}>
//                 <Ionicons name="list" size={20} color="#1976D2" />
//                 <Text style={styles.summaryTitle}>Summary</Text>
//               </View>
//               <View style={styles.summaryGrid}>
//                 <View style={styles.summaryItem}>
//                   <Text style={styles.summaryNumber}>{detected.length}</Text>
//                   <Text style={styles.summaryLabel}>Objects</Text>
//                 </View>
//                 <View style={styles.summaryItem}>
//                   <Text style={styles.summaryNumber}>{formatConfidence(overallConfidence)}</Text>
//                   <Text style={styles.summaryLabel}>Confidence</Text>
//                 </View>
//                 <View style={styles.summaryItem}>
//                   <Text style={styles.summaryNumber}>{datasetSize}</Text>
//                   <Text style={styles.summaryLabel}>Dataset</Text>
//                 </View>
//               </View>
//             </View>

//             <View style={styles.classificationCard}>
//               <View style={styles.sectionHeader}>
//                 <Ionicons name="category" size={20} color="#1976D2" />
//                 <Text style={styles.resultTitle}>Category</Text>
//               </View>
//               <View style={[
//                 styles.classificationBadge, 
//                 { backgroundColor: getCategoryColor(overallCategory) }
//               ]}>
//                 <View style={styles.classificationContent}>
//                   {getCategoryIcon(overallCategory)}
//                   <Text style={styles.classificationText}>
//                     {overallCategory}
//                   </Text>
//                 </View>
//                 <Text style={styles.confidenceText}>
//                   {formatConfidence(overallConfidence)}
//                 </Text>
//               </View>
//             </View>

//             {renderCompositionChart()}

//             {/* Save Report Button */}
//             <Pressable 
//               style={({ pressed }) => [
//                 styles.actionButton, 
//                 styles.reportButton,
//                 pressed && !reportLoading && styles.buttonPressed,
//                 { marginBottom: 20 }
//               ]} 
//               onPress={() => setReportModalVisible(true)}
//               disabled={reportLoading}
//             >
//               {reportLoading ? (
//                 <ActivityIndicator size="small" color="white" />
//               ) : (
//                 <>
//                   <Ionicons name="save" size={20} color="white" />
//                   <Text style={styles.buttonText}>
//                     {usingDemoData ? "Save Demo" : "Save Report"}
//                   </Text>
//                 </>
//               )}
//             </Pressable>
//           </View>
//         )}

//         {/* Full Image Modal */}
//         <Modal
//           animationType="fade"
//           transparent={true}
//           visible={fullImageModalVisible}
//           onRequestClose={() => setFullImageModalVisible(false)}
//         >
//           <View style={styles.fullImageModalOverlay}>
//             <View style={styles.fullImageModalContent}>
//               <View style={styles.fullImageHeader}>
//                 <Text style={styles.fullImageTitle}>Full Image</Text>
//                 <Pressable onPress={() => setFullImageModalVisible(false)}>
//                   <Ionicons name="close" size={28} color="white" />
//                 </Pressable>
//               </View>
              
//               <View style={styles.fullImageContainer}>
//                 {imageLoading ? (
//                   <View style={styles.fullImageLoading}>
//                     <ActivityIndicator size="large" color="#1976D2" />
//                     <Text style={styles.fullImageLoadingText}>Loading...</Text>
//                   </View>
//                 ) : (
//                   <Image
//                     source={{ uri: selectedImageUri || image }}
//                     style={styles.fullImage}
//                     resizeMode="contain"
//                     onLoadEnd={() => setImageLoading(false)}
//                   />
//                 )}
//                 {renderFullImageDetections()}
//               </View>
//             </View>
//           </View>
//         </Modal>

//         {/* Report Modal */}
//         <Modal
//           animationType="slide"
//           transparent={true}
//           visible={reportModalVisible}
//           onRequestClose={() => setReportModalVisible(false)}
//         >
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <Text style={styles.modalTitle}>
//                   {usingDemoData ? "Save Demo" : "Save Report"}
//                 </Text>
//                 <Pressable onPress={() => setReportModalVisible(false)}>
//                   <Ionicons name="close" size={24} color="#666" />
//                 </Pressable>
//               </View>
              
//               <ScrollView style={styles.reportSummary}>
//                 <Text style={styles.reportSummaryTitle}>Summary:</Text>
                
//                 {user && (
//                   <View style={styles.reportDetail}>
//                     <Ionicons name="person" size={16} color="#666" style={styles.reportIcon} />
//                     <Text style={styles.reportDetailLabel}>User:</Text>
//                     <Text style={styles.reportDetailValue}>{user.email}</Text>
//                   </View>
//                 )}
                
//                 <View style={styles.reportDetail}>
//                   <Ionicons name="category" size={16} color="#666" style={styles.reportIcon} />
//                   <Text style={styles.reportDetailLabel}>Category:</Text>
//                   <Text style={[styles.reportDetailValue, { color: getCategoryColor(overallCategory) }]}>
//                     {overallCategory}
//                   </Text>
//                 </View>
                
//                 <View style={styles.reportDetail}>
//                   <Ionicons name="cube" size={16} color="#666" style={styles.reportIcon} />
//                   <Text style={styles.reportDetailLabel}>Objects:</Text>
//                   <Text style={styles.reportDetailValue}>{detected.length}</Text>
//                 </View>
                
//                 <View style={styles.reportDetail}>
//                   <Ionicons name="location" size={16} color="#666" style={styles.reportIcon} />
//                   <Text style={styles.reportDetailLabel}>Location:</Text>
//                   <Text style={styles.reportDetailValue}>{manualLocation || "Not set"}</Text>
//                 </View>
//               </ScrollView>

//               <View style={styles.messageSection}>
//                 <View style={styles.messageHeader}>
//                   <Ionicons name="chatbubble" size={18} color="#333" />
//                   <Text style={styles.messageLabel}>Note (optional):</Text>
//                 </View>
//                 <TextInput
//                   style={styles.messageInput}
//                   placeholder="Add notes..."
//                   placeholderTextColor="#B0C4DE"
//                   value={userMessage}
//                   onChangeText={setUserMessage}
//                   multiline={true}
//                   numberOfLines={3}
//                   textAlignVertical="top"
//                 />
//               </View>

//               <View style={styles.modalButtons}>
//                 <Pressable 
//                   style={({ pressed }) => [
//                     styles.modalButton, 
//                     styles.cancelButton,
//                     pressed && !reportLoading && styles.buttonPressed
//                   ]}
//                   onPress={() => setReportModalVisible(false)}
//                   disabled={reportLoading}
//                 >
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </Pressable>
                
//                 <Pressable 
//                   style={({ pressed }) => [
//                     styles.modalButton, 
//                     styles.confirmButton,
//                     pressed && !reportLoading && styles.buttonPressed
//                   ]}
//                   onPress={handleSaveReport}
//                   disabled={reportLoading}
//                 >
//                   {reportLoading ? (
//                     <ActivityIndicator size="small" color="white" />
//                   ) : (
//                     <Text style={styles.confirmButtonText}>Save</Text>
//                   )}
//                 </Pressable>
//               </View>
//             </View>
//           </View>
//         </Modal>
//       </ScrollView>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: '#F8F9FA',
//   },
//   container: {
//     flex: 1,
//   },
//   contentContainer: {
//     paddingBottom: 30,
//   },
//   header: {
//     backgroundColor: '#1976D2',
//     paddingHorizontal: 20,
//     paddingBottom: 20,
//     borderBottomLeftRadius: 20,
//     borderBottomRightRadius: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 5,
//     marginBottom: 20,
//   },
//   headerTop: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingTop: 50,
//     marginBottom: 10,
//   },
//   backButton: {
//     padding: 8,
//   },
//   backButtonPressed: {
//     opacity: 0.7,
//   },
//   headerTitleContainer: {
//     flex: 1,
//     alignItems: 'center',
//     marginLeft: -40,
//   },
//   title: {
//     color: 'white',
//     fontSize: 22,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   subtitle: {
//     color: 'rgba(255, 255, 255, 0.9)',
//     fontSize: 14,
//     textAlign: 'center',
//     marginTop: 4,
//   },
//   liveStatusContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#E3F2FD',
//     padding: 12,
//     marginHorizontal: 20,
//     borderRadius: 8,
//     marginBottom: 15,
//   },
//   liveStatusDot: {
//     width: 10,
//     height: 10,
//     borderRadius: 5,
//     marginRight: 8,
//   },
//   statusActive: {
//     backgroundColor: '#4CAF50',
//   },
//   statusInactive: {
//     backgroundColor: '#F44336',
//   },
//   liveStatusText: {
//     color: '#1976D2',
//     fontSize: 12,
//     fontWeight: '500',
//   },
//   datasetInfo: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: 'white',
//     padding: 16,
//     marginHorizontal: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 15,
//   },
//   datasetLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   datasetText: {
//     color: '#333',
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   trainButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 8,
//     backgroundColor: 'rgba(76, 175, 80, 0.1)',
//     borderWidth: 1,
//     borderColor: 'rgba(76, 175, 80, 0.3)',
//   },
//   disabledTrainButton: {
//     backgroundColor: '#F5F5F5',
//     borderColor: '#E0E0E0',
//   },
//   trainButtonText: {
//     color: '#4CAF50',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   disabledTrainButtonText: {
//     color: '#9E9E9E',
//   },
//   progressContainer: {
//     paddingHorizontal: 20,
//     marginBottom: 15,
//   },
//   progressBar: {
//     height: 8,
//     backgroundColor: '#E0E0E0',
//     borderRadius: 4,
//     overflow: 'hidden',
//     marginBottom: 5,
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#4CAF50',
//     borderRadius: 4,
//   },
//   progressText: {
//     fontSize: 12,
//     color: '#666',
//     textAlign: 'center',
//   },
//   userInfo: {
//     backgroundColor: '#E3F2FD',
//     padding: 12,
//     marginHorizontal: 20,
//     borderRadius: 8,
//     marginBottom: 15,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   userText: {
//     color: '#1976D2',
//     textAlign: 'center',
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   locationSection: {
//     backgroundColor: 'white',
//     padding: 20,
//     marginHorizontal: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 15,
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     marginBottom: 12,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   locationInput: {
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 14,
//     color: '#333',
//     marginBottom: 12,
//   },
//   locationButton: {
//     backgroundColor: '#1976D2',
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   disabledButton: {
//     backgroundColor: '#B0BEC5',
//   },
//   buttonPressed: {
//     opacity: 0.8,
//     transform: [{ scale: 0.98 }],
//   },
//   locationButtonText: {
//     color: 'white',
//     fontSize: 15,
//     fontWeight: '600',
//   },
//   consentSection: {
//     backgroundColor: 'white',
//     padding: 16,
//     marginHorizontal: 20,
//     borderRadius: 12,
//     marginBottom: 20,
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//   },
//   consentRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   checkbox: {
//     width: 24,
//     height: 24,
//     borderWidth: 2,
//     borderColor: '#4CAF50',
//     borderRadius: 4,
//     marginRight: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'white',
//   },
//   consentText: {
//     flex: 1,
//     fontSize: 14,
//     color: '#333',
//     fontWeight: '500',
//   },
//   section: {
//     backgroundColor: 'white',
//     padding: 20,
//     marginHorizontal: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 20,
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//     marginBottom: 12,
//   },
//   actionButton: {
//     flex: 1,
//     minWidth: '22%',
//     padding: 14,
//     borderRadius: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 10,
//     flexDirection: 'row',
//     gap: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   cameraButton: {
//     backgroundColor: '#4CAF50',
//   },
//   galleryButton: {
//     backgroundColor: '#2196F3',
//   },
//   liveButton: {
//     backgroundColor: '#9C27B0',
//   },
//   activeLiveButton: {
//     backgroundColor: '#F44336',
//   },
//   demoButton: {
//     backgroundColor: '#FF9800',
//   },
//   historyButton: {
//     backgroundColor: '#607D8B',
//     marginHorizontal: 20,
//     marginBottom: 20,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   detectButton: {
//     backgroundColor: '#1976D2',
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   reportButton: {
//     backgroundColor: '#4CAF50',
//     flexDirection: 'row',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   imageNote: {
//     fontSize: 12,
//     color: '#666',
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
  
//   // Live Camera Styles
//   liveCameraContainer: {
//     backgroundColor: 'white',
//     marginHorizontal: 20,
//     borderRadius: 12,
//     padding: 15,
//     marginBottom: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//     borderWidth: 2,
//     borderColor: '#9C27B0',
//   },
//   liveCameraHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   liveCameraTitle: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   liveCameraTitleText: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#9C27B0',
//   },
//   liveCameraStats: {
//     flexDirection: 'row',
//     gap: 10,
//     alignItems: 'center',
//   },
//   liveCameraStatsText: {
//     fontSize: 12,
//     color: '#666',
//     fontWeight: '600',
//   },
//   confidenceBadge: {
//     backgroundColor: '#1976D2',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 4,
//   },
//   confidenceBadgeText: {
//     fontSize: 10,
//     color: 'white',
//     fontWeight: '600',
//   },
//   cameraPreview: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     backgroundColor: '#000',
//     position: 'relative',
//   },
//   liveBoundingBox: {
//     position: 'absolute',
//     borderWidth: 3,
//     borderRadius: 4,
//     zIndex: 10,
//   },
//   liveLabelBox: {
//     position: 'absolute',
//     top: -25,
//     left: 0,
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 4,
//   },
//   liveLabelText: {
//     color: 'white',
//     fontSize: 10,
//     fontWeight: 'bold',
//   },
//   noDetectionOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.3)',
//   },
//   noDetectionText: {
//     color: 'white',
//     fontSize: 16,
//     fontWeight: 'bold',
//     backgroundColor: 'rgba(0,0,0,0.7)',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 20,
//   },
//   noDetectionSubtext: {
//     color: 'rgba(255,255,255,0.8)',
//     fontSize: 12,
//     marginTop: 5,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     paddingHorizontal: 15,
//     paddingVertical: 5,
//     borderRadius: 15,
//   },
//   liveSummary: {
//     marginTop: 10,
//     padding: 10,
//     backgroundColor: '#F3E5F5',
//     borderRadius: 8,
//   },
//   liveSummaryTitle: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#9C27B0',
//     marginBottom: 5,
//   },
//   liveSummaryItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 3,
//   },
//   liveSummaryDot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     marginRight: 6,
//   },
//   liveSummaryText: {
//     fontSize: 12,
//     color: '#333',
//   },
//   liveControls: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginTop: 15,
//     gap: 10,
//   },
//   liveControlButton: {
//     flex: 1,
//     padding: 12,
//     borderRadius: 8,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//   },
//   liveStopButton: {
//     backgroundColor: '#F44336',
//   },
//   liveSaveButton: {
//     backgroundColor: '#4CAF50',
//   },
//   liveControlText: {
//     color: 'white',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   qualityControl: {
//     marginTop: 15,
//     alignItems: 'center',
//   },
//   qualityLabel: {
//     fontSize: 12,
//     color: '#666',
//     marginBottom: 5,
//   },
//   qualityButtons: {
//     flexDirection: 'row',
//     gap: 20,
//   },
//   qualityButton: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     backgroundColor: '#F0F0F0',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   qualityButtonText: {
//     fontSize: 20,
//     color: '#9C27B0',
//     fontWeight: 'bold',
//   },
//   qualityHint: {
//     fontSize: 10,
//     color: '#999',
//     marginTop: 5,
//   },
  
//   // Image Preview Styles
//   imageContainer: {
//     position: 'relative',
//     borderRadius: 12,
//     overflow: 'hidden',
//     backgroundColor: '#f5f5f5',
//     marginBottom: 10,
//     minHeight: 200,
//   },
//   previewImage: {
//     width: '100%',
//     height: 300,
//   },
//   imageOverlay: {
//     position: 'absolute',
//     top: 12,
//     right: 12,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     zIndex: 2,
//   },
//   overlayText: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   boundingBox: {
//     borderWidth: 2,
//     borderRadius: 4,
//     zIndex: 1,
//   },
//   labelBox: {
//     position: 'absolute',
//     top: -28,
//     left: 0,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//     minWidth: 100,
//     maxWidth: 200,
//   },
//   labelRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//   },
//   labelText: {
//     color: 'white',
//     fontSize: 10,
//     fontWeight: 'bold',
//     textAlign: 'center',
//     flex: 1,
//   },
//   imageInfoContainer: {
//     backgroundColor: '#E3F2FD',
//     padding: 10,
//     borderRadius: 8,
//     marginTop: 5,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 4,
//   },
//   imageInfoText: {
//     color: '#1976D2',
//     fontSize: 13,
//     textAlign: 'center',
//   },
//   toggleButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 8,
//     padding: 10,
//     backgroundColor: '#F5F5F5',
//     borderRadius: 8,
//     marginTop: 10,
//   },
//   toggleButtonText: {
//     color: '#1976D2',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   detectSection: {
//     marginTop: 10,
//   },
//   loadingContainer: {
//     alignItems: 'center',
//     padding: 20,
//   },
//   loadingText: {
//     marginTop: 10,
//     color: '#666',
//     fontSize: 14,
//   },
//   resultsSection: {
//     paddingHorizontal: 20,
//   },
//   demoNotice: {
//     backgroundColor: '#FFF3E0',
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 15,
//     borderLeftWidth: 4,
//     borderLeftColor: '#FF9800',
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   demoNoticeText: {
//     color: '#E65100',
//     fontSize: 13,
//     flex: 1,
//   },
//   processingNotice: {
//     backgroundColor: '#E3F2FD',
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 15,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   processingNoticeText: {
//     color: '#1976D2',
//     fontSize: 13,
//     flex: 1,
//   },
//   summaryCard: {
//     backgroundColor: 'white',
//     padding: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 20,
//   },
//   summaryTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   summaryGrid: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginTop: 15,
//   },
//   summaryItem: {
//     alignItems: 'center',
//   },
//   summaryNumber: {
//     fontSize: 32,
//     fontWeight: 'bold',
//     color: '#1976D2',
//   },
//   summaryLabel: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 5,
//   },
//   classificationCard: {
//     backgroundColor: 'white',
//     padding: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 20,
//   },
//   resultTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   classificationBadge: {
//     padding: 20,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   classificationContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     marginBottom: 8,
//   },
//   classificationText: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: 'white',
//   },
//   confidenceText: {
//     fontSize: 14,
//     color: 'rgba(255, 255, 255, 0.9)',
//   },
//   compositionCard: {
//     backgroundColor: 'white',
//     padding: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 20,
//   },
//   compositionChart: {
//     marginTop: 10,
//   },
//   chartLabels: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     flexWrap: 'wrap',
//     marginBottom: 10,
//     gap: 10,
//   },
//   chartLabel: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 5,
//   },
//   colorIndicator: {
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//     marginRight: 8,
//   },
//   chartLabelText: {
//     fontSize: 13,
//     color: '#666',
//   },
//   chartBar: {
//     height: 20,
//     backgroundColor: '#F5F5F5',
//     borderRadius: 10,
//     flexDirection: 'row',
//     overflow: 'hidden',
//   },
//   chartSegment: {
//     height: '100%',
//   },
//   objectsCard: {
//     backgroundColor: 'white',
//     padding: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//     elevation: 2,
//     marginBottom: 20,
//   },
//   objectItem: {
//     backgroundColor: '#F8F9FA',
//     padding: 15,
//     borderRadius: 8,
//     marginBottom: 10,
//   },
//   objectInfo: {},
//   objectHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   objectLabelContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     flex: 1,
//   },
//   objectLabel: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: '#333',
//   },
//   objectCategory: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 4,
//     marginLeft: 8,
//   },
//   objectCategoryText: {
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   objectDetails: {
//     marginTop: 4,
//   },
//   detailRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//     flexWrap: 'wrap',
//   },
//   detailText: {
//     fontSize: 12,
//     color: '#666',
//     marginRight: 8,
//   },
//   detailIcon: {
//     marginRight: 2,
//   },
  
//   // Full Image Modal Styles
//   fullImageModalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.9)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   fullImageModalContent: {
//     width: '100%',
//     height: '100%',
//     padding: 20,
//   },
//   fullImageHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//     paddingTop: 40,
//   },
//   fullImageTitle: {
//     color: 'white',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   fullImageContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     position: 'relative',
//   },
//   fullImage: {
//     width: '100%',
//     height: '80%',
//     borderRadius: 8,
//   },
//   fullImageLoading: {
//     alignItems: 'center',
//   },
//   fullImageLoadingText: {
//     color: 'white',
//     marginTop: 10,
//     fontSize: 14,
//   },
//   fullImageStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 20,
//     paddingHorizontal: 10,
//   },
//   fullImageStatsText: {
//     color: 'white',
//     fontSize: 14,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 6,
//   },
  
//   // Report Modal Styles
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: 'white',
//     borderRadius: 16,
//     padding: 20,
//     width: '100%',
//     maxHeight: '80%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 10,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#333',
//     flex: 1,
//   },
//   reportSummary: {
//     maxHeight: 200,
//     marginBottom: 15,
//   },
//   reportSummaryTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//     marginBottom: 10,
//   },
//   reportDetail: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//     gap: 8,
//   },
//   reportIcon: {
//     width: 20,
//   },
//   reportDetailLabel: {
//     fontSize: 13,
//     color: '#666',
//     width: 70,
//   },
//   reportDetailValue: {
//     fontSize: 13,
//     color: '#333',
//     flex: 1,
//     fontWeight: '500',
//   },
//   messageSection: {
//     marginBottom: 20,
//   },
//   messageHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 8,
//   },
//   messageLabel: {
//     fontSize: 14,
//     color: '#333',
//     fontWeight: '500',
//   },
//   messageInput: {
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 14,
//     color: '#333',
//     minHeight: 80,
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     gap: 10,
//   },
//   modalButton: {
//     flex: 1,
//     padding: 14,
//     borderRadius: 8,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 3,
//   },
//   cancelButton: {
//     backgroundColor: '#E0E0E0',
//   },
//   confirmButton: {
//     backgroundColor: '#1976D2',
//   },
//   cancelButtonText: {
//     color: '#666',
//     fontSize: 15,
//     fontWeight: '600',
//   },
//   confirmButtonText: {
//     color: 'white',
//     fontSize: 15,
//     fontWeight: '600',
//   },
// });

// export default WasteDetection;