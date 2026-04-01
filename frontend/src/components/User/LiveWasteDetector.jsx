import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { loadTensorflowModel } from 'react-native-fast-tflite';

export default function LiveWasteDetector() {
  const devices = useCameraDevices();
  const device = devices.back;

  const [hasPermission, setHasPermission] = useState(false);
  const [model, setModel] = useState(null);
  const [result, setResult] = useState('Scanning...');

  const labels = ["Battery", "Bottle", "Can", "Glass", "Plastic", "Paper"];

  // Camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'authorized');
    })();
  }, []);

  // Load TFLite model
  useEffect(() => {
    (async () => {
      try {
        const m = await loadTensorflowModel(require('../assets/models/best.tflite'));
        console.log('Model loaded ✅');
        setModel(m);
      } catch (err) {
        console.log('Model load error ❌', err);
      }
    })();
  }, []);

  // Process each frame
  const processFrame = (frame) => {
    'worklet';
    if (!model) return;

    try {
      const input = frame; // Vision Camera frame
      const output = model.runSync([input]);
      const scores = output[0];

      let max = scores[0], index = 0;
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > max) { max = scores[i]; index = i; }
      }
      runOnJS(setResult)(labels[index]);
    } catch (e) {
      console.log('Frame error', e);
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    processFrame(frame);
  }, [model]);

  if (!device || !hasPermission) return (
    <View style={styles.center}><Text>Loading Camera...</Text></View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        frameProcessorFps={2}
      />
      <View style={styles.overlay}>
        <Text style={styles.text}>{result}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 10,
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});