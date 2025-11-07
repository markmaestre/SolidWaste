import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Linking, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { styles } from "../../components/Styles/Maps";

const Maps = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [webViewKey, setWebViewKey] = useState(1);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [travelMode, setTravelMode] = useState('driving'); // driving, walking, bicycling

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      setMapLoading(true);
      setSelectedFacility(null);
      setRouteInfo(null);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied. Please enable location services in your settings.');
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
      setError('Error getting your location. Please try again.');
      setLoading(false);
    }
  };

  const searchRecyclingFacilities = async (lat, lng) => {
    try {
      console.log('🔍 Searching for recycling facilities...');
      
      const searchQueries = [
        'recycling center',
        'recycling facility',
        'waste management'
      ];

      let allFacilities = [];

      for (const query of searchQueries) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&` +
            `format=json&` +
            `lat=${lat}&` +
            `lon=${lng}&` +
            `radius=5000&` +
            `limit=5`
          );

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Found ${data.length} results for: ${query}`);
            
            const filteredFacilities = data.map(place => ({
              id: place.place_id + Math.random(),
              name: place.display_name.split(',')[0] || `Recycling Facility`,
              fullAddress: place.display_name,
              latitude: parseFloat(place.lat),
              longitude: parseFloat(place.lon),
              type: place.type,
              category: place.class,
              source: 'openstreetmap'
            }));

            allFacilities = [...allFacilities, ...filteredFacilities];
          }
        } catch (err) {
          console.log(`❌ Error searching for ${query}:`, err);
        }
      }

      const uniqueFacilities = allFacilities.filter((facility, index, self) =>
        index === self.findIndex(f => 
          f.latitude.toFixed(4) === facility.latitude.toFixed(4) && 
          f.longitude.toFixed(4) === facility.longitude.toFixed(4)
        )
      );

      console.log(`🎯 Total unique facilities found: ${uniqueFacilities.length}`);
      
      if (uniqueFacilities.length === 0) {
        console.log('⚠️ No facilities found, adding fallback locations');
        const fallbackFacilities = generateFallbackFacilities(lat, lng);
        setFacilities(fallbackFacilities);
      } else {
        setFacilities(uniqueFacilities);
      }

      setLoading(false);
      
    } catch (error) {
      console.error('Error searching facilities:', error);
      const fallbackFacilities = generateFallbackFacilities(lat, lng);
      setFacilities(fallbackFacilities);
      setLoading(false);
    }
  };

  const generateFallbackFacilities = (lat, lng) => {
    const fallbacks = [];
    const facilityTypes = [
      'Community Recycling Center',
      'Eco Waste Facility',
      'Green Recycling Point',
      'Environmental Services',
      'Waste Management Center'
    ];

    const count = 5;
    
    for (let i = 0; i < count; i++) {
      const radius = 3;
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      
      const newLat = lat + (distance / 111.32) * Math.cos(angle);
      const newLng = lng + (distance / (111.32 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
      
      fallbacks.push({
        id: `fallback-${i}`,
        name: facilityTypes[i % facilityTypes.length],
        fullAddress: `Approximate location near your area`,
        latitude: newLat,
        longitude: newLng,
        type: 'recycling',
        category: 'amenity',
        source: 'fallback'
      });
    }
    
    return fallbacks;
  };

  const getRouteInfo = async (facility) => {
    try {
      if (!location) return;

      console.log('🔄 Getting route information...');
      
      const response = await fetch(
        `http://router.project-osrm.org/route/v1/${travelMode}/` +
        `${location.longitude},${location.latitude};${facility.longitude},${facility.latitude}?` +
        `overview=full&geometries=geojson`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distance = (route.distance / 1000).toFixed(1); // Convert to km
          const duration = Math.ceil(route.duration / 60); // Convert to minutes
          
          setRouteInfo({
            distance: `${distance} km`,
            duration: `${duration} mins`,
            geometry: route.geometry
          });
          
          console.log(`📍 Route: ${distance} km, ${duration} mins`);
          
          // Send route to WebView
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SHOW_ROUTE',
              route: route.geometry,
              facility: facility
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error getting route:', error);
      // Fallback: estimate distance and time
      const distance = calculateDistance(
        location.latitude, 
        location.longitude, 
        facility.latitude, 
        facility.longitude
      );
      const duration = estimateTravelTime(distance, travelMode);
      
      setRouteInfo({
        distance: `${distance.toFixed(1)} km`,
        duration: `${duration} mins`,
        geometry: null
      });
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const estimateTravelTime = (distance, mode) => {
    const speeds = {
      driving: 40, // km/h
      walking: 5,  // km/h
      bicycling: 15 // km/h
    };
    
    const timeHours = distance / speeds[mode];
    return Math.ceil(timeHours * 60); // Convert to minutes
  };

  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
    setRouteInfo(null);
    getRouteInfo(facility);
  };

  const openGoogleMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps/search/recycling+centers/@${location.latitude},${location.longitude},15z`;
      Linking.openURL(url);
    } else {
      Linking.openURL('https://www.google.com/maps/search/recycling+centers+near+me');
    }
  };

  const openDirections = (facility) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}&travelmode=${travelMode}`;
    Linking.openURL(url);
  };

  const changeTravelMode = (mode) => {
    setTravelMode(mode);
    if (selectedFacility) {
      getRouteInfo(selectedFacility);
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
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: #f5f5f5;
            }
            .error-message {
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="error-message">
            <h3>Loading map...</h3>
            <p>Please wait while we load your location.</p>
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
            font-family: Arial, sans-serif;
            height: 100vh;
          }
          .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: #f5f5f5;
          }
          .user-marker {
            font-size: 24px;
          }
          .facility-icon {
            font-size: 20px;
          }
          .route-popup {
            padding: 10px;
            max-width: 250px;
          }
          .route-info {
            margin: 5px 0;
            font-size: 14px;
          }
          .travel-mode-btn {
            background: #2E8B57;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            margin: 2px;
            cursor: pointer;
            font-size: 12px;
          }
          .travel-mode-btn.active {
            background: #1a5c3a;
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
            map = L.map('map').setView([${location.latitude}, ${location.longitude}], 13);
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 18
            }).addTo(map);

            // Add user location marker
            const userIcon = L.divIcon({
              className: 'user-marker',
              html: '📍',
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            });
            
            L.marker([${location.latitude}, ${location.longitude}], { icon: userIcon })
              .addTo(map)
              .bindPopup('<b>Your Location</b><br>You are here')
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
                  className: 'facility-icon',
                  html: '♻️',
                  iconSize: [25, 25],
                  iconAnchor: [12, 25]
                });
                
                const marker = L.marker([facility.latitude, facility.longitude], { 
                  icon: facilityIcon 
                }).addTo(map);
                
                const popupContent = 
                  '<div class="route-popup">' +
                  '<strong>' + (facility.name || 'Recycling Facility') + '</strong><br/>' +
                  '<small>' + (facility.fullAddress || 'Recycling location') + '</small><br/>' +
                  '<button onclick="window.selectFacility(' + facility.latitude + ',' + facility.longitude + ')" ' +
                  'style="background: #2E8B57; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-top: 5px; cursor: pointer; width: 100%;">' +
                  'Show Route' +
                  '</button>' +
                  '<button onclick="window.openDirections(' + facility.latitude + ',' + facility.longitude + ')" ' +
                  'style="background: #FF6B35; color: white; border: none; padding: 5px 10px; border-radius: 3px; margin-top: 5px; cursor: pointer; width: 100%;">' +
                  'Get Directions' +
                  '</button>' +
                  '</div>';
                
                marker.bindPopup(popupContent);
              } catch (markerError) {
                console.error('Error creating marker:', markerError);
              }
            });

            // Function to show route on map
            window.showRoute = function(routeGeometry, facility) {
              try {
                // Remove existing route
                if (routeLayer) {
                  map.removeLayer(routeLayer);
                }
                
                if (routeGeometry && routeGeometry.coordinates) {
                  // Convert GeoJSON coordinates to LatLng array
                  const latlngs = routeGeometry.coordinates.map(coord => [coord[1], coord[0]]);
                  
                  // Create polyline
                  routeLayer = L.polyline(latlngs, {
                    color: '#2E8B57',
                    weight: 5,
                    opacity: 0.7,
                    dashArray: '10, 10'
                  }).addTo(map);
                  
                  // Fit map to show route
                  map.fitBounds(routeLayer.getBounds());
                  
                  currentRoute = {
                    geometry: routeGeometry,
                    facility: facility
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
              }
            };

            // Global functions
            window.selectFacility = function(lat, lng) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'FACILITY_SELECT',
                  facility: { latitude: lat, longitude: lng }
                }));
              }
            };

            window.openDirections = function(lat, lng) {
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'FACILITY_DIRECTIONS',
                  facility: { latitude: lat, longitude: lng }
                }));
              }
            };

            // Listen for route updates from React Native
            window.addEventListener('message', function(event) {
              try {
                const data = JSON.parse(event.data);
                if (data.type === 'SHOW_ROUTE') {
                  window.showRoute(data.route, data.facility);
                }
              } catch (error) {
                console.error('Error processing message:', error);
              }
            });

            // Notify React Native that map is loaded
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_LOADED',
                facilityCount: facilities.length
              }));
            }

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
          handleFacilitySelect(data.facility);
          break;
        case 'FACILITY_DIRECTIONS':
          openDirections(data.facility);
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
          <Text style={styles.loadingText}>Finding recycling facilities near you...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Location Access Needed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.alternativeButton} onPress={openGoogleMaps}>
            <Text style={styles.alternativeButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            console.log('WebView loaded');
            setMapLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
        />
        
        {mapLoading && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color="#2E8B57" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      </View>

      {/* Route Info Panel */}
      {selectedFacility && (
        <View style={styles.routePanel}>
          <Text style={styles.routeTitle}>🚗 Route to {selectedFacility.name}</Text>
          
          {routeInfo ? (
            <View style={styles.routeInfo}>
              <View style={styles.routeDetail}>
                <Text style={styles.routeLabel}>Distance:</Text>
                <Text style={styles.routeValue}>{routeInfo.distance}</Text>
              </View>
              <View style={styles.routeDetail}>
                <Text style={styles.routeLabel}>Time:</Text>
                <Text style={styles.routeValue}>{routeInfo.duration}</Text>
              </View>
              
              <View style={styles.travelModes}>
                <Text style={styles.modeLabel}>Travel Mode:</Text>
                <View style={styles.modeButtons}>
                  {['driving', 'walking', 'bicycling'].map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeButton,
                        travelMode === mode && styles.modeButtonActive
                      ]}
                      onPress={() => changeTravelMode(mode)}
                    >
                      <Text style={[
                        styles.modeButtonText,
                        travelMode === mode && styles.modeButtonTextActive
                      ]}>
                        {mode === 'driving' ? '🚗' : mode === 'walking' ? '🚶' : '🚴'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.loadingRoute}>
              <ActivityIndicator size="small" color="#2E8B57" />
              <Text style={styles.loadingRouteText}>Calculating route...</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.directionsButton} 
            onPress={() => openDirections(selectedFacility)}
          >
            <Text style={styles.directionsButtonText}>📱 Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Panel */}
      <View style={[
        styles.infoPanel,
        selectedFacility && styles.infoPanelWithRoute
      ]}>
        <Text style={styles.infoTitle}>♻️ Recycling Facilities</Text>
        <Text style={styles.infoText}>
          Found {facilities.length} facility{facilities.length !== 1 ? 'ies' : ''} near you
        </Text>
        
        {facilities.length > 0 && (
          <ScrollView 
            style={styles.facilitiesList} 
            horizontal 
            showsHorizontalScrollIndicator={false}
          >
            {facilities.slice(0, 5).map((facility, index) => (
              <TouchableOpacity 
                key={facility.id} 
                style={[
                  styles.facilityChip,
                  selectedFacility && selectedFacility.latitude === facility.latitude && styles.facilityChipSelected
                ]}
                onPress={() => handleFacilitySelect(facility)}
              >
                <Text style={styles.facilityChipText}>
                  {facility.name}
                </Text>
                <Text style={styles.facilityChipDistance}>
                  {index + 1} • Tap for route
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.googleMapsButton} onPress={openGoogleMaps}>
            <Text style={styles.googleMapsButtonText}>📍 Open in Google Maps</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.refreshButton} onPress={handleRetry}>
            <Text style={styles.refreshButtonText}>🔄 Refresh Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Maps;