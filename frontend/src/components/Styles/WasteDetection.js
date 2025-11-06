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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 14,
    color: '#B0C4DE',
  },

  // User Info
  userInfo: {
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#0f3460',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#87CEEB',
  },

  userText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '500',
  },

  // Section
  section: {
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#16213e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 12,
  },

  // Location Section
  locationSection: {
    marginHorizontal: 20,
    marginTop: 15,
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
    fontSize: 14,
    backgroundColor: '#0f3460',
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
    fontSize: 14,
    fontWeight: '600',
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },

  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#87CEEB',
  },

  cameraButton: {
    flex: 1,
    backgroundColor: '#0f3460',
  },

  galleryButton: {
    flex: 1,
    backgroundColor: '#0f3460',
  },

  historyButton: {
    marginHorizontal: 20,
    marginVertical: 10,
    backgroundColor: '#0f3460',
  },

  detectButton: {
    backgroundColor: '#0f3460',
    marginHorizontal: 0,
    marginVertical: 10,
  },

  reportButton: {
    backgroundColor: '#0f3460',
    marginHorizontal: 0,
    marginVertical: 10,
  },

  buttonText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '600',
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
  },

  previewImage: {
    width: screenWidth * 0.9,
    height: screenWidth * 0.75,
    backgroundColor: '#000',
  },

  boundingBox: {
    borderWidth: 2,
  },

  labelBox: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },

  labelText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },

  loadingText: {
    marginTop: 15,
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '500',
  },

  detectSection: {
    marginHorizontal: 0,
    marginVertical: 10,
  },

  reportSection: {
    marginHorizontal: 0,
    marginVertical: 10,
  },

  // Results Section
  resultsSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    gap: 15,
  },

  summaryCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#87CEEB',
  },

  summaryLabel: {
    fontSize: 12,
    color: '#B0C4DE',
    marginTop: 5,
  },

  classificationCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 12,
  },

  classificationBadge: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },

  classificationText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textTransform: 'capitalize',
  },

  confidenceText: {
    fontSize: 12,
    color: '#1a1a2e',
    marginTop: 5,
    fontWeight: '600',
  },

  objectsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#0f3460',
  },

  objectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },

  objectInfo: {
    flex: 1,
  },

  objectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#87CEEB',
    marginBottom: 5,
    textTransform: 'capitalize',
  },

  objectDetails: {
    fontSize: 12,
    color: '#B0C4DE',
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
    fontSize: 13,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 15,
    textAlign: 'center',
  },

  reportSummary: {
    marginBottom: 15,
    maxHeight: screenHeight * 0.3,
  },

  reportSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#87CEEB',
    marginBottom: 10,
  },

  reportDetail: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },

  reportDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0C4DE',
    marginBottom: 4,
  },

  reportDetailValue: {
    fontSize: 13,
    color: '#87CEEB',
    fontWeight: '500',
  },

  messageSection: {
    marginBottom: 15,
  },

  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0C4DE',
    marginBottom: 8,
  },

  messageInput: {
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#87CEEB',
    fontSize: 13,
    backgroundColor: '#0f3460',
    textAlignVertical: 'top',
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },

  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
  },

  cancelButton: {
    backgroundColor: '#0f3460',
    borderColor: '#B0C4DE',
  },

  cancelButtonText: {
    color: '#B0C4DE',
    fontSize: 14,
    fontWeight: '600',
  },

  confirmButton: {
    backgroundColor: '#87CEEB',
    borderColor: '#87CEEB',
  },

  confirmButtonText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: '700',
  },
});