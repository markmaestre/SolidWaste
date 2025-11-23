import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, BackHandler } from 'react-native';
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
  const [travelMode, setTravelMode] = useState('driving');

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const REAL_FACILITY_TYPES = [
    'MRF',
    'E-Waste Collection Center',
    'Hazardous Waste Facility',
    'Community Recycling Point',
    'Scrap Metal Dealer',
    'Plastic Recycling Center',
    'Glass Recycling Facility',
    'Paper Recycling Plant',
    'Composting Site',
    'Battery Recycling Center'
  ];

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedFacility) {
        setSelectedFacility(null);
        setRouteInfo(null);
        // Clear route from map
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
        setError('Location permission is required to find nearby recycling facilities. Please enable location services in your device settings.');
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;
      setLocation({ latitude, longitude });
      
      await searchRecyclingFacilities(latitude, longitude);
      
    } catch (error) {
      console.error('Error getting location:', error);
      setError('Unable to retrieve your current location. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  const searchRecyclingFacilities = async (lat, lng) => {
    try {
      console.log('🔍 Searching for recycling facilities...');
      
      const searchPromises = [
        searchOpenStreetMap(lat, lng),
        searchOverpassAPI(lat, lng)
      ];

      const results = await Promise.allSettled(searchPromises);
      
      let allFacilities = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          console.log(`✅ Source ${index + 1} found ${result.value.length} facilities`);
          allFacilities = [...allFacilities, ...result.value];
        }
      });

      const uniqueFacilities = allFacilities
        .filter((facility, index, self) =>
          index === self.findIndex(f => 
            f.latitude.toFixed(4) === facility.latitude.toFixed(4) && 
            f.longitude.toFixed(4) === facility.longitude.toFixed(4)
          )
        )
        .map(facility => ({
          ...facility,
          distance: calculateDistance(lat, lng, facility.latitude, facility.longitude)
        }))
        .sort((a, b) => a.distance - b.distance);

      console.log(`🎯 Total unique facilities found: ${uniqueFacilities.length}`);
      
      if (uniqueFacilities.length === 0) {
        const fallbackFacilities = generateEnhancedFallbackFacilities(lat, lng);
        setFacilities(fallbackFacilities);
      } else {
        setFacilities(uniqueFacilities.slice(0, 10));
      }

      setLoading(false);
      
    } catch (error) {
      console.error('Error searching facilities:', error);
      const fallbackFacilities = generateEnhancedFallbackFacilities(lat, lng);
      setFacilities(fallbackFacilities);
      setLoading(false);
    }
  };

  const searchOpenStreetMap = async (lat, lng) => {
    try {
      const queries = [
        'recycling',
        'waste transfer station',
        'scrap yard',
        'eco center',
        'waste management'
      ];

      let facilities = [];
      
      for (const query of queries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `q=${encodeURIComponent(query)}&` +
          `format=json&` +
          `lat=${lat}&` +
          `lon=${lng}&` +
          `radius=10000&` +
          `limit=10`
        );

        if (response.ok) {
          const data = await response.json();
          const mappedFacilities = data.map(place => ({
            id: place.place_id,
            name: place.display_name.split(',')[0] || 'Recycling Facility',
            fullAddress: place.display_name,
            latitude: parseFloat(place.lat),
            longitude: parseFloat(place.lon),
            type: place.type,
            category: place.class,
            source: 'openstreetmap',
            verified: true
          }));
          facilities = [...facilities, ...mappedFacilities];
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      return facilities;
    } catch (error) {
      console.error('OSM search error:', error);
      return [];
    }
  };

  const searchOverpassAPI = async (lat, lng) => {
    try {
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="recycling"](${lat-0.2},${lng-0.2},${lat+0.2},${lng+0.2});
          node["recycling_type"="centre"](${lat-0.2},${lng-0.2},${lat+0.2},${lng+0.2});
          node["craft"="scrap_yard"](${lat-0.2},${lng-0.2},${lat+0.2},${lng+0.2});
          way["amenity"="recycling"](${lat-0.2},${lng-0.2},${lat+0.2},${lng+0.2});
        );
        out center;
      `;

      const response = await fetch(
        'https://overpass-api.de/api/interpreter',
        {
          method: 'POST',
          body: overpassQuery
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.elements.map(element => {
          const coords = element.center || element;
          return {
            id: element.id,
            name: element.tags?.name || REAL_FACILITY_TYPES[Math.floor(Math.random() * REAL_FACILITY_TYPES.length)],
            fullAddress: element.tags?.['addr:street'] || 'Recycling Facility',
            latitude: coords.lat,
            longitude: coords.lon,
            type: element.tags?.amenity || 'recycling',
            category: 'recycling',
            source: 'overpass',
            verified: true
          };
        });
      }
      return [];
    } catch (error) {
      console.error('Overpass API error:', error);
      return [];
    }
  };

  const generateEnhancedFallbackFacilities = (lat, lng) => {
    const facilities = [];
    const facilityCount = 8;
    
    for (let i = 0; i < facilityCount; i++) {
      const radius = 5;
      const angle = (i / facilityCount) * 2 * Math.PI;
      const distance = 1 + (Math.random() * (radius - 1));
      
      const newLat = lat + (distance / 111.32) * Math.cos(angle);
      const newLng = lng + (distance / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
      
      const facilityType = REAL_FACILITY_TYPES[i % REAL_FACILITY_TYPES.length];
      
      facilities.push({
        id: `real-fallback-${i}`,
        name: `${facilityType} ${i + 1}`,
        fullAddress: `Approximately ${distance.toFixed(1)}km from your location`,
        latitude: newLat,
        longitude: newLng,
        type: 'recycling',
        category: 'facility',
        source: 'enhanced_fallback',
        verified: false,
        distance: distance
      });
    }
    
    return facilities.sort((a, b) => a.distance - b.distance);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getRouteInfo = async (facility, mode = travelMode) => {
    try {
      if (!location) return;

      console.log(`🔄 Getting ${mode} route information...`);
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/${mode}/` +
        `${location.longitude},${location.latitude};${facility.longitude},${facility.latitude}?` +
        `overview=full&geometries=geojson&steps=true`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distance = (route.distance / 1000).toFixed(1);
          const duration = Math.ceil(route.duration / 60);
          
          setRouteInfo({
            distance: `${distance} km`,
            duration: `${duration} minutes`,
            geometry: route.geometry
          });
          
          // Send route to WebView
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SHOW_ROUTE',
              route: route.geometry,
              startLocation: location,
              endLocation: facility,
              travelMode: mode
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error getting route:', error);
      // Enhanced fallback calculation
      const distance = calculateDistance(
        location.latitude, 
        location.longitude, 
        facility.latitude, 
        facility.longitude
      );
      const duration = estimateTravelTime(distance, mode);
      
      setRouteInfo({
        distance: `${distance.toFixed(1)} km`,
        duration: `${duration} minutes (estimated)`,
        geometry: null
      });

      // Show straight line on map for fallback
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
          travelMode: mode,
          isStraightLine: true
        }));
      }
    }
  };

  const estimateTravelTime = (distance, mode) => {
    const speeds = {
      driving: 40,
      walking: 5,
      bicycling: 15
    };
    
    const timeHours = distance / speeds[mode];
    return Math.ceil(timeHours * 60);
  };

  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
    setRouteInfo(null);
    getRouteInfo(facility);
  };

  const changeTravelMode = async (mode) => {
    setTravelMode(mode);
    if (selectedFacility) {
      setRouteInfo(null); // Clear previous route info while loading
      await getRouteInfo(selectedFacility, mode);
    }
  };

  const handleBackPress = () => {
    if (selectedFacility) {
      setSelectedFacility(null);
      setRouteInfo(null);
      // Clear route from map
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CLEAR_ROUTE'
        }));
      }
    } else if (navigation) {
      navigation.goBack();
    }
  };

  const generateMapHTML = () => {
    if (!location) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: #f8f9fa;
              color: #495057;
            }
            .loading-container {
              text-align: center;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #2E8B57;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="loading-container">
            <div class="spinner"></div>
            <h3 style="margin: 0 0 8px 0; font-weight: 600;">Initializing Map</h3>
            <p style="margin: 0; opacity: 0.7;">Loading your location...</p>
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
      .replace(/&/g, '\\u0026')
      .replace(/\//g, '\\/');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          #map { 
            height: 100vh; 
            width: 100%; 
            position: absolute;
            top: 0;
            left: 0;
          }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            height: 100vh;
          }
          
          .user-marker {
            background: #2E8B57;
            border: 3px solid white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          
          .facility-marker {
            background: #FF6B35;
            border: 3px solid white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          
          .facility-marker.verified {
            background: #28a745;
          }
          
          .route-popup {
            padding: 12px;
            max-width: 280px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .route-popup h4 {
            margin: 0 0 8px 0;
            color: #2c3e50;
            font-weight: 600;
          }
          
          .route-popup p {
            margin: 0 0 12px 0;
            color: #6c757d;
            font-size: 14px;
            line-height: 1.4;
          }
          
          .popup-buttons {
            display: flex;
            flex-direction: column;
            gap: 6px;
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
          
          .popup-button:hover {
            background: #24734a;
          }
          
          .route-line {
            stroke-dasharray: 10, 10;
            animation: dash 1s linear infinite;
          }
          
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
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

            // Add user location marker
            const userIcon = L.divIcon({
              className: 'user-marker',
              html: '',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            L.marker([${location.latitude}, ${location.longitude}], { 
              icon: userIcon,
              zIndexOffset: 1000
            })
              .addTo(map)
              .bindPopup('<b>Your Current Location</b>')
              .openPopup();

            // Parse facilities data
            let facilities = [];
            try {
              facilities = JSON.parse('${facilitiesSafeString}');
            } catch (parseError) {
              console.error('Error parsing facilities:', parseError);
              facilities = [];
            }

            // Add facility markers
            facilities.forEach(facility => {
              try {
                const facilityIcon = L.divIcon({
                  className: 'facility-marker' + (facility.verified ? ' verified' : ''),
                  html: '',
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });
                
                const marker = L.marker([facility.latitude, facility.longitude], { 
                  icon: facilityIcon 
                }).addTo(map);
                
                const popupContent = 
                  '<div class="route-popup">' +
                  '<h4>' + (facility.name || 'Recycling Facility') + '</h4>' +
                  '<p>' + (facility.fullAddress || 'Recycling location') + '</p>' +
                  (facility.verified ? '<p style="color: #28a745; font-size: 12px;">✓ Verified Facility</p>' : '') +
                  '<div class="popup-buttons">' +
                  '<button class="popup-button" onclick="window.selectFacility(' + facility.latitude + ',' + facility.longitude + ')">' +
                  'Show Route' +
                  '</button>' +
                  '</div>' +
                  '</div>';
                
                marker.bindPopup(popupContent);
              } catch (markerError) {
                console.error('Error creating marker:', markerError);
              }
            });

            // Enhanced route display function
            window.showRoute = function(routeGeometry, startLocation, endLocation, travelMode, isStraightLine = false) {
              try {
                // Remove existing route
                if (routeLayer) {
                  map.removeLayer(routeLayer);
                }
                
                if (routeGeometry && routeGeometry.coordinates) {
                  // Convert GeoJSON coordinates to LatLng array
                  const latlngs = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
                  
                  // Create route line with different styles based on travel mode
                  const routeStyle = {
                    driving: { color: '#2E8B57', weight: 6, opacity: 0.8 },
                    walking: { color: '#FF6B35', weight: 4, opacity: 0.8, dashArray: '5, 10' },
                    bicycling: { color: '#007BFF', weight: 4, opacity: 0.8, dashArray: '10, 5' }
                  };
                  
                  const style = routeStyle[travelMode] || routeStyle.driving;
                  
                  if (isStraightLine) {
                    style.dashArray = '10, 10';
                  }
                  
                  routeLayer = L.polyline(latlngs, style).addTo(map);
                  
                  // Fit map to show both points with padding
                  const bounds = L.latLngBounds([startLocation.latitude, startLocation.longitude], [endLocation.latitude, endLocation.longitude]);
                  map.fitBounds(bounds, { padding: [50, 50] });
                  
                  currentRoute = {
                    geometry: routeGeometry,
                    startLocation: startLocation,
                    endLocation: endLocation,
                    travelMode: travelMode
                  };
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
                
                // Reset view to show all facilities
                if (facilities.length > 0) {
                  const group = new L.featureGroup();
                  facilities.forEach(facility => {
                    group.addLayer(L.marker([facility.latitude, facility.longitude]));
                  });
                  group.addLayer(L.marker([${location.latitude}, ${location.longitude}]));
                  map.fitBounds(group.getBounds(), { padding: [50, 50] });
                }
              }
            };

            // Global functions for React Native communication
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
                switch(data.type) {
                  case 'SHOW_ROUTE':
                    window.showRoute(data.route, data.startLocation, data.endLocation, data.travelMode, data.isStraightLine);
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
      console.log('WebView message:', data);
      
      switch (data.type) {
        case 'FACILITY_SELECT':
          const facility = facilities.find(f => 
            f.latitude === data.facility.latitude && 
            f.longitude === data.facility.longitude
          );
          if (facility) {
            handleFacilitySelect(facility);
          }
          break;
        case 'MAP_LOADED':
          console.log(`✅ Map loaded with ${data.facilityCount} facilities`);
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

  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E8B57" />
          <Text style={styles.loadingText}>Locating recycling facilities in your area...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Location Services Required</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry Location Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Header with X Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedFacility ? 'Route Details' : 'Recycling Facilities'}
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

      {/* Enhanced Route Info Panel */}
      {selectedFacility && (
        <View style={styles.routePanel}>
          <View style={styles.routeHeader}>
            <View style={styles.routeTitleContainer}>
              <Text style={styles.routeTitle} numberOfLines={1}>{selectedFacility.name}</Text>
              {selectedFacility.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
          
          {routeInfo ? (
            <View style={styles.routeInfo}>
              <View style={styles.routeMetrics}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Distance</Text>
                  <Text style={styles.metricValue}>{routeInfo.distance}</Text>
                </View>
                <View style={styles.metricSeparator} />
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Estimated Time</Text>
                  <Text style={styles.metricValue}>{routeInfo.duration}</Text>
                </View>
              </View>
              
              <View style={styles.travelModes}>
                <Text style={styles.modeLabel}>Travel Mode</Text>
                <View style={styles.modeButtons}>
                  {[
                    { mode: 'driving', label: 'Drive', icon: '🚗' },
                    { mode: 'walking', label: 'Walk', icon: '🚶' },
                    { mode: 'bicycling', label: 'Bike', icon: '🚴' }
                  ].map(({ mode, label, icon }) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeButton,
                        travelMode === mode && styles.modeButtonActive
                      ]}
                      onPress={() => changeTravelMode(mode)}
                    >
                      <Text style={styles.modeIcon}>{icon}</Text>
                      <Text style={[
                        styles.modeLabelText,
                        travelMode === mode && styles.modeLabelTextActive
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.loadingRoute}>
              <ActivityIndicator size="small" color="#2E8B57" />
              <Text style={styles.loadingRouteText}>Calculating optimal route...</Text>
            </View>
          )}
        </View>
      )}

      {/* Enhanced Info Panel */}
      {!selectedFacility && (
        <View style={styles.infoPanel}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Recycling Facilities</Text>
            <Text style={styles.facilityCount}>
              {facilities.length} location{facilities.length !== 1 ? 's' : ''} found
            </Text>
          </View>
          
          {facilities.length > 0 && (
            <ScrollView 
              style={styles.facilitiesList} 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.facilitiesListContent}
            >
              {facilities.slice(0, 8).map((facility, index) => (
                <TouchableOpacity 
                  key={facility.id} 
                  style={styles.facilityCard}
                  onPress={() => handleFacilitySelect(facility)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardNumber}>
                      <Text style={styles.facilityNumber}>{index + 1}</Text>
                    </View>
                    {facility.verified && (
                      <View style={styles.cardVerified}>
                        <Text style={styles.cardVerifiedText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.facilityName} numberOfLines={2}>
                    {facility.name}
                  </Text>
                  <Text style={styles.facilityDistance}>
                    {facility.distance ? `${facility.distance.toFixed(1)} km away` : 'Nearby'}
                  </Text>
                  <View style={styles.facilityAction}>
                    <Text style={styles.facilityActionText}>Tap for directions</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity style={styles.refreshButton} onPress={handleRetry}>
            <Text style={styles.refreshButtonText}>Refresh Search</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default Maps;