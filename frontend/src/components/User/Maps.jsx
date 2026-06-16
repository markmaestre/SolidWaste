import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  BackHandler,
  Alert,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_CONFIG = {
  recycling: {
    color: '#16A34A',
    bgColor: '#DCFCE7',
    label: 'MRF',
    icon: 'leaf-outline',
  },
  ewaste: {
    color: '#2563EB',
    bgColor: '#DBEAFE',
    label: 'E-waste',
    icon: 'hardware-chip-outline',
  },
  waste_management: {
    color: '#D97706',
    bgColor: '#FEF3C7',
    label: 'Drop-off',
    icon: 'trash-outline',
  },
};

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
    verified: true,
    operatingHours: 'Mon–Sat  8:00 AM – 5:00 PM',
    description: 'Household waste transformation into fertilizer and reusable items.',
  },
  {
    id: 'taguig-mmda-labasan-002',
    name: 'MMDA Labasan Warehouse',
    fullAddress: 'Labasan Pumping Station, Taguig City',
    latitude: 14.5278,
    longitude: 121.0717,
    type: 'Solid Waste Management Facility',
    category: 'waste_management',
    dropoffTypes: ['General Waste', 'Bulk Waste', 'Construction Debris'],
    verified: true,
    operatingHours: 'Mon–Fri  7:00 AM – 6:00 PM',
    description: 'Secured holding area for solid waste management.',
  },
  {
    id: 'taguig-upstyle-003',
    name: 'Upstyle Recycling Center',
    fullAddress: 'Near Market! Market!, Taguig City',
    latitude: 14.5455,
    longitude: 121.056,
    type: 'Recycling Center',
    category: 'recycling',
    dropoffTypes: ['Plastic Bottles', 'Glass', 'Paper', 'Upcyclable Materials'],
    verified: true,
    operatingHours: 'Tue–Sun  10:00 AM – 6:00 PM',
    description: 'Educational hub focusing on upcycling waste.',
  },
  {
    id: 'taguig-sktes-ewaste-004',
    name: 'SK tes E-waste Recycling',
    fullAddress: 'Unit 104, Central Business Park, Amang Rodriguez Ave',
    latitude: 14.5722,
    longitude: 121.0937,
    type: 'E-waste Recycling Facility',
    category: 'ewaste',
    dropoffTypes: ['Computers', 'Laptops', 'Mobile Phones', 'Electronics', 'Batteries'],
    verified: true,
    operatingHours: 'Mon–Fri  9:00 AM – 5:00 PM',
    description: 'IT Asset Disposition and E-waste recycling.',
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
    verified: true,
    operatingHours: 'Daily  24 / 7',
    description: 'Central waste collection point for BGC area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Main Materials Recovery Facility serving Central Taguig.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Western Bicutan area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Pinagsama area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Ususan area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Wawa area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Hagonoy area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Ligid area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Bambang area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Calzada area.',
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
    verified: true,
    operatingHours: 'Mon–Sat  7:00 AM – 4:00 PM',
    description: 'Community MRF serving Sta. Ana area.',
  },
];

const calculateExactDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

// ─── Map HTML Generator ───────────────────────────────────────────────────────
const generateMapHTML = (location, facilities) => {
  if (!location) return `
    <!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <style>body{margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:system-ui,sans-serif;}</style>
    </head><body><p style="color:#64748b;font-size:14px;">Acquiring location…</p></body></html>
  `;

  const facilitiesJSON = JSON.stringify(facilities || [])
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;width:100%;overflow:hidden}
    #map{height:100vh;width:100%}

    .user-pin{
      width:20px;height:20px;
      background:#16A34A;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 3px rgba(22,163,74,0.25);
    }

    .facility-pin{
      width:14px;height:14px;
      border:2.5px solid #fff;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,0.25);
    }
    .pin-recycling{background:#16A34A}
    .pin-ewaste{background:#2563EB}
    .pin-waste_management{background:#D97706}

    .lp{
      padding:14px 16px;
      min-width:220px;
      max-width:260px;
      font-family:system-ui,-apple-system,sans-serif;
    }
    .lp-name{font-size:14px;font-weight:600;color:#0f172a;margin-bottom:2px;line-height:1.3}
    .lp-type{font-size:11px;color:#64748b;margin-bottom:8px;font-weight:500;text-transform:uppercase;letter-spacing:0.04em}
    .lp-dist{
      display:inline-flex;align-items:center;gap:4px;
      background:#DCFCE7;color:#15803D;
      font-size:12px;font-weight:600;
      padding:3px 8px;border-radius:99px;
      margin-bottom:8px;
    }
    .lp-addr{font-size:12px;color:#475569;margin-bottom:8px;line-height:1.4}
    .lp-hours{font-size:11px;color:#64748b;margin-bottom:10px;display:flex;gap:5px;align-items:flex-start}
    .lp-btn{
      display:block;width:100%;
      background:#16A34A;color:#fff;
      border:none;padding:8px 12px;
      border-radius:8px;font-size:13px;font-weight:600;
      cursor:pointer;text-align:center;
    }
    .leaflet-popup-content-wrapper{border-radius:12px;padding:0;overflow:hidden;border:none;box-shadow:0 4px 20px rgba(0,0,0,0.12)}
    .leaflet-popup-content{margin:0;line-height:1}
    .leaflet-popup-tip-container{display:none}
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var map = L.map('map',{zoomControl:false,attributionControl:false})
    .setView([${location.latitude},${location.longitude}],13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    maxZoom:19
  }).addTo(map);

  L.control.zoom({position:'bottomright'}).addTo(map);

  var routeLayer=null, endMarker=null;

  var userIcon=L.divIcon({className:'user-pin',iconSize:[20,20],iconAnchor:[10,10]});
  var userMarker=L.marker([${location.latitude},${location.longitude}],{icon:userIcon,zIndexOffset:2000})
    .addTo(map)
    .bindPopup('<div class="lp"><div class="lp-name">Your Location</div></div>');

  var facilities=JSON.parse('${facilitiesJSON}');

  facilities.forEach(function(f){
    var cat=f.category||'recycling';
    var icon=L.divIcon({
      className:'facility-pin pin-'+cat,
      iconSize:[14,14],iconAnchor:[7,7]
    });

    var types=(f.dropoffTypes||[]).map(function(t){
      return '<span style="display:inline-block;background:#f1f5f9;color:#334155;font-size:10px;padding:2px 7px;border-radius:99px;margin:2px 2px 2px 0">'+t+'</span>';
    }).join('');

    var dist=f.distance?'<div class="lp-dist">'+f.distance.toFixed(2)+' km away</div>':'';

    var popup='<div class="lp">'
      +'<div class="lp-name">'+f.name+'</div>'
      +'<div class="lp-type">'+f.type+'</div>'
      +dist
      +'<div class="lp-addr">'+f.fullAddress+'</div>'
      +(f.operatingHours?'<div class="lp-hours"><span style="opacity:.5">&#x23F0;</span>'+f.operatingHours+'</div>':'')
      +'<div style="margin-bottom:8px">'+types+'</div>'
      +'<button class="lp-btn" onclick="selFacility('+f.latitude+','+f.longitude+')">Get directions</button>'
      +'</div>';

    L.marker([f.latitude,f.longitude],{icon:icon}).addTo(map).bindPopup(popup,{maxWidth:280});
  });

  window.selFacility=function(lat,lng){
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'FACILITY_SELECT',facility:{latitude:lat,longitude:lng}}));
    }
  };

  window.showRoute=function(geo,start,end,isEst){
    if(routeLayer){map.removeLayer(routeLayer);}
    if(endMarker){map.removeLayer(endMarker);}
    if(geo&&geo.coordinates){
      var ll=geo.coordinates.map(function(c){return[c[1],c[0]];});
      routeLayer=L.polyline(ll,{
        color: isEst?'#D97706':'#16A34A',
        weight:5,opacity:0.9,
        lineCap:'round',lineJoin:'round',
        dashArray: isEst?'8 8':null
      }).addTo(map);

      var endIcon=L.divIcon({className:'facility-pin pin-recycling',iconSize:[14,14],iconAnchor:[7,7]});
      endMarker=L.marker([end.latitude,end.longitude],{icon:endIcon,zIndexOffset:1500}).addTo(map);

      map.fitBounds(L.latLngBounds([[start.latitude,start.longitude],[end.latitude,end.longitude]]),{padding:[60,60]});
    }
  };

  window.clearRoute=function(){
    if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
    if(endMarker){map.removeLayer(endMarker);endMarker=null;}
    map.setView([${location.latitude},${location.longitude}],13);
  };

  window.addEventListener('message',function(e){
    try{
      var d=JSON.parse(e.data);
      if(d.type==='SHOW_ROUTE') window.showRoute(d.route,d.startLocation,d.endLocation,d.isEstimated);
      if(d.type==='CLEAR_ROUTE') window.clearRoute();
    }catch(err){}
  });

  setTimeout(function(){
    if(window.ReactNativeWebView){
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'MAP_LOADED',facilityCount:facilities.length}));
    }
  },800);
})();
</script>
</body>
</html>`;
};

// ─── Category Badge ───────────────────────────────────────────────────────────
const CategoryBadge = ({ category }) => {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.recycling;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bgColor }]}>
      <Ionicons name={cfg.icon} size={10} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

// ─── Facility Card ────────────────────────────────────────────────────────────
const FacilityCard = ({ facility, index, onPress }) => {
  const cfg = CATEGORY_CONFIG[facility.category] || CATEGORY_CONFIG.recycling;
  return (
    <TouchableOpacity style={styles.facilityCard} onPress={() => onPress(facility)} activeOpacity={0.85}>
      <View style={styles.cardTopRow}>
        <View style={[styles.cardIconWrap, { backgroundColor: cfg.bgColor }]}>
          <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        </View>
        <View style={styles.cardMeta}>
          <CategoryBadge category={facility.category} />
          {facility.verified && (
            <View style={styles.verifiedChip}>
              <Ionicons name="checkmark-circle" size={10} color="#16A34A" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.cardName} numberOfLines={2}>{facility.name}</Text>

      <View style={styles.cardDistRow}>
        <Ionicons name="location-outline" size={13} color="#64748b" />
        <Text style={styles.cardDist}>
          {facility.distance != null ? `${facility.distance.toFixed(2)} km away` : 'Calculating…'}
        </Text>
      </View>

      {facility.dropoffTypes && (
        <Text style={styles.cardTypes} numberOfLines={1}>
          {facility.dropoffTypes.slice(0, 3).join(' · ')}
          {facility.dropoffTypes.length > 3 ? ' · +more' : ''}
        </Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardCta}>Get directions</Text>
        <Ionicons name="arrow-forward" size={14} color="#16A34A" />
      </View>
    </TouchableOpacity>
  );
};

// ─── Route Panel ──────────────────────────────────────────────────────────────
const RoutePanel = ({ facility, routeInfo, isRouteLoading, error, onRetry, onNavigate, onClose }) => {
  const cfg = CATEGORY_CONFIG[facility.category] || CATEGORY_CONFIG.recycling;
  return (
    <View style={styles.routePanel}>
      {/* Header */}
      <View style={styles.routePanelHeader}>
        <View style={[styles.routeIconWrap, { backgroundColor: cfg.bgColor }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={styles.routePanelTitleWrap}>
          <Text style={styles.routePanelName} numberOfLines={1}>{facility.name}</Text>
          <Text style={styles.routePanelAddr} numberOfLines={1}>{facility.fullAddress}</Text>
        </View>
        <TouchableOpacity style={styles.routeCloseBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.routePanelDivider} />

      {/* Content */}
      {isRouteLoading ? (
        <View style={styles.routeLoadingRow}>
          <ActivityIndicator size="small" color="#16A34A" />
          <Text style={styles.routeLoadingText}>Calculating route…</Text>
        </View>
      ) : routeInfo ? (
        <>
          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <Ionicons name="navigate-outline" size={16} color="#16A34A" style={{ marginBottom: 4 }} />
              <Text style={styles.metricValue}>{routeInfo.distance}</Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricBlock}>
              <Ionicons name="time-outline" size={16} color="#16A34A" style={{ marginBottom: 4 }} />
              <Text style={styles.metricValue}>{routeInfo.duration}</Text>
              <Text style={styles.metricLabel}>{routeInfo.isEstimated ? 'Est. travel time' : 'Travel time'}</Text>
            </View>
          </View>

          {facility.dropoffTypes && (
            <View style={styles.acceptsRow}>
              <Text style={styles.acceptsLabel}>Accepts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                {facility.dropoffTypes.map((t, i) => (
                  <View key={i} style={styles.typeChip}>
                    <Text style={styles.typeChipText}>{t}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.gmapsBtn} onPress={onNavigate} activeOpacity={0.85}>
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.gmapsBtnText}>Open in Google Maps</Text>
            <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </>
      ) : error ? (
        <View style={styles.routeErrorRow}>
          <Text style={styles.routeErrorText}>{error}</Text>
          <TouchableOpacity style={styles.retrySmall} onPress={onRetry}>
            <Ionicons name="refresh-outline" size={14} color="#16A34A" />
            <Text style={styles.retrySmallText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  const [routeError, setRouteError] = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedFacility) {
        clearSelectedFacility();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [selectedFacility]);

  useEffect(() => { getCurrentLocation(); }, []);

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    setMapLoading(true);
    setSelectedFacility(null);
    setRouteInfo(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required. Please enable it in your device settings.');
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setLocation({ latitude, longitude });

      const withDist = TAGUIG_DROPOFF_LOCATIONS.map(f => ({
        ...f,
        distance: calculateExactDistance(latitude, longitude, f.latitude, f.longitude),
      })).sort((a, b) => a.distance - b.distance);

      setFacilities(withDist);
      setLoading(false);
      setMapLoading(false);
    } catch (e) {
      setError('Unable to retrieve your location. Check your connection and try again.');
      setLoading(false);
    }
  };

  const getRouteInfo = async (facility) => {
    if (!location) return;
    setIsRouteLoading(true);
    setRouteInfo(null);
    setRouteError(null);

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${location.longitude},${location.latitude};${facility.longitude},${facility.latitude}?` +
        `overview=full&geometries=geojson&steps=false`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.routes?.length > 0) {
          const route = data.routes[0];
          const distKm = (route.distance / 1000).toFixed(2);
          const durMin = Math.round(route.duration / 60);
          setRouteInfo({ distance: `${distKm} km`, duration: `${durMin} min`, geometry: route.geometry, isEstimated: false });
          sendToWebView({ type: 'SHOW_ROUTE', route: route.geometry, startLocation: location, endLocation: facility, isEstimated: false });
          return;
        }
      }
      throw new Error('No route');
    } catch {
      const d = calculateExactDistance(location.latitude, location.longitude, facility.latitude, facility.longitude);
      const t = Math.round((d / 30) * 60);
      const geo = { type: 'LineString', coordinates: [[location.longitude, location.latitude], [facility.longitude, facility.latitude]] };
      setRouteInfo({ distance: `${d.toFixed(2)} km`, duration: `${t} min`, geometry: geo, isEstimated: true });
      sendToWebView({ type: 'SHOW_ROUTE', route: geo, startLocation: location, endLocation: facility, isEstimated: true });
    } finally {
      setIsRouteLoading(false);
    }
  };

  const sendToWebView = (msg) => {
    webViewRef.current?.injectJavaScript(`
      (function(){
        window.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(${JSON.stringify(msg)})}));
      })();
      true;
    `);
  };

  const clearSelectedFacility = () => {
    setSelectedFacility(null);
    setRouteInfo(null);
    setRouteError(null);
    sendToWebView({ type: 'CLEAR_ROUTE' });
  };

  const handleFacilitySelect = (facility) => {
    setSelectedFacility(facility);
    setRouteInfo(null);
    setRouteError(null);
    getRouteInfo(facility);
  };

  const openInGoogleMaps = () => {
    if (!location || !selectedFacility) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${selectedFacility.latitude},${selectedFacility.longitude}&travelmode=driving`;
    Linking.canOpenURL(url).then(ok => ok ? Linking.openURL(url) : Alert.alert('Error', 'Cannot open Google Maps'));
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'FACILITY_SELECT') {
        const f = facilities.find(x =>
          Math.abs(x.latitude - data.facility.latitude) < 0.001 &&
          Math.abs(x.longitude - data.facility.longitude) < 0.001
        );
        if (f) handleFacilitySelect(f);
      }
      if (data.type === 'MAP_LOADED') setMapLoading(false);
    } catch {}
  };

  const handleRetry = () => {
    setWebViewKey(k => k + 1);
    getCurrentLocation();
  };

  // ── Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.fullCenter}>
        <StatusBar style="dark" />
        <View style={styles.splashWrap}>
          <View style={styles.splashIcon}>
            <Ionicons name="leaf" size={28} color="#16A34A" />
          </View>
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 24 }} />
          <Text style={styles.splashTitle}>Finding drop-off points</Text>
          <Text style={styles.splashSub}>Locating recycling facilities in Taguig…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error State
  if (error && !location) {
    return (
      <SafeAreaView style={styles.fullCenter}>
        <StatusBar style="dark" />
        <View style={styles.errorWrap}>
          <View style={styles.errorIcon}>
            <Ionicons name="location-outline" size={28} color="#D97706" />
          </View>
          <Text style={styles.errorTitle}>Location unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="dark" />

      {/* ── Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarBack}
          onPress={() => selectedFacility ? clearSelectedFacility() : navigation?.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={selectedFacility ? 'arrow-back' : 'close'} size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {selectedFacility ? selectedFacility.name : 'Drop-off Points'}
          </Text>
          {!selectedFacility && (
            <Text style={styles.topBarSub}>{facilities.length} locations · Taguig City</Text>
          )}
        </View>

        <TouchableOpacity style={styles.topBarAction} onPress={handleRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh-outline" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* ── Map */}
      <View style={styles.mapWrap}>
        <WebView
          ref={webViewRef}
          key={webViewKey}
          source={{ html: generateMapHTML(location, facilities) }}
          style={StyleSheet.absoluteFill}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleWebViewMessage}
          onLoadEnd={() => setMapLoading(false)}
        />

        {mapLoading && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator size="large" color="#16A34A" />
            <Text style={styles.mapOverlayText}>Loading map…</Text>
          </View>
        )}

        {/* Legend */}
        {!selectedFacility && !mapLoading && (
          <View style={styles.legend}>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
                <Text style={styles.legendLabel}>{cfg.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Bottom Sheet */}
      {selectedFacility ? (
        <RoutePanel
          facility={selectedFacility}
          routeInfo={routeInfo}
          isRouteLoading={isRouteLoading}
          error={routeError}
          onRetry={() => getRouteInfo(selectedFacility)}
          onNavigate={openInGoogleMaps}
          onClose={clearSelectedFacility}
        />
      ) : (
        <View style={styles.listSheet}>
          <View style={styles.listSheetHandle} />
          <View style={styles.listSheetHeader}>
            <Ionicons name="map-outline" size={16} color="#64748b" />
            <Text style={styles.listSheetTitle}>Nearest facilities</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listScroll}
          >
            {facilities.map((f, i) => (
              <FacilityCard key={f.id} facility={f} index={i} onPress={handleFacilitySelect} />
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

export default Maps;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  fullCenter: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

  // Splash / Error
  splashWrap: { alignItems: 'center', paddingHorizontal: 32 },
  splashIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
  },
  splashTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginTop: 16 },
  splashSub: { fontSize: 14, color: '#64748b', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  errorWrap: { alignItems: 'center', paddingHorizontal: 32 },
  errorIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginTop: 16 },
  errorBody: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#16A34A',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 24,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  topBarBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  topBarTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  topBarSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  topBarAction: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },

  // Map
  mapWrap: { flex: 1, position: 'relative' },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapOverlayText: { fontSize: 14, color: '#64748b' },

  // Legend
  legend: {
    position: 'absolute',
    top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#475569', fontWeight: '500' },

  // List Sheet
  listSheet: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    paddingBottom: 8,
  },
  listSheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 12,
  },
  listSheetHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, marginBottom: 10,
  },
  listSheetTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', letterSpacing: 0.3 },
  listScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },

  // Facility Card
  facilityCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 6,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1, gap: 4 },
  cardName: { fontSize: 13, fontWeight: '600', color: '#0f172a', lineHeight: 18 },
  cardDistRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDist: { fontSize: 12, color: '#64748b' },
  cardTypes: { fontSize: 11, color: '#94a3b8' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: '#f1f5f9',
  },
  cardCta: { fontSize: 13, fontWeight: '600', color: '#16A34A', flex: 1 },

  // Badge
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 99, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 10, color: '#16A34A', fontWeight: '500' },

  // Route Panel
  routePanel: {
    backgroundColor: '#fff',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  routePanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  routePanelTitleWrap: { flex: 1 },
  routePanelName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  routePanelAddr: { fontSize: 12, color: '#64748b', marginTop: 2 },
  routeCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  routePanelDivider: { height: 0.5, backgroundColor: '#e2e8f0', marginVertical: 14 },

  routeLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  routeLoadingText: { fontSize: 13, color: '#64748b' },

  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  metricBlock: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 0.5, backgroundColor: '#e2e8f0', marginVertical: 4 },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  metricLabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '500' },

  acceptsRow: { marginBottom: 14 },
  acceptsLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', letterSpacing: 0.3 },
  typeChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 5,
    marginRight: 6,
  },
  typeChipText: { fontSize: 12, color: '#334155', fontWeight: '500' },

  gmapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16A34A',
    borderRadius: 12, paddingVertical: 14,
  },
  gmapsBtnText: { color: '#fff', fontWeight: '600', fontSize: 15, flex: 1, textAlign: 'center' },

  routeErrorRow: { gap: 8 },
  routeErrorText: { fontSize: 13, color: '#64748b' },
  retrySmall: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
  },
  retrySmallText: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
});