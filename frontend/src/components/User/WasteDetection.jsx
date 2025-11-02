import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_URL = "http://192.168.1.46:5000/detect"; 
const WasteDetection = () => {
  const [image, setImage] = useState(null);
  const [detected, setDetected] = useState([]);
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "You need to grant permission to access your gallery.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri);
      setDetected([]);
      setClassification(null);
    }
  };

  const handleDetect = async () => {
    if (!image) {
      Alert.alert("No image", "Please select an image first.");
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
      <Text style={styles.title}>♻️ Solid Waste Detection</Text>

      <Button title="Pick an Image" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}

      {loading ? (
        <ActivityIndicator size="large" color="#0077b6" style={{ marginTop: 20 }} />
      ) : (
        image && <Button title="Detect Waste" onPress={handleDetect} color="#00b4d8" />
      )}

      {classification && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Detection Result:</Text>
          <Text
            style={[
              styles.classification,
              classification.includes("Recyclable") ? styles.recyclable : styles.nonRecyclable,
            ]}
          >
            {classification}
          </Text>

          {detected.length > 0 && (
            <>
              <Text style={styles.detectedTitle}>Detected Objects:</Text>
              {detected.map((item, i) => (
                <Text key={i} style={styles.detectedItem}>• {item}</Text>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#eaf8fc",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0077b6",
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 15,
    borderRadius: 10,
  },
  resultBox: {
    marginTop: 25,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#023e8a",
  },
  classification: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  recyclable: {
    backgroundColor: "#a8dadc",
    color: "#1b4332",
  },
  nonRecyclable: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },
  detectedTitle: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#0077b6",
  },
  detectedItem: {
    fontSize: 16,
    color: "#333",
    marginVertical: 2,
  },
});

export default WasteDetection;
