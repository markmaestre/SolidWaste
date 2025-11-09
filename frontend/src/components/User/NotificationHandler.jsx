import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getNotifications, addNotification } from '../../redux/slices/notificationSlice';
import notificationService from '../../services/notificationService';
import { useFocusEffect } from '@react-navigation/native';

const NotificationHandler = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const socketRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadNotifications();
        setupRealTimeNotifications();
      }

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }, [user])
  );

  const loadNotifications = async () => {
    try {
      await dispatch(getNotifications()).unwrap();
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const setupRealTimeNotifications = () => {
   
    console.log('Real-time notifications setup for user:', user?.id);
  };

  return null; 
};

export default NotificationHandler;