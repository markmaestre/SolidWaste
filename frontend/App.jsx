import React, { useState } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import store from "./src/redux/store/store";
import Navigator from "./src/navigation/Navigator";
import { LogBox } from "react-native";
import SplashAnimationScreen from "@/components/SplashAnimationScreen";

LogBox.ignoreLogs([
  'expo-notifications',
  'Remote notifications are not supported in Expo Go',
]);

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashAnimationScreen onFinish={() => setShowSplash(false)} />
    );
  }

  return <Navigator />;
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