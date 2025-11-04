import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { styles } from "../../components/Styles/WasteDetection";

const API_URL = "http://192.168.1.46:5000/detect";
const { width: screenWidth } = Dimensions.get("window");

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

  // Function to pick or capture image
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
    }
  };

  // Function to detect waste
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
      const res = await axios.post(API_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      setDetected(res.data.detected_objects || []);
      setClassification(res.data.classification || "Unknown");
      setClassificationConfidence(res.data.classification_confidence || 0);
      setWasteComposition(res.data.waste_composition || {});
      setMaterialBreakdown(res.data.material_breakdown || {});
      setRecyclingTips(res.data.recycling_tips || []);
    } catch (err) {
      console.error("Detection error:", err);
      Alert.alert(
        "Detection Error", 
        err.response?.data?.error || "Failed to analyze waste image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Get color based on classification
  const getClassificationColor = (classification) => {
    const colors = {
      "Recycling": "#2E8B57", // Green
      "Organic": "#FF8C00",   // Orange
      "General": "#DC143C",   // Red
      "Hazardous": "#8B0000", // Dark Red
      "Unknown": "#696969"    // Gray
    };
    return colors[classification] || colors["Unknown"];
  };

  // Get color based on material
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

  // Format percentage for display
  const formatPercentage = (value) => {
    return typeof value === 'number' ? `${value}%` : '0%';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>♻️ AI Waste Analysis</Text>
      <Text style={styles.subtitle}>Smart waste detection and classification</Text>

      {/* Image Selection Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.cameraButton]} 
          onPress={() => pickImage(true)}
        >
          <Text style={styles.buttonText}>📸 Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.galleryButton]} 
          onPress={() => pickImage(false)}
        >
          <Text style={styles.buttonText}>🖼️ Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview with Bounding Boxes */}
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
                if (!item.box.length) return null;
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
            </View>
          </View>
        </View>
      )}

      {/* Detect Button / Loader */}
      {image && (
        <View style={styles.detectSection}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0077b6" />
              <Text style={styles.loadingText}>Analyzing waste composition...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.detectButton]} 
              onPress={handleDetect}
            >
              <Text style={styles.buttonText}>🔍 Analyze Waste</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Results Section */}
      {classification && (
        <View style={styles.resultsSection}>
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