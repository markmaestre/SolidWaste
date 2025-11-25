import React from "react";
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import store from "./src/redux/store/store";
import Navigator from "./src/navigation/Navigator";
import { LogBox } from "react-native";

// Ignore Expo notifications warnings temporarily
LogBox.ignoreLogs([
  'expo-notifications',
  'Remote notifications are not supported in Expo Go',
]);

// Optional: hide all warnings (not recommended in dev)
// LogBox.ignoreAllLogs(true);

/* ------------------------------
  TEMPORARILY DISABLED NOTIFICATIONS
  Uncomment when using a development build
------------------------------ */
// import * as Notifications from 'expo-notifications';
// import { useEffect, useRef } from "react";
// import { useDispatch } from "react-redux";
// import { initializeNotifications } from "./src/redux/slices/notificationSlice";

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

// const NotificationHandler = () => {
//   const dispatch = useDispatch();
//   const notificationListener = useRef();
//   const responseListener = useRef();

//   useEffect(() => {
//     dispatch(initializeNotifications());

//     notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
//       console.log('📢 Notification received:', notification);
//     });

//     responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
//       const { data } = response.notification.request.content;
//       console.log('👆 Notification tapped with data:', data);

//       if (navigationRef.current && data?.screen) {
//         console.log(`🔄 Navigating to: ${data.screen}`, data.params);
//         navigationRef.current.navigate(data.screen, data.params);
//       }
//     });

//     return () => {
//       if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
//       if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
//     };
//   }, [dispatch]);

//   return null;
// };

const AppContent = () => {
  return (
    <>
      {/* <NotificationHandler /> */}
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
