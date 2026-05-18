import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Asset } from 'expo-asset';


let Camera = null;
let useCameraDevice = null;
let useCameraPermission = null;
let useFrameProcessor = null;
let runOnJS = null;
let loadTensorflowModel = null;

try {
  const vc = require('react-native-vision-camera');
  Camera = vc.Camera;
  useCameraDevice = vc.useCameraDevice;
  useCameraPermission = vc.useCameraPermission;
  useFrameProcessor = vc.useFrameProcessor;
  runOnJS = vc.runOnJS;
} catch (e) {
  console.log('[LiveDetector] react-native-vision-camera not available:', e.message);
}

try {
  const tfl = require('react-native-fast-tflite');
  loadTensorflowModel = tfl.loadTensorflowModel;
} catch (e) {
  console.log('[LiveDetector] react-native-fast-tflite not available:', e.message);
}

const { width } = Dimensions.get('window');

// ─── Detect Expo Go ───────────────────────────────────────────────────────────
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

// ─── Your 11 labels — index order must match your best.tflite output ─────────
const LABELS = [
  'Battery',        // 0  → S - Special Waste
  'Bottle',         // 1  → A - Recyclable
  'Bulb',           // 2  → S - Special Waste
  'Can',            // 3  → A - Recyclable
  'Carton',         // 4  → A - Recyclable
  'Cup',            // 5  → A - Recyclable
  'Glass Bottle',   // 6  → A - Recyclable
  'Organic',        // 7  → C - Compostable
  'Paper',          // 8  → A - Recyclable
  'Plastic',        // 9  → A - Recyclable
  'Plastic Bottle', // 10 → A - Recyclable
];

// ─── Category info per label ──────────────────────────────────────────────────
const getCategoryInfo = (label = '') => {
  switch (label) {
    case 'Battery':
    case 'Bulb':
      return {
        category: 'S - Special Waste',
        color: '#BF360C',
        bgColor: '#BF360C22',
        emoji: '☣️',
        howToDispose: 'Do NOT throw in regular trash. Bring to barangay e-waste drop-off point.',
      };
    case 'Organic':
      return {
        category: 'C - Compostable',
        color: '#F57C00',
        bgColor: '#F57C0022',
        emoji: '🌿',
        howToDispose: 'Place in compost bin. Mix with dry leaves or soil.',
      };
    case 'Bottle':
    case 'Can':
    case 'Carton':
    case 'Cup':
    case 'Glass Bottle':
    case 'Paper':
    case 'Plastic':
    case 'Plastic Bottle':
      return {
        category: 'A - Recyclable',
        color: '#2E7D32',
        bgColor: '#2E7D3222',
        emoji: '♻️',
        howToDispose: 'Rinse clean, remove caps/labels, flatten if possible. Place in recycling bin.',
      };
    default:
      return {
        category: 'W - Residual Waste',
        color: '#757575',
        bgColor: '#75757522',
        emoji: '🗑️',
        howToDispose: 'Place in black trash bag for landfill disposal.',
      };
  }
};

const CONFIDENCE_THRESHOLD = 0.50;
const SCAN_FRAME_SIZE = width * 0.68;

// ─────────────────────────────────────────────────────────────────────────────
// Root export — always calls hooks (Rules of Hooks), gates on isExpoGo for UI
// ─────────────────────────────────────────────────────────────────────────────
export default function LiveWasteDetector({ navigation }) {
  const permHook = useCameraPermission
    ? useCameraPermission()
    : { hasPermission: false, requestPermission: async () => {} };
  const { hasPermission, requestPermission } = permHook;
  const device = useCameraDevice ? useCameraDevice('back') : null;

  if (isExpoGo || !Camera || !loadTensorflowModel) {
    return <ExpoGoFallback navigation={navigation} />;
  }

  return (
    <LiveDetectorInner
      navigation={navigation}
      hasPermission={hasPermission}
      requestPermission={requestPermission}
      device={device}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback UI shown in Expo Go
// ─────────────────────────────────────────────────────────────────────────────
function ExpoGoFallback({ navigation }) {
  useEffect(() => {
    Alert.alert(
      'Development Build Required',
      'Live waste detection uses native camera + AI modules not available in Expo Go.\n\nCreate a development build to use this feature.',
      [
        { text: 'OK' },
        {
          text: 'Learn More',
          onPress: () =>
            Linking.openURL('https://docs.expo.dev/development/create-development-builds/'),
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.fallbackContainer}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.fallbackCard}>
        <Text style={styles.fallbackEmoji}>⚠️</Text>
        <Text style={styles.fallbackTitle}>Feature Unavailable</Text>
        <Text style={styles.fallbackMessage}>
          Live waste detection requires a development build with native camera and AI modules.
        </Text>
        <Text style={styles.fallbackSubtitle}>Run one of these commands:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>npx expo run:android</Text>
          <Text style={styles.codeOr}>── or ──</Text>
          <Text style={styles.codeText}>npx expo run:ios</Text>
        </View>
        {navigation && (
          <TouchableOpacity style={styles.fallbackBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.fallbackBackText}>← Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main detector UI — only rendered in a proper dev/prod build
// ─────────────────────────────────────────────────────────────────────────────
function LiveDetectorInner({ navigation, hasPermission, requestPermission, device }) {
  const [model, setModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [result, setResult] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const lastFpsTime = useRef(Date.now());

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, []);

  // Load TFLite model on mount
  useEffect(() => {
    initModel();
  }, []);

  const initModel = async () => {
    try {
      setModelLoading(true);
      setModelError(null);

      const [asset] = await Asset.loadAsync(require('../assets/models/best.tflite'));
      const modelUri = asset.localUri || asset.uri;

      console.log('📦 Loading TFLite model:', modelUri);
      const m = await loadTensorflowModel({ url: modelUri });
      setModel(m);
      console.log('✅ Model loaded. Inputs:', m.inputs, '| Outputs:', m.outputs);
    } catch (err) {
      console.error('❌ Model load failed:', err);
      setModelError(err.message || 'Failed to load AI model');
    } finally {
      setModelLoading(false);
    }
  };

  // Called from worklet thread via runOnJS
  const handleDetection = useCallback((labelIndex, confidence) => {
    // FPS tracking
    frameCount.current += 1;
    const now = Date.now();
    if (now - lastFpsTime.current >= 1000) {
      setFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = now;
    }

    if (confidence < CONFIDENCE_THRESHOLD || labelIndex < 0 || labelIndex >= LABELS.length) {
      setResult(null);
      return;
    }

    const label = LABELS[labelIndex];
    setResult({ label, confidence, ...getCategoryInfo(label) });
  }, []);

  // Frame processor — runs as a worklet on the camera thread
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!model) return;
    try {
      const outputs = model.runSync([frame]);
      const scores = outputs[0];

      let maxScore = 0;
      let maxIndex = -1;
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
          maxScore = scores[i];
          maxIndex = i;
        }
      }
      runOnJS(handleDetection)(maxIndex, maxScore);
    } catch (_) {
      // Skip bad frames silently
    }
  }, [model, handleDetection]);

  // ── Permission denied ──
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.permissionTitle}>📷 Camera Access Needed</Text>
        <Text style={styles.permissionMessage}>
          Please grant camera permission to use live waste detection.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        {navigation && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ── No device ──
  if (!device) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.permissionTitle}>📷 No Camera Found</Text>
        <Text style={styles.permissionMessage}>Could not find a back camera on this device.</Text>
        {navigation && (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ── Main view ──
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera feed */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        frameProcessor={frameProcessor}
        fps={5}
        onError={(error) => {
          console.error('Camera error:', error);
          Alert.alert('Camera Error', error.message);
        }}
      />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        {navigation && (
          <TouchableOpacity style={styles.topBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.topBackText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.topTitle}>Live Waste Detector</Text>
        <View style={styles.fpsTag}>
          <Text style={styles.fpsText}>{fps} fps</Text>
        </View>
      </SafeAreaView>

      {/* Scan frame guide */}
      <View style={styles.scanFrame}>
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
        <Text style={styles.scanHint}>Point camera at waste item</Text>
      </View>

      {/* Category legend */}
      <View style={styles.legend}>
        {[
          { label: 'W - Residual', color: '#757575' },
          { label: 'A - Recyclable', color: '#2E7D32' },
          { label: 'C - Compostable', color: '#F57C00' },
          { label: 'S - Special', color: '#BF360C' },
        ].map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Model loading overlay */}
      {modelLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading AI Model...</Text>
          <Text style={styles.loadingSubText}>
            best.tflite — {LABELS.length} waste classes
          </Text>
        </View>
      )}

      {/* Model error overlay */}
      {modelError && !modelLoading && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorEmoji}>❌</Text>
          <Text style={styles.errorTitle}>Model Load Failed</Text>
          <Text style={styles.errorMessage}>{modelError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={initModel}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detection result card */}
      {result && !modelLoading && (
        <View style={[styles.resultCard, { borderColor: result.color }]}>
          <View style={[styles.resultCardHeader, { backgroundColor: result.color }]}>
            <Text style={styles.resultEmoji}>{result.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultLabel}>{result.label}</Text>
              <Text style={styles.resultCategory}>{result.category}</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {(result.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
          <View style={[styles.resultCardBody, { backgroundColor: result.bgColor }]}>
            <Text style={styles.disposeLabel}>🗂 How to dispose:</Text>
            <Text style={styles.disposeText}>{result.howToDispose}</Text>
          </View>
        </View>
      )}

      {/* Scanning hint when no result */}
      {!result && !modelLoading && !modelError && (
        <View style={styles.noResultTag}>
          <Text style={styles.noResultText}>🔍 Scanning for waste items...</Text>
        </View>
      )}

      {/* Pause / Resume */}
      {!modelLoading && !modelError && (
        <TouchableOpacity
          style={styles.pauseBtn}
          onPress={() => setIsActive(prev => !prev)}
        >
          <Text style={styles.pauseBtnText}>{isActive ? '⏸  Pause' : '▶  Resume'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Fallback
  fallbackContainer: {
    flex: 1, backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  fallbackCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
  },
  fallbackEmoji: { fontSize: 56, marginBottom: 14 },
  fallbackTitle: { fontSize: 22, fontWeight: '800', color: '#212121', marginBottom: 10 },
  fallbackMessage: {
    fontSize: 14, color: '#607D8B', textAlign: 'center', lineHeight: 21, marginBottom: 20,
  },
  fallbackSubtitle: { fontSize: 13, fontWeight: '700', color: '#37474F', marginBottom: 10 },
  codeBlock: {
    backgroundColor: '#ECEFF1', borderRadius: 12, padding: 14,
    width: '100%', alignItems: 'center', marginBottom: 22,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13, color: '#1A237E', paddingVertical: 3,
  },
  codeOr: { fontSize: 12, color: '#90A4AE', marginVertical: 6 },
  fallbackBackBtn: {
    backgroundColor: '#1565C0', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
  },
  fallbackBackText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Permission / No device screens
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0A0A0A', padding: 30,
  },
  permissionTitle: {
    fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12, textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 14, color: '#90A4AE', textAlign: 'center', lineHeight: 21, marginBottom: 28,
  },
  permissionBtn: {
    backgroundColor: '#1565C0', paddingHorizontal: 32,
    paddingVertical: 13, borderRadius: 24, marginBottom: 14,
  },
  permissionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backBtn: { paddingVertical: 10 },
  backBtnText: { color: '#78909C', fontSize: 14 },

  // Camera container
  container: { flex: 1, backgroundColor: '#000' },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 4,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBackBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, marginRight: 10,
  },
  topBackText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  topTitle: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' },
  fpsTag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  fpsText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Scan frame
  scanFrame: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: SCAN_FRAME_SIZE, height: SCAN_FRAME_SIZE,
    marginTop: -SCAN_FRAME_SIZE / 2,
    marginLeft: -SCAN_FRAME_SIZE / 2,
    justifyContent: 'center', alignItems: 'center',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanHint: {
    color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500',
    position: 'absolute', bottom: -28, textAlign: 'center',
  },

  // Legend
  legend: {
    position: 'absolute', top: 90, right: 12,
    backgroundColor: 'rgba(0,0,0,0.60)',
    borderRadius: 12, padding: 10, gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 16 },
  loadingSubText: { color: '#90A4AE', fontSize: 12, marginTop: 6 },

  // Error overlay
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center', alignItems: 'center', padding: 30,
  },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorTitle: { color: '#EF5350', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorMessage: { color: '#90A4AE', fontSize: 13, textAlign: 'center', marginBottom: 24 },
  retryBtn: {
    backgroundColor: '#1565C0', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Result card
  resultCard: {
    position: 'absolute', bottom: 104, left: 16, right: 16,
    borderRadius: 18, overflow: 'hidden', borderWidth: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  resultCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  resultEmoji: { fontSize: 30 },
  resultLabel: { color: '#fff', fontSize: 18, fontWeight: '800' },
  resultCategory: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  confidenceBadge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  confidenceText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  resultCardBody: { paddingHorizontal: 16, paddingVertical: 12 },
  disposeLabel: { fontSize: 11, fontWeight: '700', color: '#37474F', marginBottom: 4 },
  disposeText: { fontSize: 12, color: '#37474F', lineHeight: 18 },

  // No result
  noResultTag: {
    position: 'absolute', bottom: 114,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.60)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  noResultText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Pause button
  pauseBtn: {
    position: 'absolute', bottom: 48, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 28, paddingVertical: 11, borderRadius: 24,
  },
  pauseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});