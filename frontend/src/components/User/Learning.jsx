import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Learning = () => {
  const [activeTab, setActiveTab] = useState('EducationalSection');
  const [aiResponse, setAiResponse] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Mock navigation function
  const navigateTo = (section) => {
    setActiveTab(section);
  };

  // Educational content data - Expanded
  const educationalContent = {
    wasteTypes: [
      {
        id: 1,
        title: 'Biodegradable Waste',
        description: 'Organic waste that can be broken down by microorganisms',
        examples: 'Food scraps, garden waste, paper products',
        icon: 'nature',
        disposalTips: 'Compost at home or use municipal composting facilities'
      },
      {
        id: 2,
        title: 'Non-Biodegradable Waste',
        description: 'Waste that does not decompose naturally',
        examples: 'Plastics, glass, metals, electronics',
        icon: 'inventory-2',
        disposalTips: 'Recycle through proper channels or reuse when possible'
      },
      {
        id: 3,
        title: 'Hazardous Waste',
        description: 'Waste that poses substantial threats to public health',
        examples: 'Batteries, chemicals, medical waste, pesticides',
        icon: 'warning',
        disposalTips: 'Handle with care and dispose at designated hazardous waste facilities'
      },
      {
        id: 4,
        title: 'E-Waste',
        description: 'Discarded electronic devices and equipment',
        examples: 'Computers, phones, TVs, batteries',
        icon: 'devices',
        disposalTips: 'Take to e-waste recycling centers - never throw in regular trash'
      },
      {
        id: 5,
        title: 'Construction Waste',
        description: 'Waste generated from construction and demolition activities',
        examples: 'Concrete, wood, metals, insulation materials',
        icon: 'construction',
        disposalTips: 'Separate materials for recycling and use specialized disposal services'
      }
    ],
    recyclingTips: [
      'Always clean containers before recycling',
      'Separate different types of materials',
      'Check local recycling guidelines',
      'Reduce and reuse before recycling',
      'Remove caps and lids from bottles',
      'Flatten cardboard boxes to save space',
      'Know what can and cannot be recycled in your area',
      'Avoid "wishcycling" - putting non-recyclables in recycling bins'
    ],
    environmentalFacts: [
      {
        fact: "Recycling one aluminum can saves enough energy to run a TV for 3 hours",
        impact: "Energy Conservation"
      },
      {
        fact: "Plastic bottles take 450 years to decompose in landfill",
        impact: "Long-term Pollution"
      },
      {
        fact: "The average person generates over 4 pounds of trash daily",
        impact: "Waste Generation"
      },
      {
        fact: "Composting food waste reduces methane emissions from landfills",
        impact: "Climate Change Mitigation"
      }
    ]
  };

  // Mock AI function (in real app, you'd call Gemini API)
  const askGemini = async (question) => {
    setLoading(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock responses based on common waste management questions
    const mockResponses = {
      'how to compost': 'Composting is easy! Start with a mix of greens (food scraps) and browns (dry leaves). Keep it moist and turn regularly. Avoid meat and dairy in home compost.',
      'what can be recycled': 'Common recyclables include paper, cardboard, glass bottles, aluminum cans, and plastic containers #1 and #2. Always check local guidelines.',
      'hazardous waste disposal': 'Hazardous waste like batteries, paint, and chemicals should be taken to designated collection facilities. Never pour down drains or throw in regular trash.',
      'reduce plastic use': 'Use reusable bags, bottles, and containers. Choose products with less packaging. Support brands using sustainable materials.',
      'default': `Based on your question about "${question}", I recommend: 1) Check local waste management guidelines 2) Separate materials properly 3) When in doubt, contact your local waste authority. Remember: Reduce and Reuse come before Recycling!`
    };

    const lowerQuestion = question.toLowerCase();
    let response = mockResponses.default;

    for (const [key, value] of Object.entries(mockResponses)) {
      if (lowerQuestion.includes(key) && key !== 'default') {
        response = value;
        break;
      }
    }

    setAiResponse(response);
    setLoading(false);
    setModalVisible(true);
  };

  const handleAskAI = () => {
    if (!userQuestion.trim()) {
      Alert.alert('Error', 'Please enter a question about waste management');
      return;
    }
    askGemini(userQuestion);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'EducationalSection' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('EducationalSection')}
          activeOpacity={0.7}
        >
          <Icon 
            name="school" 
            size={20} 
            color={activeTab === 'EducationalSection' ? '#fff' : '#87CEEB'} 
            style={styles.menuIcon}
          />
          <Text style={[
            styles.menuText,
            activeTab === 'EducationalSection' && styles.activeMenuText
          ]}>
            Learn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'QuizSection' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('QuizSection')}
          activeOpacity={0.7}
        >
          <Icon 
            name="quiz" 
            size={20} 
            color={activeTab === 'QuizSection' ? '#fff' : '#87CEEB'} 
            style={styles.menuIcon}
          />
          <Text style={[
            styles.menuText,
            activeTab === 'QuizSection' && styles.activeMenuText
          ]}>
            Quiz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'TipsSection' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('TipsSection')}
          activeOpacity={0.7}
        >
          <Icon 
            name="lightbulb" 
            size={20} 
            color={activeTab === 'TipsSection' ? '#fff' : '#87CEEB'} 
            style={styles.menuIcon}
          />
          <Text style={[
            styles.menuText,
            activeTab === 'TipsSection' && styles.activeMenuText
          ]}>
            Tips
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'AIAssistant' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('AIAssistant')}
          activeOpacity={0.7}
        >
          <Icon 
            name="smart-toy" 
            size={20} 
            color={activeTab === 'AIAssistant' ? '#fff' : '#87CEEB'} 
            style={styles.menuIcon}
          />
          <Text style={[
            styles.menuText,
            activeTab === 'AIAssistant' && styles.activeMenuText
          ]}>
            AI Assistant
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.content}>
        {activeTab === 'EducationalSection' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Types of Waste Materials</Text>
            
            {educationalContent.wasteTypes.map((waste) => (
              <View key={waste.id} style={styles.wasteCard}>
                <View style={styles.wasteHeader}>
                  <View style={styles.iconContainer}>
                    <Icon name={waste.icon} size={24} color="#87CEEB" />
                  </View>
                  <Text style={styles.wasteTitle}>
                    {waste.title}
                  </Text>
                </View>
                <Text style={styles.wasteDescription}>{waste.description}</Text>
                <View style={styles.examplesContainer}>
                  <Icon name="list" size={16} color="#87CEEB" />
                  <Text style={styles.wasteExamples}>
                    <Text style={styles.examplesLabel}>Examples: </Text>
                    {waste.examples}
                  </Text>
                </View>
                <View style={styles.disposalTip}>
                  <Icon name="eco" size={16} color="#87CEEB" />
                  <Text style={styles.tipText}>{waste.disposalTips}</Text>
                </View>
              </View>
            ))}

            <View style={styles.infoBox}>
              <View style={styles.infoHeader}>
                <Icon name="info" size={20} color="#87CEEB" />
                <Text style={styles.infoTitle}>Why Proper Waste Management Matters</Text>
              </View>
              <Text style={styles.infoText}>
                Proper waste segregation helps reduce pollution, conserve resources, 
                and protect our environment for future generations. Learning about 
                different waste types is the first step toward sustainable living.
              </Text>
            </View>

            <View style={styles.factsSection}>
              <View style={styles.sectionHeader}>
                <Icon name="fact-check" size={24} color="#333" />
                <Text style={styles.factsTitle}>Environmental Facts</Text>
              </View>
              {educationalContent.environmentalFacts.map((fact, index) => (
                <View key={index} style={styles.factCard}>
                  <Icon name="star" size={16} color="#87CEEB" />
                  <Text style={styles.factText}>{fact.fact}</Text>
                  <View style={styles.impactTag}>
                    <Text style={styles.impactText}>{fact.impact}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'QuizSection' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="quiz" size={28} color="#333" />
              <Text style={styles.sectionTitle}>Test Your Knowledge</Text>
            </View>
            
            <View style={styles.quizCard}>
              <View style={styles.quizHeader}>
                <Icon name="help" size={20} color="#87CEEB" />
                <Text style={styles.quizQuestion}>
                  Which of these items is biodegradable?
                </Text>
              </View>
              <View style={styles.quizOptions}>
                {['Plastic Bottle', 'Glass Jar', 'Banana Peel', 'Aluminum Can'].map((option, index) => (
                  <TouchableOpacity key={index} style={styles.optionButton} activeOpacity={0.7}>
                    <Icon name="radio-button-unchecked" size={20} color="#87CEEB" />
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.quizCard}>
              <View style={styles.quizHeader}>
                <Icon name="help" size={20} color="#87CEEB" />
                <Text style={styles.quizQuestion}>
                  Where should you dispose of used batteries?
                </Text>
              </View>
              <View style={styles.quizOptions}>
                {['Regular Trash', 'Recycling Bin', 'Hazardous Waste Facility', 'Compost'].map((option, index) => (
                  <TouchableOpacity key={index} style={styles.optionButton} activeOpacity={0.7}>
                    <Icon name="radio-button-unchecked" size={20} color="#87CEEB" />
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'TipsSection' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
       
              <Text style={styles.sectionTitle}>Recycling Tips & Best Practices</Text>
            </View>
            
            {educationalContent.recyclingTips.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <View style={styles.tipNumber}>
                  <Text style={styles.tipNumberText}>{index + 1}</Text>
                </View>
                <Icon name="trending-up" size={20} color="#87CEEB" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
            
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Icon name="track-changes" size={24} color="#333" />
                <Text style={styles.progressTitle}>Your Eco-Progress</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '65%' }]} />
              </View>
              <Text style={styles.progressText}>You've learned 13 of 20 waste management tips!</Text>
            </View>
          </View>
        )}

        {activeTab === 'AIAssistant' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="" size={28} color="#333" />
              <Text style={styles.sectionTitle}>AI Waste Management Assistant</Text>
            </View>
            
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Icon name="support-agent" size={24} color="#87CEEB" />
                <Text style={styles.aiDescription}>
                  Ask me anything about waste management, recycling, composting, or environmental tips!
                </Text>
              </View>
              
              <TextInput
                style={styles.questionInput}
                placeholder="e.g., How do I start composting at home?"
                value={userQuestion}
                onChangeText={setUserQuestion}
                multiline
              />
              
              <TouchableOpacity 
                style={styles.askButton} 
                onPress={handleAskAI}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="auto-awesome" size={20} color="#fff" />
                    <Text style={styles.askButtonText}>Ask Gemini AI</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.sampleQuestions}>
                <View style={styles.sampleHeader}>
                  <Icon name="explore" size={20} color="#333" />
                  <Text style={styles.sampleTitle}>Try asking:</Text>
                </View>
                {[
                  "How to compost?",
                  "What can be recycled?",
                  "Hazardous waste disposal",
                  "How to reduce plastic use?"
                ].map((question, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.sampleQuestion}
                    onPress={() => setUserQuestion(question)}
                  >
                    <Icon name="search" size={16} color="#87CEEB" />
                    <Text style={styles.sampleQuestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* AI Response Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="smart-toy" size={24} color="#87CEEB" />
              <Text style={styles.modalTitle}>Gemini AI Response</Text>
            </View>
            <ScrollView style={styles.responseContainer}>
              <Text style={styles.responseText}>{aiResponse}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={20} color="#fff" />
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  menuItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
    flexDirection: 'column',
  },
  activeMenuItem: {
    backgroundColor: '#87CEEB',
  },
  menuIcon: {
    marginBottom: 4,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#87CEEB',
    textAlign: 'center',
  },
  activeMenuText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  wasteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#87CEEB',
  },
  wasteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  wasteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  wasteDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  examplesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  wasteExamples: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    flex: 1,
  },
  examplesLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  disposalTip: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#87CEEB',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  factsSection: {
    marginTop: 20,
  },
  factsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  factCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  factText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  impactTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#e1f5fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  impactText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#87CEEB',
  },
  quizCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    lineHeight: 24,
  },
  quizOptions: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tipNumber: {
    backgroundColor: '#87CEEB',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#87CEEB',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  aiCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  aiDescription: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    lineHeight: 22,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  askButton: {
    backgroundColor: '#87CEEB',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  askButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sampleQuestions: {
    marginTop: 10,
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sampleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sampleQuestion: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#87CEEB',
  },
  sampleQuestionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  responseContainer: {
    maxHeight: 400,
    marginBottom: 15,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#87CEEB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Learning;