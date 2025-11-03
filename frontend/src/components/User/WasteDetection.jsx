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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { styles } from "../../components/Styles/WasteDetection";

const API_URL = "http://192.168.1.46:5000/detect"; // your Flask backend
const { width: screenWidth } = Dimensions.get("window");

const WasteDetection = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [detected, setDetected] = useState([]);
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

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
        })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 1,
          allowsEditing: true,
        });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
      setDetected([]);
      setClassification(null);
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
      });

      setDetected(res.data.detected_objects || []);
      setClassification(res.data.classification || "Unknown");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to detect waste.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>♻️ Solid Waste Detection</Text>

      {/* Buttons for camera and gallery */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}>
        <Button title="📸 Use Camera" onPress={() => pickImage(true)} />
        <Button title="🖼️ Pick from Gallery" onPress={() => pickImage(false)} />
      </View>

      {/* Image Preview with Bounding Boxes */}
      {image && (
        <View
          style={{ marginTop: 20, alignItems: "center" }}
          onLayout={(event) => {
            const layoutWidth = screenWidth * 0.9;
            Image.getSize(image, (imgWidth, imgHeight) => {
              const scaledHeight = (layoutWidth / imgWidth) * imgHeight;
              setImageSize({ width: layoutWidth, height: scaledHeight });
            });
          }}
        >
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: image }}
              style={{
                width: imageSize.width,
                height: imageSize.height,
                borderRadius: 10,
              }}
              resizeMode="contain"
            />

            {/* Draw YOLO Bounding Boxes */}
            {detected.map((item, i) => {
              if (!item.box.length) return null;
              const [x1, y1, x2, y2] = item.box;

              const left = x1 * imageSize.width;
              const top = y1 * imageSize.height;
              const boxWidth = (x2 - x1) * imageSize.width;
              const boxHeight = (y2 - y1) * imageSize.height;

              // Color by classification
              let borderColor = "#00FF00";
              if (classification === "General") borderColor = "#FF0000";
              else if (classification === "Organic") borderColor = "#FFA500";

              return (
                <View
                  key={i}
                  style={{
                    position: "absolute",
                    left,
                    top,
                    width: boxWidth,
                    height: boxHeight,
                    borderWidth: 2,
                    borderColor,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    style={{
                      backgroundColor: "rgba(0,0,0,0.6)",
                      color: "white",
                      fontSize: 12,
                      paddingHorizontal: 4,
                    }}
                  >
                    {item.label} ({item.confidence}%)
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Detect Button / Loader */}
      {loading ? (
        <ActivityIndicator size="large" color="#0077b6" style={{ marginTop: 20 }} />
      ) : (
        image && <Button title="Detect Waste" onPress={handleDetect} color="#00b4d8" />
      )}

      {/* Result Section */}
      {classification && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Detection Result:</Text>
          <Text
            style={[
              styles.classification,
              classification.includes("Recycling")
                ? styles.recyclable
                : styles.nonRecyclable,
            ]}
          >
            {classification}
          </Text>

          {detected.length > 0 && (
            <>
              <Text style={styles.detectedTitle}>Detected Objects:</Text>
              {detected.map((item, i) => (
                <Text key={i} style={styles.detectedItem}>
                  • {item.label} ({item.confidence}%)
                </Text>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};

export default WasteDetection;
