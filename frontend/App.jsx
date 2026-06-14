import React, { useState } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import store from "./src/redux/store/store";
import Navigator from "./src/navigation/Navigator";
import { LogBox, View } from "react-native";
import SplashAnimationScreen from "@/components/SplashAnimationScreen";
import NotificationHandler from "./src/components/User/NotificationHandler";

LogBox.ignoreLogs([
  // Your current errors
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported',
  'react-native-vision-camera not available',
  'react-native-fast-tflite not available',
  'listener is not a function',
  
  // Additional common ones for your app
  'rejected',
  'unwrap',
  'loginUser',
  'AsyncStorage',
  'useFocusEffect',
  'The action NAVIGATE was not handled',
  'WebSocket connection failed',
  'socket.io: Connection error',
  'Animated: `useNativeDriver` was not specified',
  'VirtualizedList: Missing keys for items',
  'Possible Unhandled Promise Rejection',
  'Network request failed',
  'Expo: Native module unavailable',
  'Firestore: Unavailable',
  'Gesture handler: Could not find',
  'Reanimated: Failed to create worklet',
  'Vector Icons: Failed to load font',
  'Permissions: Permission denied',
  'Image: Could not load source',
]);

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashAnimationScreen onFinish={() => setShowSplash(false)} />
    );
  }

  return (
    <>
      <NotificationHandler /> {/* Add this component */}
      <Navigator />
    </>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </Provider>
  );
};

export default App;