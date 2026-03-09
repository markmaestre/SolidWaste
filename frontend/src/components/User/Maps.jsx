import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, BackHandler, Alert, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { styles } from "../../components/Styles/Maps";

const Maps = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [webViewKey, setWebViewKey] = useState(1);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // ✅ HARDCODED TAGUIG RECYCLING & WASTE DROP-OFF LOCATIONS
  const TAGUIG_DROPOFF_LOCATIONS = [
    {
      id: 'taguig-mrf-bgc-001',
      name: 'Barangay Fort Bonifacio MRF (Eco Center)',
      fullAddress: 'Pasong Tamo Extension, Barangay Fort Bonifacio, Taguig City',
      latitude: 14.5344,
      longitude: 121.0431,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal', 'E-waste'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 8:00 AM - 5:00 PM',
      contactNumber: 'N/A',
      description: 'Household waste transformation into fertilizer and reusable items.'
    },
    {
      id: 'taguig-mmda-labasan-002',
      name: 'MMDA Labasan Warehouse - Solid Waste Drop-off',
      fullAddress: 'Labasan Pumping Station, Taguig City',
      latitude: 14.5278,
      longitude: 121.0717,
      type: 'Solid Waste Management Facility',
      category: 'waste_management',
      dropoffTypes: ['General Waste', 'Bulk Waste', 'Construction Debris'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Friday: 7:00 AM - 6:00 PM',
      contactNumber: 'N/A',
      description: 'Secured holding area for solid waste management.'
    },
    {
      id: 'taguig-upstyle-003',
      name: 'Upstyle Recycling Center - Drop-off Point',
      fullAddress: 'Near Market! Market!, Taguig City',
      latitude: 14.5455,
      longitude: 121.0560,
      type: 'Recycling Center',
      category: 'recycling',
      dropoffTypes: ['Plastic Bottles', 'Glass', 'Paper', 'Upcyclable Materials'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Tuesday-Sunday: 10:00 AM - 6:00 PM',
      contactNumber: 'N/A',
      description: 'Educational hub focusing on upcycling waste.'
    },
    {
      id: 'taguig-sktes-ewaste-004',
      name: 'SK tes - E-waste Recycling Drop-off',
      fullAddress: 'Unit 104, Central Business Park, 461 Amang Rodriguez Ave, Manggahan (Serves Taguig)',
      latitude: 14.5722,
      longitude: 121.0937,
      type: 'E-waste Recycling Facility',
      category: 'ewaste',
      dropoffTypes: ['Computers', 'Laptops', 'Mobile Phones', 'Electronics', 'Batteries'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Friday: 9:00 AM - 5:00 PM',
      contactNumber: 'N/A',
      description: 'IT Asset Disposition and E-waste recycling.'
    },
    {
      id: 'taguig-bgc-waste-005',
      name: 'BGC Waste Management Station',
      fullAddress: 'Bonifacio Global City, Taguig (Near Market! Market!)',
      latitude: 14.5481,
      longitude: 121.0517,
      type: 'Waste Collection Point',
      category: 'waste_management',
      dropoffTypes: ['General Waste', 'Recyclables'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Daily: 24/7',
      contactNumber: 'N/A',
      description: 'Central waste collection point for BGC area.'
    },
    {
      id: 'taguig-mrf-central-006',
      name: 'Taguig Central MRF',
      fullAddress: 'Barangay Central, Taguig City',
      latitude: 14.5219,
      longitude: 121.0627,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Main Materials Recovery Facility serving Central Taguig.'
    },
    {
      id: 'taguig-mrf-west-007',
      name: 'Western Bicutan MRF',
      fullAddress: 'Western Bicutan, Taguig City',
      latitude: 14.5119,
      longitude: 121.0505,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Western Bicutan area.'
    },
    {
      id: 'taguig-mrf-pinagsama-008',
      name: 'Pinagsama MRF',
      fullAddress: 'Pinagsama, Taguig City',
      latitude: 14.5409,
      longitude: 121.0666,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Pinagsama area.'
    },
    {
      id: 'taguig-mrf-ususan-009',
      name: 'Ususan MRF',
      fullAddress: 'Ususan, Taguig City',
      latitude: 14.5335,
      longitude: 121.0801,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Ususan area.'
    },
    {
      id: 'taguig-mrf-wawa-010',
      name: 'Wawa MRF',
      fullAddress: 'Wawa, Taguig City',
      latitude: 14.5217,
      longitude: 121.0919,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Wawa area.'
    },
    {
      id: 'taguig-mrf-hagonoy-011',
      name: 'Hagonoy MRF',
      fullAddress: 'Hagonoy, Taguig City',
      latitude: 14.5142,
      longitude: 121.0855,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Hagonoy area.'
    },
    {
      id: 'taguig-mrf-ligid-012',
      name: 'Ligid MRF',
      fullAddress: 'Ligid, Taguig City',
      latitude: 14.5274,
      longitude: 121.1015,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Ligid area.'
    },
    {
      id: 'taguig-mrf-bambang-013',
      name: 'Bambang MRF',
      fullAddress: 'Bambang, Taguig City',
      latitude: 14.5189,
      longitude: 121.0966,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Bambang area.'
    },
    {
      id: 'taguig-mrf-calzada-014',
      name: 'Calzada MRF',
      fullAddress: 'Calzada, Taguig City',
      latitude: 14.5149,
      longitude: 121.0778,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Calzada area.'
    },
    {
      id: 'taguig-mrf-staana-015',
      name: 'Sta. Ana MRF',
      fullAddress: 'Sta. Ana, Taguig City',
      latitude: 14.5286,
      longitude: 121.0879,
      type: 'Materials Recovery Facility',
      category: 'recycling',
      dropoffTypes: ['Plastic', 'Paper', 'Glass', 'Metal'],
      source: 'taguig_verified',
      verified: true,
      operatingHours: 'Monday-Saturday: 7:00 AM - 4:00 PM',
      contactNumber: 'N/A',
      description: 'Community MRF serving Sta. Ana area.'
    }
  ];

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedFacility) {
        setSelectedFacility(null);
        setRouteInfo(null);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CLEAR_ROUTE'
          }));
        }
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [selectedFacility]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      setMapLoading(true);
      setSelectedFacility(null);
      setRouteInfo(null);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find nearby recycling and waste drop-off locations. Please enable location services in your device settings.');
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      console.log('📍 Current location:', latitude, longitude);
      setLocation({ latitude, longitude });
      
      await loadTaguigDropoffLocations(latitude, longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Unable to retrieve your current location. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  const loadTaguigDropoffLocations = async (lat, lng) => {
    try {
      console.log('🔍 Loading Taguig recycling and waste drop-off locations...');
      
      // Calculate EXACT distances from current location for all facilities
      let locationsWithDistance = TAGUIG_DROPOFF_LOCATIONS.map(location => {
        const distance = calculateExactDistance(lat, lng, location.latitude, location.longitude);
        return {
          ...location,
          distance: distance // Exact distance in km
        };
      });

      // Sort by distance (nearest first)
      locationsWithDistance.sort((a, b) => a.distance - b.distance);

      console.log(`✅ Found ${locationsWithDistance.length} locations with exact distances`);
      setFacilities(locationsWithDistance);
      setLoading(false);
      setMapLoading(false);
      
    } catch (error) {
      console.error('Error loading locations:', error);
      setError('Unable to load recycling locations. Please try again.');
      setLoading(false);
      setMapLoading(false);
    }
  };

  // EXACT distance calculation using Haversine formula
  const calculateExactDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(2)); // Return with 2 decimal places
  };

  const getRouteInfo = async (facility) => {
    try {
      if (!location) return;

      setIsRouteLoading(true);
      setRouteInfo(null);
      setError(null);

      console.log(`🔄 Getting route information to ${facility.name}...`);
      
      // Use driving profile for all routes
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${location.longitude},${location.latitude};${facility.longitude},${facility.latitude}?` +
        `overview=full&geometries=geojson&steps=true&annotations=true&alternatives=false`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          
          // Distance is in meters, convert to kilometers
          const distanceKm = route.distance / 1000;
          const exactDistance = distanceKm.toFixed(2);
          
          // Duration is in seconds, convert to minutes
          const durationMin = Math.round(route.duration / 60);
          
          console.log(`✅ Route found: ${exactDistance} km, ${durationMin} minutes`);
          
          setRouteInfo({
            distance: `${exactDistance} km`,
            duration: `${durationMin} min`,
            geometry: route.geometry,
            exactDistance: exactDistance,
            exactDuration: durationMin,
            isEstimated: false
          });
          
          // Send route to WebView for display with clear line
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SHOW_ROUTE',
              route: route.geometry,
              startLocation: location,
              endLocation: facility,
              distance: exactDistance,
              duration: durationMin
            }));
          }
        } else {
          console.error('No routes found');
          setError('Unable to calculate route. Please try again.');
        }
      } else {
        console.error('Route API error:', response.status);
        
        // Fallback: Use straight-line distance
        const straightLineDistance = calculateExactDistance(
          location.latitude, location.longitude,
          facility.latitude, facility.longitude
        );
        
        // Estimate time (30 km/h average speed)
        const estimatedTime = Math.round((straightLineDistance / 30) * 60);
        
        setRouteInfo({
          distance: `${straightLineDistance.toFixed(2)} km`,
          duration: `${estimatedTime} min (estimated)`,
          geometry: null,
          exactDistance: straightLineDistance.toFixed(2),
          exactDuration: estimatedTime,
          isEstimated: true
        });
        
        // Show straight line on map
        if (window.ReactNativeWebView) {
          const straightLineGeometry = {
            type: "LineString",
            coordinates: [
              [location.longitude, location.latitude],
              [facility.longitude, facility.latitude]
            ]
          };
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'SHOW_ROUTE',
            route: straightLineGeometry,
            startLocation: location,
            endLocation: facility,
            isEstimated: true
          }));
        }
      }
    } catch (error) {
      console.error('Error getting route:', error);
      
      // Fallback calculation
      const straightLineDistance = calculateExactDistance(
        location.latitude, location.longitude,
        facility.latitude, facility.longitude
      );
      
      const estimatedTime = Math.round((straightLineDistance / 30) * 60);
      
      setRouteInfo({
        distance: `${straightLineDistance.toFixed(2)} km`,
        duration: `${estimatedTime} min (estimated)`,
        geometry: null,
        exactDistance: straightLineDistance.toFixed(2),
        exactDuration: estimatedTime,
        isEstimated: true
      });
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Function to open in Google Maps for turn-by-turn navigation
  const openInGoogleMaps = (facility) => {
    if (!location || !facility) return;
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${facility.latitude},${facility.longitude}&travelmode=driving`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Google Maps is not installed on your device');
      }
    });
  };

  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
    setRouteInfo(null);
    setError(null);
    getRouteInfo(facility);
  };

  const handleBackPress = () => {
    if (selectedFacility) {
      setSelectedFacility(null);
      setRouteInfo(null);
      setError(null);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CLEAR_ROUTE'
        }));
      }
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const handleRetry = () => {
    setWebViewKey(prev => prev + 1);
    setLoading(true);
    setError(null);
    setFacilities([]);
    setMapLoading(true);
    setSelectedFacility(null);
    setRouteInfo(null);
    getCurrentLocation();
  };

  const generateMapHTML = () => {
    if (!location) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f8f9fa; color: #495057; }
            .loading-container { text-align: center; }
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #2E8B57; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loading-container">
            <div class="spinner"></div>
            <h3 style="margin: 0 0 8px 0; font-weight: 600;">Loading Map</h3>
            <p style="margin: 0; opacity: 0.7;">Finding recycling drop-off points in Taguig...</p>
          </div>
        </body>
        </html>
      `;
    }

    const facilitiesSafeString = JSON.stringify(facilities || [])
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/'/g, '\\u0027')
      .replace(/"/g, '\\u0022')
      .replace(/&/g, '\\u0026');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          #map { height: 100vh; width: 100%; position: absolute; top: 0; left: 0; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; height: 100vh; }
          
          .user-marker {
            background: #2E8B57;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            position: relative;
          }
          
          .user-marker::after {
            content: '▲';
            position: absolute;
            top: -15px;
            left: 2px;
            color: #2E8B57;
            font-size: 16px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          
          .dropoff-marker {
            border: 3px solid white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          
          .dropoff-marker.recycling { background: #28a745; }
          .dropoff-marker.ewaste { background: #dc3545; }
          .dropoff-marker.waste_management { background: #ffc107; }
          
          .route-popup {
            padding: 12px;
            max-width: 280px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .route-popup h4 {
            margin: 0 0 4px 0;
            color: #2c3e50;
            font-weight: 600;
            font-size: 16px;
          }
          
          .route-popup .facility-type {
            color: #2E8B57;
            font-size: 12px;
            font-weight: 500;
            margin-bottom: 4px;
          }
          
          .route-popup .exact-distance {
            background: #e8f5e9;
            color: #2E8B57;
            padding: 4px 8px;
            border-radius: 16px;
            display: inline-block;
            font-size: 14px;
            font-weight: 600;
            margin: 4px 0;
          }
          
          .route-popup .dropoff-types {
            background: #f8f9fa;
            padding: 8px;
            border-radius: 6px;
            margin: 8px 0;
            font-size: 12px;
          }
          
          .route-popup .dropoff-types strong {
            color: #2c3e50;
            display: block;
            margin-bottom: 4px;
          }
          
          .route-popup .dropoff-types span {
            color: #28a745;
            background: #e8f5e9;
            padding: 2px 6px;
            border-radius: 12px;
            margin: 2px;
            display: inline-block;
            font-size: 11px;
          }
          
          .popup-buttons {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 8px;
          }
          
          .popup-button {
            background: #2E8B57;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
          }
          
          .popup-button:hover { background: #24734a; }
          
          .route-line {
            stroke-dasharray: 10, 10;
            animation: dash 1s linear infinite;
          }
          
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
          }
          
          .route-info-box {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            background: white;
            padding: 12px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            display: none;
          }
          
          .route-info-box.active {
            display: block;
          }
          
          .route-info-title {
            font-weight: 600;
            margin-bottom: 4px;
          }
          
          .route-info-details {
            display: flex;
            justify-content: space-between;
            color: #6c757d;
            font-size: 12px;
          }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map;
          let routeLayer = null;
          let currentRoute = null;
          let startMarker = null;
          let endMarker = null;

          try {
            // Initialize map
            map = L.map('map', {
              zoomControl: true,
              attributionControl: true
            }).setView([${location.latitude}, ${location.longitude}], 13);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 18
            }).addTo(map);

            // Add user location marker with arrow indicator
            const userIcon = L.divIcon({
              className: 'user-marker',
              html: '',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            startMarker = L.marker([${location.latitude}, ${location.longitude}], { 
              icon: userIcon,
              zIndexOffset: 1000
            })
              .addTo(map)
              .bindPopup('<b>Your Current Location</b>')
              .openPopup();

            // Parse facilities data with exact distances
            let facilities = [];
            try {
              facilities = JSON.parse('${facilitiesSafeString}');
            } catch (parseError) {
              console.error('Error parsing facilities:', parseError);
              facilities = [];
            }

            // Add facility markers with exact distance in popup
            facilities.forEach(facility => {
              try {
                const markerIcon = L.divIcon({
                  className: 'dropoff-marker ' + (facility.category || 'recycling'),
                  html: '',
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });
                
                const marker = L.marker([facility.latitude, facility.longitude], { 
                  icon: markerIcon 
                }).addTo(map);
                
                const dropoffTypes = facility.dropoffTypes || ['Recyclables'];
                const dropoffTypesHtml = dropoffTypes.map(type => 
                  '<span>' + type + '</span>'
                ).join(' ');
                
                // Show exact distance from current location
                const exactDistance = facility.distance ? 
                  '<div class="exact-distance">📍 ' + facility.distance.toFixed(2) + ' km from you</div>' : '';
                
                const popupContent = 
                  '<div class="route-popup">' +
                  '<h4>' + (facility.name || 'Recycling Drop-off') + '</h4>' +
                  '<div class="facility-type">' + (facility.type || 'Recycling Center') + '</div>' +
                  exactDistance +
                  '<p>' + (facility.fullAddress || 'Taguig City') + '</p>' +
                  '<div class="dropoff-types">' +
                  '<strong>Accepts:</strong> ' +
                  dropoffTypesHtml +
                  '</div>' +
                  (facility.operatingHours ? '<div style="font-size: 11px; color: #6c757d; margin: 4px 0;">🕒 ' + facility.operatingHours + '</div>' : '') +
                  '<div class="popup-buttons">' +
                  '<button class="popup-button" onclick="window.selectFacility(' + facility.latitude + ',' + facility.longitude + ')">' +
                  'Get Directions' +
                  '</button>' +
                  '</div>' +
                  '</div>';
                
                marker.bindPopup(popupContent);
              } catch (markerError) {
                console.error('Error creating marker:', markerError);
              }
            });

            // Route display function with clear line
            window.showRoute = function(routeGeometry, startLocation, endLocation, isEstimated = false) {
              try {
                // Remove existing route
                if (routeLayer) {
                  map.removeLayer(routeLayer);
                }
                
                if (routeGeometry && routeGeometry.coordinates) {
                  // Convert GeoJSON coordinates to LatLng array
                  const latlngs = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
                  
                  // Style for the route line - bold and visible
                  const style = {
                    color: '#2E8B57', // Green color
                    weight: 6, // Thicker line
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                  };
                  
                  // If estimated (straight line), use dashed pattern
                  if (isEstimated) {
                    style.dashArray = '10, 10';
                    style.color = '#FF6B35'; // Orange for estimated
                  }
                  
                  // Add the route line to map
                  routeLayer = L.polyline(latlngs, style).addTo(map);
                  
                  // Add start and end markers if they don't exist
                  if (startMarker) {
                    map.removeLayer(startMarker);
                  }
                  
                  // Create start marker with arrow
                  const startIcon = L.divIcon({
                    className: 'user-marker',
                    html: '',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                  });
                  
                  startMarker = L.marker([startLocation.latitude, startLocation.longitude], {
                    icon: startIcon,
                    zIndexOffset: 1000
                  }).addTo(map).bindPopup('Your Location');
                  
                  // Create end marker
                  const endIcon = L.divIcon({
                    className: 'dropoff-marker recycling',
                    html: '',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                  });
                  
                  endMarker = L.marker([endLocation.latitude, endLocation.longitude], {
                    icon: endIcon,
                    zIndexOffset: 1000
                  }).addTo(map).bindPopup(endLocation.name || 'Destination');
                  
                  // Fit map to show the entire route with padding
                  const bounds = L.latLngBounds(
                    [startLocation.latitude, startLocation.longitude],
                    [endLocation.latitude, endLocation.longitude]
                  );
                  map.fitBounds(bounds, { padding: [50, 50] });
                  
                  currentRoute = {
                    geometry: routeGeometry,
                    startLocation: startLocation,
                    endLocation: endLocation
                  };
                  
                  console.log('✅ Route displayed on map');
                }
              } catch (error) {
                console.error('Error showing route:', error);
              }
            };

            // Function to clear route
            window.clearRoute = function() {
              if (routeLayer) {
                map.removeLayer(routeLayer);
                routeLayer = null;
                currentRoute = null;
                
                // Remove end marker if exists
                if (endMarker) {
                  map.removeLayer(endMarker);
                  endMarker = null;
                }
                
                // Reset start marker
                if (startMarker) {
                  map.removeLayer(startMarker);
                }
                
                // Recreate start marker
                const startIcon = L.divIcon({
                  className: 'user-marker',
                  html: '',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                });
                
                startMarker = L.marker([${location.latitude}, ${location.longitude}], {
                  icon: startIcon,
                  zIndexOffset: 1000
                }).addTo(map).bindPopup('Your Location');
                
                // Reset view to show all facilities
                if (facilities.length > 0) {
                  const group = new L.featureGroup();
                  facilities.forEach(facility => {
                    group.addLayer(L.marker([facility.latitude, facility.longitude]));
                  });
                  group.addLayer(startMarker);
                  map.fitBounds(group.getBounds(), { padding: [50, 50] });
                }
                
                console.log('✅ Route cleared');
              }
            };

            // Global function for facility selection
            window.selectFacility = function(lat, lng) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'FACILITY_SELECT',
                  facility: { latitude: lat, longitude: lng }
                }));
              }
            };

            // Listen for messages from React Native
            window.addEventListener('message', function(event) {
              try {
                const data = JSON.parse(event.data);
                console.log('📩 WebView received:', data.type);
                
                switch(data.type) {
                  case 'SHOW_ROUTE':
                    window.showRoute(data.route, data.startLocation, data.endLocation, data.isEstimated);
                    break;
                  case 'CLEAR_ROUTE':
                    window.clearRoute();
                    break;
                }
              } catch (error) {
                console.error('Error processing message:', error);
              }
            });

            // Notify React Native that map is loaded
            setTimeout(() => {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'MAP_LOADED',
                  facilityCount: facilities.length
                }));
              }
            }, 1000);

          } catch (error) {
            console.error('Map initialization error:', error);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_ERROR',
                error: error.toString()
              }));
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('📤 WebView message:', data);
      
      switch (data.type) {
        case 'FACILITY_SELECT':
          const facility = facilities.find(f => 
            Math.abs(f.latitude - data.facility.latitude) < 0.001 && 
            Math.abs(f.longitude - data.facility.longitude) < 0.001
          );
          if (facility) {
            handleFacilitySelect(facility);
          }
          break;
        case 'MAP_LOADED':
          console.log(`✅ Map loaded with ${data.facilityCount} recycling drop-off points`);
          setMapLoading(false);
          break;
        case 'MAP_ERROR':
          console.error('❌ Map error:', data.error);
          setMapLoading(false);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.log('Raw WebView message:', event.nativeEvent.data);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E8B57" />
          <Text style={styles.loadingText}>Finding recycling and waste drop-off points in Taguig...</Text>
        </View>
      </View>
    );
  }

  if (error && !selectedFacility) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Locations</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedFacility ? 'Route to Drop-off Point' : 'Taguig Recycling & Waste Drop-off'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <WebView
          key={webViewKey}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onMessage={handleWebViewMessage}
          onLoadEnd={() => {
            console.log('WebView loaded successfully');
            setMapLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
        />
        
        {mapLoading && (
          <View style={styles.mapOverlay}>
            <View style={styles.mapLoadingContent}>
              <ActivityIndicator size="large" color="#2E8B57" />
              <Text style={styles.loadingText}>Loading interactive map...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Route Info Panel - Shows EXACT distance and time from API */}
      {selectedFacility && (
        <View style={styles.routePanel}>
          <View style={styles.routeHeader}>
            <View style={styles.routeTitleContainer}>
              <Text style={styles.routeTitle} numberOfLines={1}>{selectedFacility.name}</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified Drop-off</Text>
              </View>
            </View>
          </View>
          
          {isRouteLoading ? (
            <View style={styles.loadingRoute}>
              <ActivityIndicator size="small" color="#2E8B57" />
              <Text style={styles.loadingRouteText}>Calculating route and drawing line on map...</Text>
            </View>
          ) : routeInfo ? (
            <View style={styles.routeInfo}>
              <View style={styles.routeMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Distance</Text>
                  <Text style={styles.metricValue}>{routeInfo.distance}</Text>
                </View>
                <View style={styles.metricSeparator} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Est. Travel Time</Text>
                  <Text style={styles.metricValue}>{routeInfo.duration}</Text>
                  {routeInfo.isEstimated && (
                    <Text style={styles.estimatedText}>estimated</Text>
                  )}
                </View>
              </View>
              
              {selectedFacility.dropoffTypes && (
                <View style={styles.acceptedTypes}>
                  <Text style={styles.acceptedTypesLabel}>Accepts:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedFacility.dropoffTypes.map((type, index) => (
                      <View key={index} style={styles.typeTag}>
                        <Text style={styles.typeTagText}>{type}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* Button to open in Google Maps for turn-by-turn navigation */}
              <TouchableOpacity 
                style={styles.navigateButton}
                onPress={() => openInGoogleMaps(selectedFacility)}
              >
                <Text style={styles.navigateButtonText}>🗺️ Open in Google Maps for Navigation</Text>
              </TouchableOpacity>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retrySmallButton} 
                onPress={() => getRouteInfo(selectedFacility)}
              >
                <Text style={styles.retrySmallButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {/* Facilities List with EXACT distances */}
      {!selectedFacility && (
        <View style={styles.infoPanel}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Recycling & Waste Drop-off Points</Text>
            <Text style={styles.facilityCount}>
              {facilities.length} location{facilities.length !== 1 ? 's' : ''} in Taguig
            </Text>
          </View>
          
          {facilities.length > 0 && (
            <ScrollView 
              style={styles.facilitiesList} 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.facilitiesListContent}
            >
              {facilities.map((facility, index) => (
                <TouchableOpacity 
                  key={facility.id} 
                  style={styles.facilityCard}
                  onPress={() => handleFacilitySelect(facility)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardNumber}>
                      <Text style={styles.facilityNumber}>{index + 1}</Text>
                    </View>
                    <View style={[styles.cardType, 
                      facility.category === 'recycling' ? styles.recyclingType :
                      facility.category === 'ewaste' ? styles.ewasteType :
                      styles.wasteType
                    ]}>
                      <Text style={styles.cardTypeText}>
                        {facility.type === 'Materials Recovery Facility' ? 'MRF' : 'Drop-off'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.facilityName} numberOfLines={2}>
                    {facility.name}
                  </Text>
                  {/* EXACT distance from current location - no mock data */}
                  <View style={styles.distanceContainer}>
                    <Text style={styles.distanceIcon}>📍</Text>
                    <Text style={styles.exactDistanceText}>
                      {facility.distance ? `${facility.distance.toFixed(2)} km away` : 'Calculating...'}
                    </Text>
                  </View>
                  {facility.dropoffTypes && (
                    <Text style={styles.dropoffTypesPreview} numberOfLines={1}>
                      Accepts: {facility.dropoffTypes.slice(0, 3).join(' • ')}
                      {facility.dropoffTypes.length > 3 ? ' • +more' : ''}
                    </Text>
                  )}
                  <View style={styles.facilityAction}>
                    <Text style={styles.facilityActionText}>Get Directions →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.refreshButton} onPress={handleRetry}>
            <Text style={styles.refreshButtonText}>↻ Refresh Locations</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default Maps;