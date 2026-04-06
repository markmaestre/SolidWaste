import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';

import {
  classifyWaste,
  uploadWasteReport,
  clearReportSuccess,
  clearError,
} from '../../redux/slices/classifySlice';

const { width, height } = Dimensions.get('window');

// ─── Waste Classification Database (ORDER: W, A, C, S) ────────────────
const WASTE_CLASSIFICATION = {
  residual: {
    category: 'W - Residual Waste',
    color: '#757575',
    icon: 'trash-can',
    description: 'Non-recyclable waste that goes to landfill',
    howToDispose: 'Place in black trash bag, dispose in designated residual waste bin',
    order: 1,
    items: {
      'residual': { type: 'Residual Waste', details: 'Non-recyclable and non-compostable waste' },
      'diaper': { type: 'Diaper', details: 'Used diapers - Cannot be recycled' },
      'sanitary': { type: 'Sanitary Waste', details: 'Sanitary napkins, tissue - Landfill disposal' },
      'tissue': { type: 'Tissue Paper', details: 'Used tissue, paper towels - Cannot be recycled' },
      'wax paper': { type: 'Wax Paper', details: 'Wax-coated paper - Not recyclable' },
      'ceramic': { type: 'Ceramic', details: 'Broken ceramics, dishes - Residual waste' },
      'foam': { type: 'Styrofoam', details: 'Styrofoam containers - Not recyclable' },
    }
  },
  recyclable: {
    category: 'A - Recyclable',
    color: '#2E7D32',
    icon: 'recycle',
    description: 'Can be recycled and processed into new materials',
    howToDispose: 'Rinse containers, remove labels, flatten boxes, sort by type',
    order: 2,
    items: {
      'bottle': { type: 'Plastic Bottle', resinCode: 'Varies', details: 'Check resin code #1-7' },
      'plastic bottle': { type: 'Plastic Bottle', resinCode: 'Varies', details: 'Check resin code #1-7' },
      'pet': { type: '#1 PET', resinCode: 'PET', details: 'Polyethylene Terephthalate - Soft drinks, water bottles' },
      'hdpe': { type: '#2 HDPE', resinCode: 'HDPE', details: 'High-Density Polyethylene - Shampoo, detergent bottles' },
      'pvc': { type: '#3 PVC', resinCode: 'PVC', details: 'Polyvinyl Chloride - Plastic containers' },
      'ldpe': { type: '#4 LDPE', resinCode: 'LDPE', details: 'Low-Density Polyethylene - Plastic bags' },
      'pp': { type: '#5 PP', resinCode: 'PP', details: 'Polypropylene - Cups, food containers' },
      'ps': { type: '#6 PS', resinCode: 'PS', details: 'Polystyrene - Disposable cups' },
      'other plastic': { type: '#7 Other', resinCode: 'Other', details: 'Mixed plastics' },
      'can': { type: 'Aluminum Can', resinCode: 'Metal', details: 'Soda cans, beverage cans' },
      'carton': { type: 'Carton', resinCode: 'Paper/Mixed', details: 'Milk cartons, juice boxes' },
      'cup': { type: 'Paper Cup', resinCode: 'Paper', details: 'Coffee cups, paper cups' },
      'glass bottle': { type: 'Glass Bottle', resinCode: 'Glass', details: 'Infinitely recyclable' },
      'paper': { type: 'Paper', resinCode: 'Paper', details: 'Newspapers, office paper' },
    }
  },
  compostable: {
    category: 'C - Compostable',
    color: '#F57C00',
    icon: 'leaf',
    description: 'Can be composted and turned into nutrient-rich soil',
    howToDispose: 'Collect in compost bin, mix with brown materials, keep moist',
    order: 3,
    items: {
      'organic': { type: 'Organic Waste', details: 'Food scraps, fruit peels, vegetable trimmings' },
      'food': { type: 'Food Waste', details: 'Leftovers, coffee grounds, tea bags' },
      'fruit': { type: 'Fruit Scraps', details: 'Banana peels, apple cores, fruit waste' },
      'vegetable': { type: 'Vegetable Scraps', details: 'Peelings, leaves, vegetable trimmings' },
    }
  },
  special: {
    category: 'S - Special Waste',
    color: '#BF360C',
    icon: 'alert-circle',
    description: 'Requires special handling and proper disposal',
    howToDispose: 'DO NOT mix with regular trash. Contact barangay for proper disposal',
    order: 4,
    items: {
      'battery': { type: 'Battery', details: 'Contains hazardous materials - Do not throw in regular trash' },
      'bulb': { type: 'Light Bulb', details: 'Contains mercury - Needs special disposal' },
      'electronic': { type: 'E-Waste', details: 'Electronic devices - Needs proper recycling' },
      'hazardous': { type: 'Hazardous Waste', details: 'Dangerous materials - Requires special handling' },
      'chemical': { type: 'Chemical Waste', details: 'Toxic chemicals - Professional disposal required' },
      'medical': { type: 'Medical Waste', details: 'Biohazardous materials - Special handling required' },
      'paint': { type: 'Paint', details: 'Chemical waste - Do not pour down drain' },
      'oil': { type: 'Oil', details: 'Motor oil, cooking oil - Hazardous waste' },
    }
  }
};

const getWasteClassification = (wasteClass = '') => {
  const lowerClass = wasteClass.toLowerCase();
  
  for (const [category, data] of Object.entries(WASTE_CLASSIFICATION)) {
    for (const [key, info] of Object.entries(data.items)) {
      if (lowerClass.includes(key)) {
        return { 
          category: data.category, 
          info, 
          color: data.color, 
          icon: data.icon, 
          description: data.description,
          howToDispose: data.howToDispose,
          order: data.order
        };
      }
    }
  }
  
  return {
    category: 'W - Residual Waste',
    info: { type: wasteClass, details: 'Please verify proper disposal method locally' },
    color: '#757575',
    icon: 'trash-can',
    description: 'Non-recyclable waste - Dispose in residual waste bin',
    howToDispose: 'Place in black trash bag for landfill disposal',
    order: 1
  };
};

const SPECIAL_WASTE_TYPES = [
  'hazardous', 'chemical', 'battery', 'electronic', 'e-waste',
  'medical', 'sharps', 'paint', 'oil', 'solvent', 'pesticide',
  'fluorescent', 'asbestos', 'radioactive', 'special', 'bulb'
];

const isSpecialWaste = (wasteClass = '') =>
  SPECIAL_WASTE_TYPES.some((t) => wasteClass.toLowerCase().includes(t));

const BARANGAY_OPTIONS = [
  {
    id: 'south_signal',
    label: 'Brgy. South Signal Village',
    icon: 'city',
    color: '#1565C0',
  },
  {
    id: 'central_bicutan',
    label: 'Brgy. Central Bicutan',
    icon: 'office-building',
    color: '#6A1B9A',
  },
];

const WasteClassifier = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const {
    predictions,
    imageUrl,
    imageWidth,
    imageHeight,
    loading,
    error,
    recentClassifications,
    uploadingReport,
    reportSuccess,
  } = useSelector((state) => state.classify);
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('scan');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showNoInternetModal, setShowNoInternetModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  const [reportData, setReportData] = useState({
    location: '',
    description: '',
    quantity: 'small',
    barangay: null,
  });

  // Network connectivity monitoring - FIXED VERSION
  useEffect(() => {
    let unsubscribe;
    
    const setupNetInfo = async () => {
      try {
        // Check initial connection status
        const netInfo = await NetInfo.fetch();
        setIsOnline(netInfo.isConnected === true && netInfo.isInternetReachable !== false);
        
        // Subscribe to connection changes
        unsubscribe = NetInfo.addEventListener(state => {
          const connected = state.isConnected === true && state.isInternetReachable !== false;
          setIsOnline(connected);
          
          if (!connected && !showNoInternetModal) {
            setShowNoInternetModal(true);
          } else if (connected && showNoInternetModal) {
            setShowNoInternetModal(false);
            // Retry pending action if any
            if (pendingAction) {
              setTimeout(() => {
                pendingAction();
                setPendingAction(null);
              }, 500);
            }
          }
        });
      } catch (err) {
        console.log('NetInfo error:', err);
        // Default to online if we can't detect
        setIsOnline(true);
      }
    };
    
    setupNetInfo();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [pendingAction, showNoInternetModal]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (reportSuccess) {
      Alert.alert('Success!', 'Your waste report has been submitted.', [
        {
          text: 'OK',
          onPress: () => {
            dispatch(clearReportSuccess());
            setShowReportModal(false);
            setReportData({
              location: '',
              description: '',
              quantity: 'small',
              barangay: null,
            });
            setSelectedPrediction(null);
          },
        },
      ]);
    }
  }, [reportSuccess, dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Check internet connection before actions
  const checkInternetAndExecute = async (action, actionName) => {
    try {
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected === true && netInfo.isInternetReachable !== false;
      
      if (!isConnected) {
        setShowNoInternetModal(true);
        setPendingAction(() => action);
        return false;
      }
      
      return await action();
    } catch (err) {
      console.log('Network check error:', err);
      // If we can't check network, assume online and try the action
      return await action();
    }
  };

  const getConfidenceColor = (confidence) => {
    const percent = confidence * 100;
    if (percent >= 80) return '#4CAF50';
    if (percent >= 60) return '#FF9800';
    if (percent >= 40) return '#FFC107';
    return '#F44336';
  };

  const getBoundingBoxStyle = (prediction) => {
    if (!imageLayout.width || !imageLayout.height || !imageWidth || !imageHeight) {
      return null;
    }
    
    const displayedWidth = prediction.width * imageLayout.width;
    const displayedHeight = prediction.height * imageLayout.height;
    const displayedCenterX = prediction.x * imageLayout.width;
    const displayedCenterY = prediction.y * imageLayout.height;
    
    const left = displayedCenterX - (displayedWidth / 2);
    const top = displayedCenterY - (displayedHeight / 2);
    
    const finalLeft = Math.max(0, Math.min(left, imageLayout.width - displayedWidth));
    const finalTop = Math.max(0, Math.min(top, imageLayout.height - displayedHeight));
    const finalWidth = Math.min(displayedWidth, imageLayout.width - finalLeft);
    const finalHeight = Math.min(displayedHeight, imageLayout.height - finalTop);
    
    const isSpecial = isSpecialWaste(prediction.class);
    const borderColor = isSpecial ? '#E65100' : getConfidenceColor(prediction.confidence);
    
    return {
      position: 'absolute',
      left: finalLeft,
      top: finalTop,
      width: finalWidth,
      height: finalHeight,
      borderWidth: selectedBox === prediction ? 3 : 2,
      borderColor: borderColor,
      backgroundColor: selectedBox === prediction ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
      borderRadius: 6,
    };
  };

  const getConfidenceLabelColor = (confidence) => {
    const percent = confidence * 100;
    if (percent >= 80) return '#4CAF50';
    if (percent >= 60) return '#FF9800';
    if (percent >= 40) return '#FFC107';
    return '#F44336';
  };

  const pickImage = async () => {
    const action = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });
        if (!result.canceled) {
          await dispatch(classifyWaste({
            uri: result.assets[0].uri,
            base64: result.assets[0].base64,
          })).unwrap();
        }
      } catch (err) {
        if (err.message?.includes('network') || err.message?.includes('offline') || err.name === 'NetworkError') {
          Alert.alert('Connection Error', 'Please check your internet connection and try again.');
        } else {
          Alert.alert('Error', 'Failed to pick image: ' + (err.message || 'Unknown error'));
        }
      }
    };
    
    await checkInternetAndExecute(action, 'pickImage');
  };

  const captureImage = async () => {
    if (hasCameraPermission === false) {
      Alert.alert('Permission Required', 'Please grant camera permission to take photos.');
      return;
    }
    
    const action = async () => {
      try {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });
        if (!result.canceled) {
          await dispatch(classifyWaste({
            uri: result.assets[0].uri,
            base64: result.assets[0].base64,
          })).unwrap();
        }
      } catch (err) {
        if (err.message?.includes('network') || err.message?.includes('offline') || err.name === 'NetworkError') {
          Alert.alert('Connection Error', 'Please check your internet connection and try again.');
        } else {
          Alert.alert('Error', 'Failed to capture image: ' + (err.message || 'Unknown error'));
        }
      }
    };
    
    await checkInternetAndExecute(action, 'captureImage');
  };

  const openLiveDetector = () => {
    setShowComingSoonModal(true);
  };

  const handleBoxPress = (prediction) => {
    setSelectedBox(prediction);
    setSelectedPrediction(prediction);
    setReportData({
      ...reportData,
      wasteType: prediction.class,
    });
    setShowReportModal(true);
  };

  const handleReportWaste = (prediction) => {
    setSelectedPrediction(prediction);
    setReportData({
      ...reportData,
      wasteType: prediction.class,
    });
    setShowReportModal(true);
  };

  const validateReport = () => {
    if (!reportData.location.trim()) { 
      Alert.alert('Location Required', 'Please enter a location.'); 
      return false; 
    }
    if (!reportData.description.trim()) { 
      Alert.alert('Description Required', 'Please describe the waste situation.'); 
      return false; 
    }
    if (!reportData.barangay) { 
      Alert.alert('Barangay Required', 'Please select a barangay.'); 
      return false; 
    }
    return true;
  };

  const submitReport = async () => {
    if (!validateReport()) return;
    
    const action = async () => {
      const reportPayload = {
        location: reportData.location,
        description: reportData.description,
        quantity: reportData.quantity,
        barangay: reportData.barangay,
        imageUrl: imageUrl,
        classification: selectedPrediction,
        userId: user?.id,
      };
      
      await dispatch(uploadWasteReport(reportPayload)).unwrap();
      return true;
    };
    
    await checkInternetAndExecute(action, 'submitReport');
  };

  const getWasteIcon = (wasteType) => {
    const t = (wasteType || '').toLowerCase();
    const classification = getWasteClassification(t);
    if (classification.category.includes('Recyclable')) return 'recycle';
    if (classification.category.includes('Compostable')) return 'leaf';
    if (classification.category.includes('Special')) return 'alert-circle';
    return 'trash-can';
  };

  // Render No Internet Modal
  const renderNoInternetModal = () => (
    <Modal animationType="fade" transparent visible={showNoInternetModal} onRequestClose={() => {}}>
      <View style={styles.noInternetOverlay}>
        <View style={styles.noInternetModal}>
          <View style={styles.noInternetIconContainer}>
            <LinearGradient colors={['#F44336', '#D32F2F']} style={styles.noInternetIconGradient}>
              <MaterialCommunityIcons name="wifi-off" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.noInternetTitle}>No Internet Connection</Text>
          <Text style={styles.noInternetMessage}>
            Please check your internet connection and try again.
          </Text>
          <Text style={styles.noInternetSubMessage}>
            You can also use the demo mode to test the classifier offline.
          </Text>
          <View style={styles.noInternetButtons}>
            <TouchableOpacity 
              style={[styles.noInternetButton, styles.retryButton]} 
              onPress={async () => {
                try {
                  const netInfo = await NetInfo.fetch();
                  if (netInfo.isConnected === true) {
                    setShowNoInternetModal(false);
                    if (pendingAction) {
                      pendingAction();
                      setPendingAction(null);
                    }
                  } else {
                    Alert.alert('Still Offline', 'Please check your connection and try again.');
                  }
                } catch (err) {
                  Alert.alert('Error', 'Could not check connection status.');
                }
              }}
            >
              <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.noInternetButtonGradient}>
                <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.noInternetButtonText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.noInternetButton, styles.demoButton]} 
              onPress={() => {
                setShowNoInternetModal(false);
                Alert.alert('Demo Mode', 'Demo mode will be available soon for offline testing.');
              }}
            >
              <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.noInternetButtonGradient}>
                <MaterialCommunityIcons name="cellphone-play" size={18} color="#fff" />
                <Text style={styles.noInternetButtonText}>Use Demo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderImageWithBoxes = () => {
    if (!imageUrl) return null;

    return (
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.previewImage}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setImageLayout({ width, height });
          }}
          resizeMode="contain"
        />

        {predictions.map((prediction, index) => {
          const boxStyle = getBoundingBoxStyle(prediction);
          if (!boxStyle || boxStyle.width <= 0 || boxStyle.height <= 0) return null;
          
          const labelHeight = 28;
          const labelWidth = 130;
          const showLabelAbove = boxStyle.top - labelHeight > 10;
          const confidencePercent = (prediction.confidence * 100).toFixed(1);
          const isSpecial = isSpecialWaste(prediction.class);
          const labelColor = isSpecial ? '#E65100' : getConfidenceLabelColor(prediction.confidence);
          
          return (
            <TouchableOpacity
              key={`box-${index}`}
              style={[boxStyle, styles.boundingBox]}
              onPress={() => handleBoxPress(prediction)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.boxLabel,
                  {
                    backgroundColor: labelColor,
                    top: showLabelAbove ? -labelHeight : boxStyle.height,
                    left: Math.max(0, Math.min(boxStyle.left, boxStyle.width - labelWidth)),
                  }
                ]}
              >
                <MaterialCommunityIcons name={getWasteIcon(prediction.class)} size={10} color="#fff" />
                <Text style={styles.boxLabelText}>
                  #{index + 1} {prediction.class} ({confidencePercent}%)
                </Text>
              </View>
              {isSpecial && (
                <View style={styles.specialBadge}>
                  <MaterialCommunityIcons name="alert" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {predictions.length > 0 && (
          <View style={styles.detectionCount}>
            <MaterialCommunityIcons name="eye" size={12} color="#fff" />
            <Text style={styles.detectionCountText}>
              {predictions.length} {predictions.length === 1 ? 'item' : 'items'} detected
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderPredictionCard = (prediction, index) => {
    const confidencePercent = (prediction.confidence * 100).toFixed(1);
    const classification = getWasteClassification(prediction.class);
    const isSpecial = isSpecialWaste(prediction.class);
    const isExpanded = expandedCard === index;

    const renderIcon = () => {
      switch(classification.icon) {
        case 'recycle':
          return <MaterialCommunityIcons name="recycle" size={24} color={classification.color} />;
        case 'leaf':
          return <MaterialCommunityIcons name="leaf" size={24} color={classification.color} />;
        case 'alert-circle':
          return <MaterialCommunityIcons name="alert-circle" size={24} color={classification.color} />;
        default:
          return <MaterialCommunityIcons name="trash-can" size={24} color={classification.color} />;
      }
    };

    return (
      <View 
        key={`card-${index}`} 
        style={[styles.predictionCard, { borderLeftColor: classification.color, borderLeftWidth: 4 }]}
      >
        <TouchableOpacity
          onPress={() => setExpandedCard(isExpanded ? null : index)}
          activeOpacity={0.7}
        >
          <View style={styles.predictionHeader}>
            <View style={[styles.predictionIconContainer, { backgroundColor: classification.color + '15' }]}>
              {renderIcon()}
            </View>
            <View style={styles.predictionInfo}>
              <Text style={styles.predictionClass}>
                #{index + 1} {prediction.class}
              </Text>
              <Text style={styles.predictionConfidence}>
                Confidence: {confidencePercent}%
              </Text>
            </View>
            <MaterialCommunityIcons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color="#78909C" />
          </View>
          
          <View style={styles.confidenceBar}>
            <View 
              style={[
                styles.confidenceFill, 
                { 
                  width: `${confidencePercent}%`,
                  backgroundColor: getConfidenceColor(prediction.confidence)
                }
              ]} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="information-outline" size={14} color="#1565C0" />
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailText}>{classification.category}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="file-document-outline" size={14} color="#1565C0" />
              <Text style={styles.detailLabel}>Details:</Text>
              <Text style={styles.detailText}>{classification.info.details || classification.description}</Text>
            </View>

            <View style={[styles.disposalBox, { backgroundColor: classification.color + '10' }]}>
              <MaterialCommunityIcons name="delete-outline" size={14} color={classification.color} />
              <Text style={[styles.disposalLabel, { color: classification.color }]}>How to Dispose:</Text>
              <Text style={styles.disposalText}>{classification.howToDispose}</Text>
            </View>

            {isSpecial && (
              <View style={styles.specialWarningBox}>
                <MaterialCommunityIcons name="alert-octagon" size={14} color="#BF360C" />
                <Text style={styles.specialWarningText}>⚠️ SPECIAL WASTE: Requires immediate reporting</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => handleReportWaste(prediction)}
        >
          <LinearGradient
            colors={isSpecial ? ['#BF360C', '#E64A19'] : ['#4CAF50', '#45A049']}
            style={styles.reportButtonGradient}
          >
            <MaterialCommunityIcons name="report" size={18} color="#FFFFFF" />
            <Text style={styles.reportButtonText}>Report This Waste</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderScanningUI = () => (
    <ScrollView style={styles.scanContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.imageSection}>
        <LinearGradient colors={['#0A2F6E', '#1565C0', '#1E88E5']} style={styles.imageSectionGradient}>
          <MaterialCommunityIcons name="recycle" size={34} color="rgba(255,255,255,0.25)" style={{ marginBottom: 6 }} />
          <Text style={styles.imageSectionTitle}>Waste Detection</Text>
          <Text style={styles.imageSectionSubtitle}>Capture or upload image to detect waste with AI</Text>
        </LinearGradient>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={captureImage}>
            <LinearGradient colors={['#0D47A1', '#1976D2']} style={styles.actionButtonGradient}>
              <MaterialCommunityIcons name="camera" size={26} color="#fff" />
              <Text style={styles.actionButtonText}>Capture</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
            <LinearGradient colors={['#1565C0', '#42A5F5']} style={styles.actionButtonGradient}>
              <MaterialCommunityIcons name="image-multiple" size={26} color="#fff" />
              <Text style={styles.actionButtonText}>Upload</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openLiveDetector}>
            <LinearGradient colors={['#00695C', '#00897B']} style={styles.actionButtonGradient}>
              <MaterialCommunityIcons name="video" size={26} color="#fff" />
              <Text style={styles.actionButtonText}>Live</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#757575' }]} />
              <Text style={styles.legendText}>W - Residual Waste</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
              <Text style={styles.legendText}>A - Recyclable</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F57C00' }]} />
              <Text style={styles.legendText}>C - Compostable</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#BF360C' }]} />
              <Text style={styles.legendText}>S - Special Waste</Text>
            </View>
          </View>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.loadingText}>Analyzing image...</Text>
          <Text style={styles.loadingSubtext}>AI is detecting and classifying waste items</Text>
        </View>
      )}

      {imageUrl && !loading && renderImageWithBoxes()}

      {predictions.length > 0 && !loading && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <MaterialCommunityIcons name="chart-line" size={21} color="#1565C0" />
            <Text style={styles.resultsTitle}>Detection Results</Text>
            <View style={styles.resultsBadge}>
              <Text style={styles.resultsBadgeText}>{predictions.length}</Text>
            </View>
          </View>
          
          <Text style={styles.resultsSubtitle}>
            Tap on any item to see detailed disposal instructions. Tap on bounding boxes to highlight items.
          </Text>

          {predictions.map((pred, i) => renderPredictionCard(pred, i))}
        </View>
      )}

      <View style={styles.howItWorksContainer}>
        <View style={styles.howItWorksHeader}>
          <MaterialCommunityIcons name="help-circle-outline" size={20} color="#1565C0" />
          <Text style={styles.howItWorksTitle}>How it works</Text>
        </View>
        
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Capture or Upload Image</Text>
            <Text style={styles.stepDescription}>Take a photo using your camera or select from gallery</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>AI Detection</Text>
            <Text style={styles.stepDescription}>Our AI identifies waste items with bounding boxes and confidence scores</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>View Classification</Text>
            <Text style={styles.stepDescription}>See waste category (W, A, C, S order) and detailed disposal instructions</Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Report Waste</Text>
            <Text style={styles.stepDescription}>Report any waste item to your barangay for proper disposal</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderHistoryUI = () => (
    <ScrollView style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Recent Classifications</Text>
        <Text style={styles.historySubtitle}>Your last {recentClassifications.length} waste scans</Text>
      </View>

      {recentClassifications.length === 0 ? (
        <View style={styles.emptyHistory}>
          <MaterialCommunityIcons name="history" size={60} color="#CFD8DC" />
          <Text style={styles.emptyHistoryTitle}>No History Yet</Text>
          <Text style={styles.emptyHistoryText}>Start scanning to see classification history</Text>
          <TouchableOpacity style={styles.startScanButton} onPress={() => setActiveTab('scan')}>
            <Text style={styles.startScanButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentClassifications.map((item, index) => {
          const classification = getWasteClassification(item.topPrediction);
          return (
            <View key={item.id || index} style={[styles.historyItem, { borderLeftColor: classification.color, borderLeftWidth: 4 }]}>
              <View style={styles.historyItemHeader}>
                <View style={[styles.historyIconContainer, { backgroundColor: classification.color + '15' }]}>
                  <MaterialCommunityIcons name={classification.icon} size={22} color={classification.color} />
                </View>
                <View style={styles.historyItemInfo}>
                  <Text style={styles.historyItemTitle}>{item.topPrediction}</Text>
                  <Text style={styles.historyItemConfidence}>Confidence: {item.confidence}%</Text>
                  <Text style={styles.historyItemDetections}>{classification.category}</Text>
                </View>
                <Text style={styles.historyItemDate}>{new Date(item.timestamp).toLocaleDateString()}</Text>
              </View>
              {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.historyImage} />}
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const renderReportModal = () => {
    if (!selectedPrediction) return null;
    
    const classification = getWasteClassification(selectedPrediction.class);
    const isSpecial = isSpecialWaste(selectedPrediction.class);
    
    return (
      <Modal animationType="slide" transparent visible={showReportModal} onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Waste</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.modalClose}>
                <MaterialCommunityIcons name="close" size={22} color="#90A4AE" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.selectedWaste, { backgroundColor: classification.color + '15' }]}>
                <MaterialCommunityIcons name={classification.icon} size={40} color={classification.color} />
                <Text style={[styles.selectedWasteText, { color: classification.color }]}>
                  {selectedPrediction.class}
                </Text>
                <Text style={styles.selectedConfidence}>
                  Confidence: {(selectedPrediction.confidence * 100).toFixed(1)}%
                </Text>
                <Text style={styles.selectedCategory}>{classification.category}</Text>
              </View>

              {isSpecial && (
                <View style={styles.specialWarningModalBox}>
                  <MaterialCommunityIcons name="alert-octagon" size={20} color="#BF360C" />
                  <Text style={styles.specialWarningModalText}>
                    ⚠️ SPECIAL WASTE - Handle with care
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Report To  *</Text>
                <View style={styles.brgyContainer}>
                  {BARANGAY_OPTIONS.map((brgy) => {
                    const selected = reportData.barangay === brgy.id;
                    return (
                      <TouchableOpacity
                        key={brgy.id}
                        style={[styles.brgyOption, selected && { borderColor: brgy.color, backgroundColor: brgy.color + '12' }]}
                        onPress={() => setReportData({ ...reportData, barangay: brgy.id })}
                      >
                        <View style={[styles.brgyIconCircle, { backgroundColor: brgy.color + '20' }]}>
                          <MaterialCommunityIcons name={brgy.icon} size={22} color={brgy.color} />
                        </View>
                        <Text style={[styles.brgyOptionText, selected && { color: brgy.color, fontWeight: '700' }]}>
                          {brgy.label}
                        </Text>
                        {selected && <MaterialCommunityIcons name="check-circle" size={18} color={brgy.color} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exact Location  *</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="map-marker" size={19} color="#90A4AE" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Street, landmark, or address"
                    value={reportData.location}
                    onChangeText={(t) => setReportData({ ...reportData, location: t })}
                    placeholderTextColor="#CFD8DC"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description  *</Text>
                <View style={[styles.inputContainer, { alignItems: 'flex-start' }]}>
                  <MaterialCommunityIcons name="file-document-outline" size={19} color="#90A4AE" style={[styles.inputIcon, { marginTop: 13 }]} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the waste situation"
                    value={reportData.description}
                    onChangeText={(t) => setReportData({ ...reportData, description: t })}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#CFD8DC"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Estimated Volume</Text>
                <View style={styles.quantityContainer}>
                  {[
                    { value: 'small', icon: 'package-variant', label: 'Small' },
                    { value: 'medium', icon: 'archive', label: 'Medium' },
                    { value: 'large', icon: 'warehouse', label: 'Large' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.quantityOption, reportData.quantity === opt.value && styles.quantityOptionActive]}
                      onPress={() => setReportData({ ...reportData, quantity: opt.value })}
                    >
                      <MaterialCommunityIcons name={opt.icon} size={17} color={reportData.quantity === opt.value ? '#fff' : '#78909C'} />
                      <Text style={[styles.quantityText, reportData.quantity === opt.value && styles.quantityTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.disposalInfoBox, { backgroundColor: classification.color + '10' }]}>
                <MaterialCommunityIcons name="delete-outline" size={18} color={classification.color} />
                <Text style={[styles.disposalInfoTitle, { color: classification.color }]}>Disposal Instructions:</Text>
                <Text style={styles.disposalInfoText}>{classification.howToDispose}</Text>
              </View>

              <TouchableOpacity style={styles.submitReportBtn} onPress={submitReport} disabled={uploadingReport}>
                <LinearGradient colors={isSpecial ? ['#BF360C', '#E64A19'] : ['#4CAF50', '#45A049']} style={styles.submitReportGradient}>
                  {uploadingReport ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={20} color="#fff" />
                      <Text style={styles.submitReportText}>Submit Report</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderComingSoonModal = () => (
    <Modal animationType="fade" transparent visible={showComingSoonModal} onRequestClose={() => setShowComingSoonModal(false)}>
      <View style={styles.comingSoonOverlay}>
        <View style={styles.comingSoonModal}>
          <View style={styles.comingSoonIconContainer}>
            <LinearGradient colors={['#00695C', '#00897B']} style={styles.comingSoonIconGradient}>
              <MaterialCommunityIcons name="video" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.comingSoonTitle}>Coming Soon! 🚀</Text>
          <Text style={styles.comingSoonMessage}>
            The live waste detection feature is currently under development. 
            We're working hard to bring you real-time AI-powered waste detection.
          </Text>
          <TouchableOpacity style={styles.comingSoonButton} onPress={() => setShowComingSoonModal(false)}>
            <LinearGradient colors={['#00695C', '#00897B']} style={styles.comingSoonButtonGradient}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#fff" />
              <Text style={styles.comingSoonButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A2F6E" />

      <LinearGradient colors={['#0A2F6E', '#1565C0', '#1E88E5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Waste Classifier</Text>
          <Text style={styles.headerSubtitle}>AI-powered waste detection</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'scan' && styles.activeTab]} onPress={() => setActiveTab('scan')}>
          <MaterialCommunityIcons name="camera" size={18} color={activeTab === 'scan' ? '#1565C0' : '#B0BEC5'} />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.activeTabText]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
          <MaterialCommunityIcons name="history" size={18} color={activeTab === 'history' ? '#1565C0' : '#B0BEC5'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'scan' ? renderScanningUI() : renderHistoryUI()}
      </View>

      {renderReportModal()}
      {renderComingSoonModal()}
      {renderNoInternetModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECEFF1' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 16,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 6,
  },
  backButton: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  headerPlaceholder: { width: 38 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 14,
    elevation: 2,
    padding: 4,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, gap: 6 },
  activeTab: { backgroundColor: '#E3F2FD' },
  tabText: { fontSize: 13, color: '#B0BEC5', fontWeight: '600' },
  activeTabText: { color: '#1565C0', fontWeight: '800' },
  content: { flex: 1, marginTop: 14 },
  scanContainer: { flex: 1 },
  imageSection: { marginHorizontal: 16, marginBottom: 14 },
  imageSectionGradient: { padding: 20, borderRadius: 20, alignItems: 'center', elevation: 4 },
  imageSectionTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  imageSectionSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  actionButtons: { flexDirection: 'row', marginTop: 14, gap: 8 },
  actionButton: { flex: 1 },
  actionButtonGradient: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 3 },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  legendContainer: { marginTop: 12 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 10, color: '#546E7A' },
  loadingContainer: { alignItems: 'center', padding: 32, marginHorizontal: 16, marginBottom: 14, backgroundColor: '#fff', borderRadius: 16 },
  loadingText: { fontSize: 15, fontWeight: '700', color: '#1565C0', marginTop: 12 },
  loadingSubtext: { fontSize: 12, color: '#90A4AE', marginTop: 5 },
  imageContainer: { position: 'relative', marginHorizontal: 16, marginBottom: 14, backgroundColor: '#1A237E', borderRadius: 16, overflow: 'hidden', minHeight: 200 },
  previewImage: { width: '100%', height: 300, resizeMode: 'contain', backgroundColor: '#1A237E' },
  boundingBox: { position: 'absolute', borderRadius: 6 },
  boxLabel: { position: 'absolute', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4, zIndex: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2 },
  boxLabelText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  specialBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#BF360C', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 25 },
  detectionCount: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.70)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4, zIndex: 30 },
  detectionCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  resultsContainer: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, borderRadius: 16, padding: 16 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  resultsTitle: { fontSize: 17, fontWeight: '800', color: '#1565C0', flex: 1 },
  resultsBadge: { backgroundColor: '#1565C0', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resultsBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  resultsSubtitle: { fontSize: 12, color: '#78909C', marginBottom: 14 },
  predictionCard: { backgroundColor: '#F8FAFD', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E0E9F4' },
  predictionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  predictionIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  predictionInfo: { flex: 1 },
  predictionClass: { fontSize: 15, fontWeight: '800', color: '#1A237E', marginBottom: 2 },
  predictionConfidence: { fontSize: 12, color: '#78909C' },
  confidenceBar: { height: 5, backgroundColor: '#ECEFF1', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  confidenceFill: { height: '100%', borderRadius: 3 },
  expandedDetails: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#37474F' },
  detailText: { fontSize: 11, color: '#607D8B', flex: 1 },
  disposalBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, flexWrap: 'wrap' },
  disposalLabel: { fontSize: 11, fontWeight: '700' },
  disposalText: { fontSize: 10, color: '#424242', flex: 1 },
  specialWarningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#BF360C' + '15', padding: 10, borderRadius: 8, marginTop: 4 },
  specialWarningText: { fontSize: 11, fontWeight: '600', color: '#BF360C', flex: 1 },
  reportButton: { marginTop: 12 },
  reportButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 8 },
  reportButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  howItWorksContainer: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 24, borderRadius: 16, padding: 20 },
  howItWorksHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  howItWorksTitle: { fontSize: 16, fontWeight: '800', color: '#1565C0' },
  stepItem: { flexDirection: 'row', marginBottom: 16, gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1565C0', justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#212121', marginBottom: 4 },
  stepDescription: { fontSize: 12, color: '#78909C', lineHeight: 18 },
  historyContainer: { flex: 1 },
  historyHeader: { paddingHorizontal: 18, marginBottom: 12 },
  historyTitle: { fontSize: 18, fontWeight: '800', color: '#212121' },
  historySubtitle: { fontSize: 13, color: '#90A4AE', marginTop: 2 },
  emptyHistory: { alignItems: 'center', padding: 40, marginTop: 24 },
  emptyHistoryTitle: { fontSize: 17, fontWeight: '700', color: '#90A4AE', marginTop: 12 },
  emptyHistoryText: { fontSize: 13, color: '#B0BEC5', textAlign: 'center', marginTop: 6, marginBottom: 20 },
  startScanButton: { backgroundColor: '#1565C0', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  startScanButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  historyItem: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14 },
  historyItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  historyIconContainer: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  historyItemInfo: { flex: 1 },
  historyItemTitle: { fontSize: 14, fontWeight: '700', color: '#212121' },
  historyItemConfidence: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  historyItemDetections: { fontSize: 11, color: '#B0BEC5', marginTop: 1 },
  historyItemDate: { fontSize: 11, color: '#CFD8DC' },
  historyImage: { width: '100%', height: 130, borderRadius: 8, resizeMode: 'cover' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.90 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0A2F6E' },
  modalClose: { padding: 4 },
  selectedWaste: { alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20 },
  selectedWasteText: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  selectedConfidence: { fontSize: 12, color: '#757575', marginTop: 4 },
  selectedCategory: { fontSize: 12, fontWeight: '600', color: '#757575', marginTop: 2 },
  specialWarningModalBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#BF360C' + '15', padding: 12, borderRadius: 8, marginBottom: 20 },
  specialWarningModalText: { fontSize: 13, fontWeight: '600', color: '#BF360C' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#37474F', marginBottom: 8 },
  brgyContainer: { gap: 10 },
  brgyOption: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#F5F5F5', borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', gap: 12 },
  brgyIconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  brgyOptionText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#424242' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#CFD8DC', borderRadius: 12, backgroundColor: '#F8FAFC', paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#212121', paddingVertical: 12 },
  textArea: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  quantityContainer: { flexDirection: 'row', gap: 8 },
  quantityOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#ECEFF1', borderRadius: 10, gap: 5 },
  quantityOptionActive: { backgroundColor: '#1565C0' },
  quantityText: { fontSize: 12, color: '#607D8B', fontWeight: '600' },
  quantityTextActive: { color: '#fff' },
  disposalInfoBox: { padding: 12, borderRadius: 8, marginBottom: 20 },
  disposalInfoTitle: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  disposalInfoText: { fontSize: 11, color: '#424242', marginTop: 2 },
  submitReportBtn: { marginTop: 8, marginBottom: Platform.OS === 'ios' ? 24 : 12 },
  submitReportGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  submitReportText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  comingSoonOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  comingSoonModal: { backgroundColor: '#fff', borderRadius: 28, padding: 24, width: width * 0.85, alignItems: 'center' },
  comingSoonIconContainer: { marginBottom: 20 },
  comingSoonIconGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  comingSoonTitle: { fontSize: 24, fontWeight: '800', color: '#00695C', marginBottom: 12, textAlign: 'center' },
  comingSoonMessage: { fontSize: 14, color: '#607D8B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  comingSoonButton: { width: '100%' },
  comingSoonButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  comingSoonButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // No Internet Modal Styles
  noInternetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  noInternetModal: { backgroundColor: '#fff', borderRadius: 28, padding: 24, width: width * 0.85, alignItems: 'center' },
  noInternetIconContainer: { marginBottom: 20 },
  noInternetIconGradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  noInternetTitle: { fontSize: 22, fontWeight: '800', color: '#F44336', marginBottom: 12, textAlign: 'center' },
  noInternetMessage: { fontSize: 14, color: '#607D8B', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  noInternetSubMessage: { fontSize: 12, color: '#90A4AE', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  noInternetButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  noInternetButton: { flex: 1 },
  noInternetButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  noInternetButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  retryButton: { flex: 1 },
  demoButton: { flex: 1 },
});

export default WasteClassifier;