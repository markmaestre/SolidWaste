import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  
  // Error Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 150,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  alternativeButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 150,
  },
  alternativeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Map Styles
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Info Panel Styles
  infoPanel: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: height * 0.35,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  
  // Facilities List Styles
  facilitiesList: {
    marginBottom: 16,
  },
  facilityChip: {
    backgroundColor: '#f1f8e9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#e8f5e8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  facilityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E8B57',
    marginBottom: 4,
  },
  facilityChipDistance: {
    fontSize: 12,
    color: '#888',
  },
  
  // Action Buttons Styles
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  directionsButton: {
    flex: 1,
    backgroundColor: '#2E8B57',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  directionsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Additional styles for different screen sizes
export const responsiveStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoPanel: {
    ...styles.infoPanel,
    ...(width < 375 && {
      padding: 12,
    }),
  },
  facilityChip: {
    ...styles.facilityChip,
    ...(width < 375 && {
      minWidth: 120,
      paddingHorizontal: 12,
      paddingVertical: 10,
    }),
  },

  // Add these to your existing styles
routePanel: {
  position: 'absolute',
  top: 10,
  left: 10,
  right: 10,
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
  zIndex: 1000,
},
routeTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#2E8B57',
  marginBottom: 10,
},
routeInfo: {
  marginBottom: 10,
},
routeDetail: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 5,
},
routeLabel: {
  fontSize: 14,
  color: '#666',
},
routeValue: {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#2E8B57',
},
travelModes: {
  marginTop: 10,
},
modeLabel: {
  fontSize: 12,
  color: '#666',
  marginBottom: 5,
},
modeButtons: {
  flexDirection: 'row',
  justifyContent: 'space-around',
},
modeButton: {
  padding: 8,
  borderRadius: 20,
  backgroundColor: '#f0f0f0',
  minWidth: 40,
  alignItems: 'center',
},
modeButtonActive: {
  backgroundColor: '#2E8B57',
},
modeButtonText: {
  fontSize: 16,
},
modeButtonTextActive: {
  color: 'white',
},
loadingRoute: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 10,
},
loadingRouteText: {
  marginLeft: 10,
  fontSize: 14,
  color: '#666',
},
infoPanelWithRoute: {
  marginTop: 140, // Make space for the route panel
},
facilityChipSelected: {
  borderColor: '#2E8B57',
  borderWidth: 2,
  backgroundColor: '#f0f8f0',
},
});

export default styles;