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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { createWasteReport } from '../../redux/slices/wasteReportSlice';
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
  
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { loading: reportLoading, success, error } = useSelector(state => state.wasteReport);

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert("Error", error);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      Alert.alert(
        "✅ Report Submitted Successfully!",
        `Your waste analysis has been recorded and saved to your history.\n\n📊 Detection Summary:\n• Classification: ${classification}\n• Objects Detected: ${detected.length}\n• Confidence: ${classificationConfidence}%\n• Location: ${manualLocation || "Not specified"}\n\nYou can view this report in your history anytime.`,
        [
          {
            text: "📋 View History",
            onPress: () => navigation.navigate('ReportHistory')
          },
          {
            text: "OK",
            onPress: () => {
              setReportModalVisible(false);
              // Reset form after successful submission
              setImage(null);
              setDetected([]);
              setClassification(null);
              setDetectionCompleted(false);
              setWasteComposition({});
              setMaterialBreakdown({});
              setRecyclingTips([]);
            }
          }
        ]
      );
    }
  }, [success]);

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for better reporting.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation({
        coordinates: {
          lat: location.coords.latitude,
          lng: location.coords.longitude
        }
      });

      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (address[0]) {
        const city = address[0].city || '';
        const region = address[0].region || '';
        const country = address[0].country || '';
        setManualLocation([city, region, country].filter(Boolean).join(', '));
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const pickImage = async (fromCamera = false) => {
    let permissionResult = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "You need to grant permission first.");
      return;
    }

    const pickerResult = fromCamera
      ? await ImagePicker.launchCameraAsync({
          quality: 1,
          allowsEditing: true,
          aspect: [4, 3],
        })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 1,
          allowsEditing: true,
          aspect: [4, 3],
        });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
      setDetected([]);
      setClassification(null);
      setWasteComposition({});
      setMaterialBreakdown({});
      setRecyclingTips([]);
      setDetectionCompleted(false);
    }
  };

  const handleDetect = async () => {
    if (!image) {
      Alert.alert("No image", "Please select or capture an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", {
      uri: image,
      name: "waste.jpg",
      type: "image/jpeg",
    });

    try {
      setLoading(true);
      setDetectionCompleted(false);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
        "🎉 Analysis Complete!",
        `We've successfully analyzed your waste image!\n\n📊 Detection Results:\n• ${detectionData.detected_objects?.length || 0} objects detected\n• Primary classification: ${detectionData.classification}\n• Analysis confidence: ${detectionData.classification_confidence}%\n\nWould you like to save this report to your history?`,
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
      console.error("Detection error:", err);
      Alert.alert(
        "❌ Detection Error", 
        "Failed to analyze waste image. Please check your connection and try again."
      );
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

    const reportData = {
      image: image,
      detected_objects: detected || [],
      classification: classification || "Unknown",
      classification_confidence: classificationConfidence || 0,
      waste_composition: wasteComposition || {},
      material_breakdown: materialBreakdown || {},
      recycling_tips: recyclingTips || [],
      location: {
        address: manualLocation,
        coordinates: location?.coordinates
      }
    };

    dispatch(createWasteReport(reportData));
    setReportModalVisible(false);
  };

  const getClassificationColor = (classification) => {
    const colors = {
      "Recycling": "#2E8B57",
      "Organic": "#FF8C00",
      "General": "#DC143C",
      "Hazardous": "#8B0000",
      "Unknown": "#696969"
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
      "unknown": "#B8B8B8"
    };
    return colors[material] || colors["unknown"];
  };

  const formatPercentage = (value) => {
    return typeof value === 'number' ? `${value}%` : '0%';
  };

  const viewReportHistory = () => {
    navigation.navigate('ReportHistory');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>♻️ AI Waste Analysis</Text>
      <Text style={styles.subtitle}>Smart waste detection and classification</Text>

      {/* User Info */}
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>👤 Logged in as: {user.email}</Text>
        </View>
      )}

      {/* Location Input */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>📍 Location Information</Text>
        <TextInput
          style={styles.locationInput}
          placeholder="Enter location or use auto-detected"
          value={manualLocation}
          onChangeText={setManualLocation}
        />
        <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
          <Text style={styles.locationButtonText}>📍 Use Current Location</Text>
        </TouchableOpacity>
      </View>

      {/* Image Selection Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.cameraButton]} 
          onPress={() => pickImage(true)}
        >
          <Text style={styles.buttonText}>📸 Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.galleryButton]} 
          onPress={() => pickImage(false)}
        >
          <Text style={styles.buttonText}>🖼️ Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Report History Button */}
      <TouchableOpacity 
        style={[styles.actionButton, styles.historyButton]} 
        onPress={viewReportHistory}
      >
        <Text style={styles.buttonText}>📊 View Report History</Text>
      </TouchableOpacity>

      {/* Image Preview with Detection Visualizations */}
      {image && (
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Selected Image</Text>
          <View
            style={styles.imageContainer}
            onLayout={(event) => {
              const layoutWidth = screenWidth * 0.9;
              Image.getSize(image, (imgWidth, imgHeight) => {
                const scaledHeight = (layoutWidth / imgWidth) * imgHeight;
                setImageSize({ width: layoutWidth, height: scaledHeight });
              });
            }}
          >
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: image }}
                style={[
                  styles.previewImage,
                  { width: imageSize.width, height: imageSize.height }
                ]}
                resizeMode="contain"
              />

              {/* Draw Bounding Boxes */}
              {detected.map((item, i) => {
                if (!item.box || !item.box.length) return null;
                const [x1, y1, x2, y2] = item.box;

                const left = x1 * imageSize.width;
                const top = y1 * imageSize.height;
                const boxWidth = (x2 - x1) * imageSize.width;
                const boxHeight = (y2 - y1) * imageSize.height;

                const borderColor = getClassificationColor(item.label);

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.boundingBox,
                      {
                        left,
                        top,
                        width: boxWidth,
                        height: boxHeight,
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
                        {item.label} ({item.confidence}%)
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Draw Circles for Detected Objects */}
              {detected.map((item, i) => {
                if (!item.box || !item.box.length) return null;
                const [x1, y1, x2, y2] = item.box;

                const centerX = ((x1 + x2) / 2) * imageSize.width;
                const centerY = ((y1 + y2) / 2) * imageSize.height;
                const radius = Math.min(
                  (x2 - x1) * imageSize.width * 0.3,
                  (y2 - y1) * imageSize.height * 0.3,
                  50
                );

                const circleColor = getClassificationColor(item.label);

                return (
                  <View
                    key={`circle-${i}`}
                    style={[
                      styles.detectionCircle,
                      {
                        left: centerX - radius,
                        top: centerY - radius,
                        width: radius * 2,
                        height: radius * 2,
                        borderColor: circleColor,
                        backgroundColor: circleColor + '20', // Add transparency
                      }
                    ]}
                  >
                    <View style={[styles.circleLabel, { backgroundColor: circleColor }]}>
                      <Text style={styles.circleLabelText}>
                        {item.label.split(' ')[0]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Detect Button */}
      {image && !detectionCompleted && (
        <View style={styles.detectSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0077b6" />
              <Text style={styles.loadingText}>🔄 Analyzing waste composition...</Text>
              <Text style={styles.loadingSubtext}>Detecting objects, materials, and classification</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.detectButton]} 
              onPress={handleDetect}
            >
              <Text style={styles.buttonText}>🔍 Analyze Waste Image</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Report Button - Only shows after detection */}
      {detectionCompleted && (
        <View style={styles.reportSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.reportButton]} 
            onPress={() => setReportModalVisible(true)}
          >
            <Text style={styles.buttonText}>📝 Save Analysis Report</Text>
          </TouchableOpacity>
          
          <Text style={styles.reportHint}>
            💡 Save this analysis to your personal report history
          </Text>
        </View>
      )}

      {/* Results Section */}
      {classification && (
        <View style={styles.resultsSection}>
          {/* Detection Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 Detection Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{detected.length}</Text>
                <Text style={styles.summaryLabel}>Objects Found</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{classificationConfidence}%</Text>
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
                Confidence: {classificationConfidence}%
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
                    {Math.round(confidence * 100)}%
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
                      Confidence: {item.confidence}% • Material: {item.material}
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
                  <Text style={styles.detailValue}>{selectedObject.confidence}%</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Material:</Text>
                  <Text style={styles.detailValue}>{selectedObject.material}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Area Coverage:</Text>
                  <Text style={styles.detailValue}>{selectedObject.area_percentage}%</Text>
                </View>
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