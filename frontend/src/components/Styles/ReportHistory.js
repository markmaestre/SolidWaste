import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#0EA5E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#0EA5E9',
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0EA5E9',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  headerRight: {
    width: 70,
  },

  // List Content
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20,
  },

  // Report Card Styles
  reportCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  classificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },

  classificationText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0EA5E9',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },

  cardContent: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },

  reportImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#0EA5E9',
  },

  reportInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },

  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5E9',
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  confidenceText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 4,
    fontWeight: '600',
  },

  objectsText: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 4,
    fontWeight: '600',
  },

  locationText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 4,
  },

  cardActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#0F172A',
  },

  actionButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },

  viewButton: {
    backgroundColor: '#0EA5E9',
  },

  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  deleteButton: {
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#DC2626',
  },

  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0EA5E9',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  scanButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4.65,
    elevation: 8,
  },

  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 16,
    color: '#0EA5E9',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  loader: {
    marginVertical: 20,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.85,
    paddingTop: 0,
    borderTopWidth: 2,
    borderTopColor: '#0EA5E9',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0EA5E9',
    letterSpacing: 0.5,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    color: '#0EA5E9',
    fontSize: 22,
    fontWeight: '700',
  },

  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  detailImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },

  detailSection: {
    marginBottom: 20,
  },

  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0EA5E9',
    marginBottom: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  classificationBadgeLarge: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },

  classificationTextLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
  },

  confidenceTextLarge: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    fontWeight: '600',
    opacity: 0.9,
  },

  statusBadgeLarge: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },

  statusTextLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },

  objectItem: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
  },

  objectLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0EA5E9',
    marginBottom: 6,
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },

  objectDetails: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '500',
  },

  locationTextDetail: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },

  coordinatesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 8,
  },

  tipItem: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },

  tipText: {
    fontSize: 13,
    color: '#0EA5E9',
    fontWeight: '600',
    lineHeight: 18,
  },

  dateTextDetail: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '600',
  },

  adminNotesText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Confirmation Modal
  confirmModalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginHorizontal: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },

  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  confirmModalText: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontWeight: '500',
  },

  confirmModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },

  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },

  cancelConfirmButton: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569',
  },

  cancelConfirmButtonText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  deleteConfirmButton: {
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#DC2626',
  },

  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Add these styles to your existing ReportHistory styles

// Image Viewer Styles
imageContainer: {
  position: 'relative',
  borderRadius: 8,
  overflow: 'hidden',
  marginRight: 12,
},

imageOverlay: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  padding: 4,
},

overlayText: {
  color: 'white',
  fontSize: 10,
  textAlign: 'center',
},

imageContainerDetail: {
  position: 'relative',
  borderRadius: 8,
  overflow: 'hidden',
  marginBottom: 15,
},

imageOverlayDetail: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  padding: 8,
},

overlayTextDetail: {
  color: 'white',
  fontSize: 12,
  textAlign: 'center',
  fontWeight: '500',
},

// Full Screen Image Viewer
fullImageContainer: {
  flex: 1,
  backgroundColor: '#000000',
},

fullImageWrapper: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#000000',
},

fullImage: {
  width: '100%',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '100%',
},

imageLoadingContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#000000',
  zIndex: 10,
},

imageLoadingText: {
  color: '#0077b6',
  marginTop: 10,
  fontSize: 16,
},

imageViewerHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: 50,
  paddingHorizontal: 15,
  paddingBottom: 15,
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  borderBottomWidth: 1,
  borderBottomColor: '#333',
},

imageViewerTitle: {
  color: 'white',
  fontSize: 18,
  fontWeight: 'bold',
  flex: 1,
  textAlign: 'center',
},

toggleButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  alignItems: 'center',
  justifyContent: 'center',
},

toggleButtonText: {
  fontSize: 20,
  color: 'white',
},

fullBoundingBox: {
  position: 'absolute',
  borderWidth: 2,
  borderRadius: 4,
  zIndex: 5,
},

fullLabelBox: {
  position: 'absolute',
  top: -25,
  left: 0,
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 4,
  minWidth: 100,
  maxWidth: 180,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.8,
  shadowRadius: 3,
  elevation: 5,
},

fullLabelText: {
  color: 'white',
  fontSize: 10,
  fontWeight: 'bold',
  textAlign: 'center',
},

imageViewerFooter: {
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  padding: 15,
  borderTopWidth: 1,
  borderTopColor: '#333',
},

imageViewerInfo: {
  color: 'white',
  fontSize: 14,
  textAlign: 'center',
  marginBottom: 10,
},

detectionSummary: {
  flexDirection: 'row',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: 15,
  marginBottom: 15,
},

categoryCount: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},

categoryDot: {
  width: 12,
  height: 12,
  borderRadius: 6,
},

categoryText: {
  color: 'white',
  fontSize: 12,
  fontWeight: '500',
},

imageViewerActions: {
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 15,
},

detectionsButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 25,
  gap: 8,
},

detectionsButtonText: {
  fontSize: 14,
  fontWeight: '600',
  color: 'white',
},

// Update existing modal styles
modalContent: {
  backgroundColor: 'white',
  borderRadius: 16,
  width: '90%',
  maxHeight: '85%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 10,
},

detailImage: {
  width: '100%',
  height: 200,
  borderRadius: 8,
},

// Update object item styles for better display
objectItem: {
  backgroundColor: '#F8F9FA',
  padding: 12,
  borderRadius: 8,
  marginBottom: 8,
  borderLeftWidth: 4,
},
});