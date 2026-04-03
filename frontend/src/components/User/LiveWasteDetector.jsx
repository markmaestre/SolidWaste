import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';

// Check if running in Expo Go
const isExpoGo = Constants?.expoConfig?.name === 'Expo Go' || 
                 !Constants?.manifest?.extra?.expoClient?.isEAS;
                 
export default function LiveWasteDetector() {
  const [hasPermission, setHasPermission] = useState(false);
  const [model, setModel] = useState(null);
  const [result, setResult] = useState('Camera feature unavailable');
  const [isSupported, setIsSupported] = useState(true);

  const labels = ["Battery", "Bottle", "Can", "Glass", "Plastic", "Paper"];

  // Check Expo Go compatibility
  useEffect(() => {
    if (isExpoGo) {
      setIsSupported(false);
      setResult('⚠️ Live Camera Detection not available in Expo Go');
      
      // Show warning alert
      Alert.alert(
        'Feature Not Available',
        'Live waste detection requires a development build with custom native modules. This feature will not work in Expo Go.\n\nTo use this feature:\n1. Run `expo run:android` or `expo run:ios`\n2. Or use EAS Build for a custom development client',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Learn More', onPress: () => Linking.openURL('https://docs.expo.dev/development/create-development-builds/') }
        ]
      );
      return;
    }
    
    initCameraAndModel();
  }, []);

  const initCameraAndModel = async () => {
    try {
      // Request camera permission
      const { status } = await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
      
      if (status !== 'authorized') {
        setResult('Camera permission denied');
        return;
      }
      
      // Load TFLite model
      try {
        const m = await loadTensorflowModel(require('../assets/models/best.tflite'));
        console.log('Model loaded ✅');
        setModel(m);
        setResult('Ready to scan');
      } catch (err) {
        console.log('Model load error ❌', err);
        setResult('Model loading failed');
      }
    } catch (error) {
      console.log('Init error:', error);
      setResult('Initialization failed');
    }
  };

  // Process each frame (only if supported)
  const processFrame = (frame) => {
    'worklet';
    if (!model || !isSupported) return;

    try {
      const input = frame;
      const output = model.runSync([input]);
      const scores = output[0];

      let max = scores[0], index = 0;
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > max) { max = scores[i]; index = i; }
      }
      if (max > 0.5) { // Only update if confidence > 50%
        runOnJS(setResult)(labels[index]);
      }
    } catch (e) {
      console.log('Frame error', e);
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    processFrame(frame);
  }, [model]);

  // Fallback UI for Expo Go
  if (isExpoGo) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>Feature Not Available in Expo Go</Text>
          <Text style={styles.warningMessage}>
            Live waste detection requires custom native modules that are not supported in Expo Go.
          </Text>
          <Text style={styles.warningSubMessage}>
            To use this feature, you need to create a development build.
          </Text>
          <View style={styles.optionsContainer}>
            <Text style={styles.optionText}>📱 Run one of these commands:</Text>
            <Text style={styles.commandText}>expo run:android</Text>
            <Text style={styles.commandText}>expo run:ios</Text>
            <Text style={styles.orText}>OR</Text>
            <Text style={styles.commandText}>eas build --platform all --profile development</Text>
          </View>
        </View>
      </View>
    );
  }

  // Loading state
  if (!hasPermission || !device) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading Camera...</Text>
        {!hasPermission && hasPermission !== undefined && (
          <Text style={styles.permissionText}>Please grant camera permission</Text>
        )}
      </View>
    );
  }

  // Main camera view (only for development builds)
  return (
    <View style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={2}
        onError={(error) => console.log('Camera error:', error)}
      />
      <View style={styles.overlay}>
        <Text style={styles.resultText}>{result}</Text>
        {!model && result !== 'Ready to scan' && (
          <Text style={styles.loadingSubtext}>Loading model...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  warningCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    width: '100%',
  },
  warningIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  warningTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  warningMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  warningSubMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: '100%',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  commandText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#e0e0e0',
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
    color: '#2c3e50',
  },
  orText: {
    textAlign: 'center',
    marginVertical: 8,
    color: '#999',
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  resultText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingSubtext: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  permissionText: {
    color: '#ff6b6b',
    marginTop: 10,
  },
});

// Add Constants import at the top
import Constants from 'expo-constants';