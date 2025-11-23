  import React from 'react';
  import { createStackNavigator } from '@react-navigation/stack';
  import { Provider } from 'react-redux';
  import store from "../redux/store/store";

  import Dashboard from '../components/Dashboard/Home';
  import Login from '../components/Dashboard/Login'; 
  import Register from '../components/Dashboard/Register';
  import UserDashboard from '../components/User/UserDashboard ';
  import EditProfile from '../components/User/EditProfile';
  import FeedbackSupport from '../components/User/FeedbackSupport';
  import WasteDetection from '../components/User/WasteDetection';
  import ReportHistory from '../components/User/ReportHistory';
  import Maps from '../components/User/Maps';   
  import NotificationHandler from '../components/User/NotificationHandler';
  import NotificationsScreen from '../components/User/NotificationsScreen';
  import MessageList from '../components/User/MessageList';
  import ChatScreen from '../components/User/ChatScreen';
  import Learning from '../components/User/Learning';
  import WasteAnalytics from '../components/User/WasteAnalytics';

  const Stack = createStackNavigator();

  const screenOptions = {
    headerStyle: {
      backgroundColor: '#2196F3',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerShown: false, 
  };

  const Navigator = () => {
    return (
      <Provider store={store}>
        <Stack.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
      
          <Stack.Screen name="UserDashboard" component={UserDashboard} />
          <Stack.Screen name="EditProfile" component={EditProfile} />
          <Stack.Screen name="FeedbackSupport" component={FeedbackSupport} />
          <Stack.Screen name="WasteDetection" component={WasteDetection} />
          <Stack.Screen name="ReportHistory" component={ReportHistory} />
          <Stack.Screen name="Maps" component={Maps} /> 
          <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
          <Stack.Screen name="NotificationHandler" component={NotificationHandler} />
          <Stack.Screen name="MessageList" component={MessageList} />
          <Stack.Screen name="ChatScreen" component={ChatScreen} />
          <Stack.Screen name="Learning" component={Learning} />
          <Stack.Screen name="WasteAnalytics" component={WasteAnalytics} />

        </Stack.Navigator>
      </Provider>
    );
  };

  export default Navigator;