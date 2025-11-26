import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  
  contentContainer: {
    paddingBottom: 40,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#87CEEB',
  },

  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#0f3460',
    alignSelf: 'flex-start',
  },

  backButtonPressed: {
    opacity: 0.7,
  },

  backButtonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 4,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    color: '#B0C4DE',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Demo Mode Indicator
  demoIndicator: {
    backgroundColor: '#FFA500',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },

  demoIndicatorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // User Info
  userInfo: {
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#87CEEB',
  },

  userText: {
    color: '#87CEEB',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Section
  section: {
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 12,
    textAlign: 'center',
  },

  // Location Section
  locationSection: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  locationInput: {
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: '#87CEEB',
    fontSize: 13,
    backgroundColor: '#0f3460',
    textAlign: 'center',
  },

  locationButton: {
    backgroundColor: '#0f3460',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },

  locationButtonText: {
    color: '#87CEEB',
    fontSize: 13,
    fontWeight: '600',
  },

  // Buttons
  buttonContainer: {
    gap: 10,
  },

  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#87CEEB',
    marginBottom: 8,
  },

  cameraButton: {
    backgroundColor: '#0f3460',
  },

  galleryButton: {
    backgroundColor: '#0f3460',
  },

  demoButton: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },

  historyButton: {
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: '#0f3460',
  },

  detectButton: {
    backgroundColor: '#0f3460',
    marginHorizontal: 0,
    marginVertical: 8,
  },

  reportButton: {
    backgroundColor: '#0f3460',
    marginHorizontal: 0,
    marginVertical: 8,
  },

  buttonText: {
    color: '#87CEEB',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  demoButtonText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  buttonPressed: {
    opacity: 0.7,
  },

  disabledButton: {
    opacity: 0.5,
  },

  // Image Container
  imageContainer: {
    position: 'relative',
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#0f3460',
    alignSelf: 'center',
  },

  previewImage: {
    width: screenWidth * 0.85,
    height: screenWidth * 0.7,
    backgroundColor: '#000',
  },

  boundingBox: {
    borderWidth: 2,
  },

  labelBox: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    position: 'absolute',
    top: -20,
    left: 0,
  },

  labelText: {
    color: '#1a1a2e',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Loading
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 25,
  },

  loadingText: {
    marginTop: 12,
    color: '#87CEEB',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  detectSection: {
    marginHorizontal: 0,
    marginVertical: 8,
  },

  reportSection: {
    marginHorizontal: 0,
    marginVertical: 8,
  },

  // Results Section
  resultsSection: {
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
    gap: 12,
  },

  // Demo Notice
  demoNotice: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    marginBottom: 12,
  },

  demoNoticeText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },

  summaryCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 12,
    textAlign: 'center',
  },

  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#87CEEB',
    textAlign: 'center',
  },

  summaryLabel: {
    fontSize: 11,
    color: '#B0C4DE',
    marginTop: 4,
    textAlign: 'center',
  },

  classificationCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 12,
    textAlign: 'center',
  },

  classificationBadge: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },

  classificationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textTransform: 'capitalize',
    textAlign: 'center',
  },

  confidenceText: {
    fontSize: 11,
    color: '#1a1a2e',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },

  objectsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  objectItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },

  objectItemLast: {
    borderBottomWidth: 0,
  },

  objectInfo: {
    flex: 1,
  },

  objectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#87CEEB',
    marginBottom: 4,
    textTransform: 'capitalize',
    textAlign: 'center',
  },

  objectDetails: {
    fontSize: 11,
    color: '#B0C4DE',
    textAlign: 'center',
    lineHeight: 14,
  },

  tipsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  tipItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#0f3460',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#87CEEB',
  },

  tipText: {
    color: '#87CEEB',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: screenHeight * 0.8,
    borderTopWidth: 2,
    borderTopColor: '#87CEEB',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 15,
    textAlign: 'center',
  },

  // Demo Modal Notice
  demoModalNotice: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },

  demoModalNoticeText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },

  reportSummary: {
    marginBottom: 15,
    maxHeight: screenHeight * 0.25,
  },

  reportSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 10,
    textAlign: 'center',
  },

  reportDetail: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },

  reportDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B0C4DE',
    marginBottom: 4,
    textAlign: 'center',
  },

  reportDetailValue: {
    fontSize: 12,
    color: '#87CEEB',
    fontWeight: '500',
    textAlign: 'center',
  },

  messageSection: {
    marginBottom: 15,
  },

  messageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B0C4DE',
    marginBottom: 8,
    textAlign: 'center',
  },

  messageInput: {
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#87CEEB',
    fontSize: 12,
    backgroundColor: '#0f3460',
    textAlignVertical: 'top',
    minHeight: 80,
    textAlign: 'left',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },

  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },

  cancelButton: {
    backgroundColor: '#0f3460',
    borderColor: '#B0C4DE',
  },

  cancelButtonText: {
    color: '#B0C4DE',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  confirmButton: {
    backgroundColor: '#87CEEB',
    borderColor: '#87CEEB',
  },

  confirmButtonText: {
    color: '#1a1a2e',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Additional utility styles
  textCenter: {
    textAlign: 'center',
  },

  flexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  marginBottomSmall: {
    marginBottom: 8,
  },

  marginBottomMedium: {
    marginBottom: 12,
  },

  paddingSmall: {
    padding: 8,
  },

  paddingMedium: {
    padding: 12,
  },
});