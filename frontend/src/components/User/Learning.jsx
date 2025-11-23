import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image
} from 'react-native';

const Learning = () => {
  const [activeTab, setActiveTab] = useState('EducationalSection');

  // Mock navigation function
  const navigateTo = (section) => {
    setActiveTab(section);
  };

  // Educational content data
  const educationalContent = {
    wasteTypes: [
      {
        id: 1,
        title: 'Biodegradable Waste',
        description: 'Organic waste that can be broken down by microorganisms',
        examples: 'Food scraps, garden waste, paper products',
        color: '#4CAF50'
      },
      {
        id: 2,
        title: 'Non-Biodegradable Waste',
        description: 'Waste that does not decompose naturally',
        examples: 'Plastics, glass, metals, electronics',
        color: '#FF9800'
      },
      {
        id: 3,
        title: 'Hazardous Waste',
        description: 'Waste that poses substantial threats to public health',
        examples: 'Batteries, chemicals, medical waste, pesticides',
        color: '#F44336'
      }
    ],
    recyclingTips: [
      'Always clean containers before recycling',
      'Separate different types of materials',
      'Check local recycling guidelines',
      'Reduce and reuse before recycling'
    ]
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
          <Text style={[
            styles.menuText,
            activeTab === 'TipsSection' && styles.activeMenuText
          ]}>
            Tips
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.content}>
        {activeTab === 'EducationalSection' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Types of Waste Materials</Text>
            
            {educationalContent.wasteTypes.map((waste) => (
              <View key={waste.id} style={[styles.wasteCard, { borderLeftColor: waste.color }]}>
                <Text style={[styles.wasteTitle, { color: waste.color }]}>
                  {waste.title}
                </Text>
                <Text style={styles.wasteDescription}>{waste.description}</Text>
                <Text style={styles.wasteExamples}>
                  <Text style={styles.examplesLabel}>Examples: </Text>
                  {waste.examples}
                </Text>
              </View>
            ))}

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Why Proper Waste Management Matters</Text>
              <Text style={styles.infoText}>
                Proper waste segregation helps reduce pollution, conserve resources, 
                and protect our environment for future generations. Learning about 
                different waste types is the first step toward sustainable living.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'QuizSection' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Your Knowledge</Text>
            <View style={styles.quizCard}>
              <Text style={styles.quizQuestion}>
                Which of these items is biodegradable?
              </Text>
              <View style={styles.quizOptions}>
                {['Plastic Bottle', 'Glass Jar', 'Banana Peel', 'Aluminum Can'].map((option, index) => (
                  <TouchableOpacity key={index} style={styles.optionButton} activeOpacity={0.7}>
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'TipsSection' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recycling Tips & Best Practices</Text>
            {educationalContent.recyclingTips.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <Text style={styles.tipNumber}>{index + 1}</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeMenuItem: {
    backgroundColor: '#4CAF50',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeMenuText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  wasteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wasteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  wasteDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  wasteExamples: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  examplesLabel: {
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  quizCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
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
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tipNumber: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: 'bold',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
});

export default Learning;