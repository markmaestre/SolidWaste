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
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

import { 
  classifyWaste, 
  uploadWasteReport, 
  clearReportSuccess,
  clearError 
} from '../../redux/slices/classifySlice';
import LiveWasteDetector from './LiveWasteDetector';

const { width, height } = Dimensions.get('window');

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
    reportSuccess 
  } = useSelector((state) => state.classify);
  const { user } = useSelector((state) => state.auth);
  
  const [activeTab, setActiveTab] = useState('scan');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [showLiveDetector, setShowLiveDetector] = useState(false);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0 });
  const [selectedBox, setSelectedBox] = useState(null);
  const [reportData, setReportData] = useState({
    location: '',
    description: '',
    wasteType: '',
    quantity: 'small',
  });

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (reportSuccess) {
      Alert.alert(
        'Success!',
        'Your waste report has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              dispatch(clearReportSuccess());
              setShowReportModal(false);
              setReportData({
                location: '',
                description: '',
                wasteType: '',
                quantity: 'small',
              });
              setSelectedPrediction(null);
            },
          },
        ]
      );
    }
  }, [reportSuccess, dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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
    
    return {
      position: 'absolute',
      left: finalLeft,
      top: finalTop,
      width: finalWidth,
      height: finalHeight,
      borderWidth: selectedBox === prediction ? 3 : 2,
      borderColor: getConfidenceColor(prediction.confidence),
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      borderRadius: 4,
    };
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled) {
        console.log('📸 Image selected from gallery');
        await dispatch(classifyWaste({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64,
        })).unwrap();
      }
    } catch (error) {
      console.error('❌ Pick image error:', error);
      Alert.alert('Error', 'Failed to pick image: ' + (error.message || 'Unknown error'));
    }
  };

  const openLiveDetector = () => {
    if (hasCameraPermission === false) {
      Alert.alert('Permission Required', 'Please grant camera permission to use live detection');
      return;
    }
    setShowLiveDetector(true);
  };

  const handleLiveDetectionReport = (prediction, capturedImageUrl) => {
    setSelectedPrediction(prediction);
    setReportData({
      ...reportData,
      wasteType: prediction.class,
    });
    setShowReportModal(true);
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

  const submitWasteReport = async () => {
    if (!reportData.location.trim()) {
      Alert.alert('Location Required', 'Please enter a location');
      return;
    }
    
    if (!reportData.description.trim()) {
      Alert.alert('Description Required', 'Please describe the waste');
      return;
    }
    
    const reportPayload = {
      ...reportData,
      imageUrl: imageUrl,
      classification: selectedPrediction,
      userId: user?.id,
    };
    
    await dispatch(uploadWasteReport(reportPayload)).unwrap();
  };

  const getWasteIcon = (wasteType) => {
    const type = wasteType?.toLowerCase() || '';
    if (type.includes('plastic')) return 'plastic';
    if (type.includes('paper')) return 'description';
    if (type.includes('glass')) return 'glass';
    if (type.includes('metal')) return 'hardware';
    if (type.includes('organic')) return 'eco';
    if (type.includes('cup')) return 'coffee';
    if (type.includes('bottle')) return 'local-drink';
    return 'delete';
  };

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
          const labelWidth = 120;
          const showLabelAbove = boxStyle.top - labelHeight > 10;
          
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
                    backgroundColor: getConfidenceColor(prediction.confidence),
                    top: showLabelAbove ? -labelHeight : boxStyle.height,
                    left: Math.max(0, Math.min(boxStyle.left, boxStyle.width - labelWidth)),
                  }
                ]}
              >
                <Text style={styles.boxLabelText}>
                  #{index + 1} {prediction.class} ({(prediction.confidence * 100).toFixed(1)}%)
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        
        {predictions.length > 0 && (
          <View style={styles.detectionCount}>
            <Icon name="visibility" size={14} color="#FFFFFF" />
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
    
    return (
      <TouchableOpacity 
        key={`card-${index}`} 
        style={styles.predictionCard}
        onPress={() => handleBoxPress(prediction)}
      >
        <View style={styles.predictionHeader}>
          <View style={styles.predictionIconContainer}>
            <Icon name={getWasteIcon(prediction.class)} size={24} color="#1976D2" />
          </View>
          <View style={styles.predictionInfo}>
            <Text style={styles.predictionClass}>
              #{index + 1} {prediction.class}
            </Text>
            <Text style={styles.predictionConfidence}>
              Confidence: {confidencePercent}%
            </Text>
          </View>
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
        
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => handleReportWaste(prediction)}
        >
          <LinearGradient
            colors={['#4CAF50', '#45A049']}
            style={styles.reportButtonGradient}
          >
            <Icon name="report" size={20} color="#FFFFFF" />
            <Text style={styles.reportButtonText}>Report This Waste</Text>
          </LinearGradient>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderScanningUI = () => (
    <ScrollView style={styles.scanContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.imageSection}>
        <LinearGradient
          colors={['#1976D2', '#42A5F5']}
          style={styles.imageSectionGradient}
        >
          <Text style={styles.imageSectionTitle}>Waste Detection</Text>
          <Text style={styles.imageSectionSubtitle}>
            Two ways to detect waste: Live Camera with AI or Upload for high accuracy
          </Text>
        </LinearGradient>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={pickImage} activeOpacity={0.8}>
            <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.actionButtonGradient}>
              <Icon name="photo-library" size={32} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Upload</Text>
              <Text style={styles.actionButtonSubtext}>High Accuracy</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={openLiveDetector} activeOpacity={0.8}>
            <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.actionButtonGradient}>
              <Icon name="videocam" size={32} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Live Camera</Text>
              <Text style={styles.actionButtonSubtext}>Real-time AI</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <View style={styles.methodInfo}>
          <View style={styles.methodInfoItem}>
            <Icon name="cloud-queue" size={16} color="#1976D2" />
            <Text style={styles.methodInfoText}>Upload: Roboflow Cloud AI</Text>
          </View>
          <View style={styles.methodInfoItem}>
            <Icon name="phone-android" size={16} color="#4CAF50" />
            <Text style={styles.methodInfoText}>Live: TensorFlow Lite (Offline)</Text>
          </View>
        </View>
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Analyzing waste image...</Text>
          <Text style={styles.loadingSubtext}>AI is detecting waste items with bounding boxes</Text>
        </View>
      )}
      
      {imageUrl && !loading && renderImageWithBoxes()}
      
      {predictions.length > 0 && !loading && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Icon name="analytics" size={24} color="#1976D2" />
            <Text style={styles.resultsTitle}>Detection Results</Text>
          </View>
          <Text style={styles.resultsSubtitle}>
            AI has identified {predictions.length} waste item(s):
          </Text>
          
          {predictions.map((prediction, index) => renderPredictionCard(prediction, index))}
        </View>
      )}
      
      <View style={styles.infoContainer}>
        <View style={styles.infoHeader}>
          <Icon name="info" size={20} color="#1976D2" />
          <Text style={styles.infoTitle}>How it works</Text>
        </View>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>Upload:</Text> Take a photo or select from gallery - uses Roboflow cloud AI for high accuracy{'\n\n'}
          • <Text style={styles.infoBold}>Live Camera:</Text> Real-time detection using on-device TensorFlow Lite AI{'\n\n'}
          • Click on any detected item to report it to authorities
        </Text>
      </View>
    </ScrollView>
  );

  const renderHistoryUI = () => (
    <ScrollView style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Recent Classifications</Text>
        <Text style={styles.historySubtitle}>
          Your last {recentClassifications.length} waste scans
        </Text>
      </View>
      
      {recentClassifications.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Icon name="history" size={64} color="#BDC3C7" />
          <Text style={styles.emptyHistoryTitle}>No History Yet</Text>
          <Text style={styles.emptyHistoryText}>
            Start scanning waste to see your classification history here
          </Text>
          <TouchableOpacity style={styles.startScanButton} onPress={() => setActiveTab('scan')}>
            <Text style={styles.startScanButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentClassifications.map((item, index) => (
          <View key={item.id || index} style={styles.historyItem}>
            <View style={styles.historyItemHeader}>
              <View style={styles.historyIconContainer}>
                <Icon name={getWasteIcon(item.topPrediction)} size={24} color="#1976D2" />
              </View>
              <View style={styles.historyItemInfo}>
                <Text style={styles.historyItemTitle}>{item.topPrediction}</Text>
                <Text style={styles.historyItemConfidence}>
                  Confidence: {item.confidence}%
                </Text>
                <Text style={styles.historyItemDetections}>
                  {item.totalDetections} item(s) detected
                </Text>
              </View>
              <Text style={styles.historyItemDate}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
            </View>
            
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.historyImage} />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  if (showLiveDetector) {
    return (
      <LiveWasteDetector
        onClose={() => setShowLiveDetector(false)}
        onReport={handleLiveDetectionReport}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      <LinearGradient colors={['#1976D2', '#1E88E5', '#42A5F5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Waste Classifier</Text>
          <Text style={styles.headerSubtitle}>AI-powered waste detection</Text>
        </View>
        
        <View style={styles.headerPlaceholder} />
      </LinearGradient>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'scan' && styles.activeTab]} onPress={() => setActiveTab('scan')}>
          <Icon name="camera-alt" size={20} color={activeTab === 'scan' ? '#1976D2' : '#757575'} />
          <Text style={[styles.tabText, activeTab === 'scan' && styles.activeTabText]}>Scan</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
          <Icon name="history" size={20} color={activeTab === 'history' ? '#1976D2' : '#757575'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        {activeTab === 'scan' ? renderScanningUI() : renderHistoryUI()}
      </View>
      
      <Modal animationType="slide" transparent={true} visible={showReportModal} onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Waste</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.modalClose}>
                <Icon name="close" size={24} color="#757575" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPrediction && (
                <View style={styles.selectedWaste}>
                  <Icon name={getWasteIcon(selectedPrediction.class)} size={32} color="#1976D2" />
                  <Text style={styles.selectedWasteText}>Waste Type: {selectedPrediction.class}</Text>
                  <Text style={styles.selectedConfidence}>
                    Confidence: {(selectedPrediction.confidence * 100).toFixed(1)}%
                  </Text>
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="location-on" size={20} color="#757575" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter location address"
                    value={reportData.location}
                    onChangeText={(text) => setReportData({...reportData, location: text})}
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <View style={styles.inputContainer}>
                  <Icon name="description" size={20} color="#757575" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the waste situation"
                    value={reportData.description}
                    onChangeText={(text) => setReportData({...reportData, description: text})}
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quantity</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[styles.quantityOption, reportData.quantity === 'small' && styles.quantityOptionActive]}
                    onPress={() => setReportData({...reportData, quantity: 'small'})}
                  >
                    <Icon name="inbox" size={20} color={reportData.quantity === 'small' ? '#FFFFFF' : '#757575'} />
                    <Text style={[styles.quantityText, reportData.quantity === 'small' && styles.quantityTextActive]}>Small</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.quantityOption, reportData.quantity === 'medium' && styles.quantityOptionActive]}
                    onPress={() => setReportData({...reportData, quantity: 'medium'})}
                  >
                    <Icon name="archive" size={20} color={reportData.quantity === 'medium' ? '#FFFFFF' : '#757575'} />
                    <Text style={[styles.quantityText, reportData.quantity === 'medium' && styles.quantityTextActive]}>Medium</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.quantityOption, reportData.quantity === 'large' && styles.quantityOptionActive]}
                    onPress={() => setReportData({...reportData, quantity: 'large'})}
                  >
                    <Icon name="layers" size={20} color={reportData.quantity === 'large' ? '#FFFFFF' : '#757575'} />
                    <Text style={[styles.quantityText, reportData.quantity === 'large' && styles.quantityTextActive]}>Large</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity style={styles.submitReportButton} onPress={submitWasteReport} disabled={uploadingReport}>
                <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.submitReportGradient}>
                  {uploadingReport ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon name="send" size={20} color="#FFFFFF" />
                      <Text style={styles.submitReportText}>Submit Report</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  headerPlaceholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#E3F2FD',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1976D2',
  },
  content: {
    flex: 1,
    marginTop: 20,
  },
  scanContainer: {
    flex: 1,
  },
  imageSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  imageSectionGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  imageSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  imageSectionSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 16,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  methodInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  methodInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  methodInfoText: {
    fontSize: 10,
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 200,
  },
  previewImage: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    backgroundColor: '#F5F5F5',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  boxLabel: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 100,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  boxLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  detectionCount: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    zIndex: 10,
  },
  detectionCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  predictionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionClass: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  predictionConfidence: {
    fontSize: 12,
    color: '#757575',
  },
  confidenceBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  reportButton: {
    marginTop: 8,
  },
  reportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
    color: '#212121',
  },
  historyContainer: {
    flex: 1,
  },
  historyHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  historySubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 16,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  startScanButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startScanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyItemInfo: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  historyItemConfidence: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  historyItemDetections: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  historyItemDate: {
    fontSize: 11,
    color: '#BDBDBD',
  },
  historyImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  modalClose: {
    padding: 4,
  },
  selectedWaste: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedWasteText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 8,
  },
  selectedConfidence: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    paddingVertical: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  quantityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: 6,
  },
  quantityOptionActive: {
    backgroundColor: '#1976D2',
  },
  quantityText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  quantityTextActive: {
    color: '#FFFFFF',
  },
  submitReportButton: {
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  submitReportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  submitReportText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WasteClassifier;