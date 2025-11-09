import React, { useEffect, useRef } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { Provider, useDispatch } from 'react-redux';
import store from "./src/redux/store/store";
import Navigator from "./src/navigation/Navigator";
import * as Notifications from 'expo-notifications';
import { initializeNotifications } from "./src/redux/slices/notificationSlice";

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Create a navigation reference
const navigationRef = React.createRef();

// Component to handle notification setup with navigation
const NotificationHandler = () => {
  const dispatch = useDispatch();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Initialize notifications
    dispatch(initializeNotifications());

    // Listen for notifications in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📢 Notification received:', notification);
    });

    // Handle notification taps - navigate to appropriate screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { data } = response.notification.request.content;
      console.log('👆 Notification tapped with data:', data);
      
      // Navigate based on notification data
      if (navigationRef.current && data?.screen) {
        console.log(`🔄 Navigating to: ${data.screen}`, data.params);
        navigationRef.current.navigate(data.screen, data.params);
      }
    });

    // Cleanup
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [dispatch]);

  return null;
};

// Main App component
const AppContent = () => {
  return (
    <>
      <NotificationHandler />
      <Navigator />
    </>
  );
};

// Root App component
const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer ref={navigationRef}>
        <AppContent />
      </NavigationContainer>
    </Provider>
  );
};

export default App;