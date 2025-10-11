import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import store from "../redux/store/store";

import Dashboard from '../components/Dashboard/Home';
import Login from '../components/Dashboard/Login'; 
import Register from '../components/Dashboard/Register';
import UserDashboard from '../components/User/UserDashboard ';
import EditProfile from '../components/User/EditProfile';


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

      </Stack.Navigator>
    </Provider>
  );
};

export default Navigator;