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
  Modal,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Learning = () => {
  const [activeTab, setActiveTab] = useState('WasteEducation');
  const [aiResponse, setAiResponse] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWasteType, setSelectedWasteType] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Navigate to different sections
  const navigateTo = (section) => {
    setActiveTab(section);
  };

  // Comprehensive educational content for WACS
  const educationalContent = {
    wasteTypes: [
      {
        id: 1,
        title: 'Plastic Waste',
        description: 'Synthetic materials that persist in the environment for hundreds of years',
        examples: 'Bottles, containers, bags, packaging, straws',
        icon: 'local-drink',
        color: '#87CEEB',
        disposalTips: 'Rinse containers, remove caps, check local recycling numbers (#1-7)',
        recyclingProcess: 'Sorted by type, cleaned, shredded, melted, and reformed into new products',
        environmentalImpact: 'Takes 450+ years to decompose, harms marine life, releases toxins when burned',
        wacsCategory: 'Non-Biodegradable',
        co2Impact: 'High - 1.5kg CO₂ per kg recycled',
        alternatives: 'Use reusable bags, bottles, and containers; choose glass or metal packaging'
      },
      {
        id: 2,
        title: 'Paper Waste',
        description: 'Wood-based material that can be recycled multiple times',
        examples: 'Newspapers, cardboard, office paper, magazines, books',
        icon: 'description',
        color: '#B0E0E6',
        disposalTips: 'Keep dry and clean; remove plastic windows and tape',
        recyclingProcess: 'Pulped, screened, de-inked, bleached, and rolled into new paper',
        environmentalImpact: 'Saves trees, water, and energy; reduces landfill methane',
        wacsCategory: 'Biodegradable',
        co2Impact: 'Medium - 0.9kg CO₂ saved per kg recycled',
        alternatives: 'Go digital, print double-sided, use both sides of paper'
      },
      {
        id: 3,
        title: 'Glass Waste',
        description: '100% recyclable material that never loses quality',
        examples: 'Bottles, jars, containers, windows',
        icon: 'wine-bar',
        color: '#4682B4',
        disposalTips: 'Rinse containers, separate by color (clear, green, brown), remove lids',
        recyclingProcess: 'Crushed into cullet, melted, and molded into new glass products',
        environmentalImpact: 'Can be recycled infinitely; reduces mining of raw materials',
        wacsCategory: 'Non-Biodegradable',
        co2Impact: 'Low - 0.6kg CO₂ saved per kg recycled',
        alternatives: 'Use glass storage containers, buy products in returnable glass bottles'
      },
      {
        id: 4,
        title: 'Metal Waste',
        description: 'Valuable materials that can be recycled repeatedly',
        examples: 'Aluminum cans, steel cans, foil, scrap metal',
        icon: 'build',
        color: '#5F9EA0',
        disposalTips: 'Rinse food containers, crush cans to save space',
        recyclingProcess: 'Shredded, melted, purified, and formed into new metal products',
        environmentalImpact: 'Recycling aluminum saves 95% energy vs virgin production',
        wacsCategory: 'Non-Biodegradable',
        co2Impact: 'High - 3-8kg CO₂ saved per kg recycled',
        alternatives: 'Use reusable containers, avoid single-use foil'
      },
      {
        id: 5,
        title: 'Organic Waste',
        description: 'Natural materials that decompose and enrich soil',
        examples: 'Food scraps, yard waste, coffee grounds, eggshells',
        icon: 'grass',
        color: '#8FBC8F',
        disposalTips: 'Compost at home or use municipal green bins; avoid meat and dairy',
        recyclingProcess: 'Decomposes into nutrient-rich compost through aerobic digestion',
        environmentalImpact: 'Reduces methane from landfills; creates natural fertilizer',
        wacsCategory: 'Biodegradable',
        co2Impact: 'Low - 0.1kg CO₂ saved per kg composted',
        alternatives: 'Start a compost bin, use food scraps for broth, meal planning to reduce waste'
      },
      {
        id: 6,
        title: 'Electronic Waste (E-Waste)',
        description: 'Discarded electronics containing hazardous materials and valuable metals',
        examples: 'Phones, computers, TVs, batteries, cables',
        icon: 'devices',
        color: '#6A5ACD',
        disposalTips: 'Never throw in regular trash; use certified e-waste recyclers',
        recyclingProcess: 'Dismantled, sorted, precious metals extracted, components reused',
        environmentalImpact: 'Contains lead, mercury, cadmium; 50-80% exported to developing countries',
        wacsCategory: 'Hazardous',
        co2Impact: 'High - 2.5kg CO₂ saved per kg recycled',
        alternatives: 'Repair devices, buy refurbished, donate working electronics, choose modular designs'
      },
      {
        id: 7,
        title: 'Hazardous Waste',
        description: 'Materials dangerous to human health and environment',
        examples: 'Batteries, paints, chemicals, pesticides, medical waste',
        icon: 'warning',
        color: '#B0C4DE',
        disposalTips: 'Take to designated hazardous waste facilities; never pour down drains',
        recyclingProcess: 'Specialized treatment; neutralization, stabilization, or incineration',
        environmentalImpact: 'Contaminates soil and water; bioaccumulates in food chain',
        wacsCategory: 'Hazardous',
        co2Impact: 'Variable - requires special handling',
        alternatives: 'Use eco-friendly products, proper storage, buy only what you need'
      }
    ],
    recyclingGuides: [
      {
        id: 1,
        title: 'Plastic Recycling Numbers',
        content: '♳ PETE - Beverage bottles (Recyclable)\n♴ HDPE - Milk jugs (Recyclable)\n♵ PVC - Pipes (Difficult)\n♶ LDPE - Bags (Check locally)\n♷ PP - Containers (Recyclable)\n♸ PS - Styrofoam (Not recyclable)\n♹ Other - Mixed plastics (Rarely recyclable)',
        icon: 'format-list-numbered'
      },
      {
        id: 2,
        title: 'What NOT to Recycle',
        content: '• Plastic bags (can jam machines)\n• Pizza boxes (grease contamination)\n• Broken glass (safety hazard)\n• Hazardous waste (chemicals)\n• Electronics (special handling)\n• Styrofoam (not recyclable)',
        icon: 'block'
      },
      {
        id: 3,
        title: 'Recycling Preparation',
        content: '1. Empty and rinse containers\n2. Remove caps and lids\n3. Flatten cardboard boxes\n4. Keep items loose (no bags)\n5. Check local guidelines\n6. When in doubt, throw it out',
        icon: 'cleaning-services'
      }
    ],
    wacsIntegration: [
      {
        title: 'How WACS Helps You',
        features: [
          'AI-powered waste classification from photos',
          'Real-time CO₂ impact calculations',
          'Personalized recycling recommendations',
          'Progress tracking and sustainability score',
          'Environmental impact equivalents'
        ],
        icon: 'insights'
      },
      {
        title: 'Using the Scanner',
        features: [
          'Point camera at waste item',
          'Get instant classification',
          'View recycling instructions',
          'Track your waste history',
          'Earn sustainability points'
        ],
        icon: 'camera-alt'
      }
    ],
    environmentalFacts: [
      {
        fact: "Recycling one aluminum can saves enough energy to run a TV for 3 hours",
        impact: "Energy Conservation",
        icon: "bolt"
      },
      {
        fact: "A plastic bottle takes 450 years to decompose in a landfill",
        impact: "Long-term Pollution",
        icon: "hourglass-empty"
      },
      {
        fact: "The average person generates 4.5 pounds of waste daily",
        impact: "Daily Impact",
        icon: "person"
      },
      {
        fact: "Composting food waste reduces methane emissions by 50%",
        impact: "Climate Action",
        icon: "cloud"
      },
      {
        fact: "Recycling 1 ton of paper saves 17 trees and 7,000 gallons of water",
        impact: "Resource Conservation",
        icon: "park"
      },
      {
        fact: "E-waste is the fastest growing waste stream, growing 3x faster than municipal waste",
        impact: "Digital Impact",
        icon: "speed"
      }
    ]
  };

  // Mock AI function with WACS-specific responses
  const askGemini = async (question) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockResponses = {
      'plastic': 'Plastic recycling in WACS: We classify plastics by resin codes #1-7. Most recyclable are #1 (PETE) and #2 (HDPE). Always rinse containers and remove caps. Check our waste scanner for instant classification!',
      'compost': 'Composting with WACS: Start with greens (food scraps) and browns (dry leaves). Keep moist and turn weekly. Avoid meat, dairy, and oily foods. Track your composting impact in your sustainability score!',
      'recycle': 'WACS Recycling Guide: Our AI analyzes your waste photos and provides personalized recycling instructions. We track your recycling rate and show you exactly how much CO₂ you\'re saving!',
      'hazardous': 'Hazardous Waste in WACS: Never put batteries, paint, or chemicals in regular trash. Use our location feature to find nearby hazardous waste facilities. We flag hazardous items in your scan history.',
      'co2': 'CO₂ Tracking in WACS: We calculate your carbon impact using EPA factors. Each recycled item shows kg of CO₂ saved. Watch your sustainability score grow as you recycle more!',
      'electronic': 'E-Waste in WACS: Our system identifies electronics from photos and provides proper disposal instructions. We partner with certified e-waste recyclers. Track your e-waste diversion in analytics!',
      'default': `Based on your question about "${question}", WACS recommends: 
1. Use our waste scanner for instant classification
2. Check your analytics for personalized insights
3. Visit local recycling guidelines in your area
4. Track your progress in the sustainability dashboard

Remember: Every item properly recycled makes a difference!`
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

  const showWasteDetails = (waste) => {
    setSelectedWasteType(waste);
    setDetailModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="school" size={28} color="#87CEEB" />
        </View>
        <View>
          <Text style={styles.headerTitle}>WACS Learning Center</Text>
          <Text style={styles.headerSubtitle}>
            Master waste management with AI-powered insights
          </Text>
        </View>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'WasteEducation' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('WasteEducation')}
        >
          <Icon 
            name="category" 
            size={20} 
            color={activeTab === 'WasteEducation' ? '#fff' : '#87CEEB'} 
          />
          <Text style={[
            styles.menuText,
            activeTab === 'WasteEducation' && styles.activeMenuText
          ]}>
            Waste Types
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'RecyclingGuides' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('RecyclingGuides')}
        >
          <Icon 
            name="recycling" 
            size={20} 
            color={activeTab === 'RecyclingGuides' ? '#fff' : '#87CEEB'} 
          />
          <Text style={[
            styles.menuText,
            activeTab === 'RecyclingGuides' && styles.activeMenuText
          ]}>
            Recycling 101
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'WACSFeatures' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('WACSFeatures')}
        >
          <Icon 
            name="insights" 
            size={20} 
            color={activeTab === 'WACSFeatures' ? '#fff' : '#87CEEB'} 
          />
          <Text style={[
            styles.menuText,
            activeTab === 'WACSFeatures' && styles.activeMenuText
          ]}>
            How WACS Works
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === 'AIAssistant' && styles.activeMenuItem
          ]}
          onPress={() => navigateTo('AIAssistant')}
        >
          <Icon 
            name="smart-toy" 
            size={20} 
            color={activeTab === 'AIAssistant' ? '#fff' : '#87CEEB'} 
          />
          <Text style={[
            styles.menuText,
            activeTab === 'AIAssistant' && styles.activeMenuText
          ]}>
            AI Guide
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Waste Education Tab */}
        {activeTab === 'WasteEducation' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="category" size={24} color="#333" />
              <Text style={styles.sectionTitle}>Waste Types in WACS</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Tap any waste type for detailed information, recycling tips, and environmental impact
            </Text>
            
            <View style={styles.wasteGrid}>
              {educationalContent.wasteTypes.map((waste) => (
                <TouchableOpacity
                  key={waste.id}
                  style={[styles.wasteCard, { borderLeftColor: waste.color }]}
                  onPress={() => showWasteDetails(waste)}
                  activeOpacity={0.7}
                >
                  <View style={styles.wasteHeader}>
                    <View style={[styles.wasteIcon, { backgroundColor: waste.color + '20' }]}>
                      <Icon name={waste.icon} size={24} color={waste.color} />
                    </View>
                    <View style={styles.wasteHeaderText}>
                      <Text style={styles.wasteTitle}>{waste.title}</Text>
                      <View style={[styles.categoryBadge, { backgroundColor: waste.color + '20' }]}>
                        <Text style={[styles.categoryText, { color: waste.color }]}>
                          {waste.wacsCategory}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.wasteDescription} numberOfLines={2}>
                    {waste.description}
                  </Text>
                  <View style={styles.wasteExamples}>
                    <Icon name="list" size={14} color="#87CEEB" />
                    <Text style={styles.examplesText} numberOfLines={1}>
                      {waste.examples}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Environmental Facts */}
            <View style={styles.factsSection}>
              <View style={styles.sectionHeader}>
                <Icon name="fact-check" size={24} color="#333" />
                <Text style={styles.sectionTitle}>Environmental Facts</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.factsScroll}>
                {educationalContent.environmentalFacts.map((fact, index) => (
                  <View key={index} style={styles.factCard}>
                    <Icon name={fact.icon} size={24} color="#87CEEB" />
                    <Text style={styles.factText}>{fact.fact}</Text>
                    <View style={styles.impactTag}>
                      <Text style={styles.impactText}>{fact.impact}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Recycling Guides Tab */}
        {activeTab === 'RecyclingGuides' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="recycling" size={24} color="#333" />
              <Text style={styles.sectionTitle}>Recycling 101</Text>
            </View>

            {educationalContent.recyclingGuides.map((guide) => (
              <View key={guide.id} style={styles.guideCard}>
                <View style={styles.guideHeader}>
                  <View style={styles.guideIcon}>
                    <Icon name={guide.icon} size={24} color="#87CEEB" />
                  </View>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                </View>
                <Text style={styles.guideContent}>{guide.content}</Text>
              </View>
            ))}

            <View style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Icon name="emoji-events" size={20} color="#87CEEB" />
                <Text style={styles.tipHeaderText}>Pro Tip</Text>
              </View>
              <Text style={styles.tipContent}>
                Use WACS Scanner to instantly identify if an item is recyclable. 
                Our AI recognizes over 100 different materials and provides specific disposal instructions!
              </Text>
            </View>
          </View>
        )}

        {/* WACS Features Tab */}
        {activeTab === 'WACSFeatures' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="insights" size={24} color="#333" />
              <Text style={styles.sectionTitle}>How WACS Works</Text>
            </View>

            {educationalContent.wacsIntegration.map((item, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureHeader}>
                  <Icon name={item.icon} size={28} color="#87CEEB" />
                  <Text style={styles.featureTitle}>{item.title}</Text>
                </View>
                {item.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Icon name="check-circle" size={16} color="#87CEEB" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'AIAssistant' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="smart-toy" size={24} color="#333" />
              <Text style={styles.sectionTitle}>WACS AI Guide</Text>
            </View>
            
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <View style={styles.aiAvatar}>
                  <Icon name="support-agent" size={32} color="#87CEEB" />
                </View>
                <View style={styles.aiWelcome}>
                  <Text style={styles.aiWelcomeTitle}>Hi! I'm your WACS Guide</Text>
                  <Text style={styles.aiWelcomeText}>
                    Ask me anything about waste management, recycling, or how to use WACS features
                  </Text>
                </View>
              </View>
              
              <TextInput
                style={styles.questionInput}
                placeholder="Type your question here..."
                value={userQuestion}
                onChangeText={setUserQuestion}
                multiline
                maxLength={200}
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
                    <Icon name="send" size={20} color="#fff" />
                    <Text style={styles.askButtonText}>Ask WACS AI</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.sampleQuestions}>
                <Text style={styles.sampleTitle}>Try asking about:</Text>
                <View style={styles.sampleGrid}>
                  {[
                    "How to recycle plastic?",
                    "What is e-waste?",
                    "How does WACS calculate CO2?",
                    "Composting tips",
                    "Hazardous waste disposal",
                    "Recycling numbers guide"
                  ].map((question, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.sampleButton}
                      onPress={() => setUserQuestion(question)}
                    >
                      <Icon name="search" size={14} color="#87CEEB" />
                      <Text style={styles.sampleButtonText}>{question}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Waste Type Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedWasteType && (
              <>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailHeader}>
                    <View style={[styles.detailIcon, { backgroundColor: selectedWasteType.color + '20' }]}>
                      <Icon name={selectedWasteType.icon} size={40} color={selectedWasteType.color} />
                    </View>
                    <Text style={styles.detailTitle}>{selectedWasteType.title}</Text>
                    <View style={[styles.detailBadge, { backgroundColor: selectedWasteType.color + '20' }]}>
                      <Text style={[styles.detailBadgeText, { color: selectedWasteType.color }]}>
                        {selectedWasteType.wacsCategory}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Description</Text>
                    <Text style={styles.detailText}>{selectedWasteType.description}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Common Examples</Text>
                    <View style={styles.examplesList}>
                      {selectedWasteType.examples.split(', ').map((item, index) => (
                        <View key={index} style={styles.exampleItem}>
                          <Icon name="fiber-manual-record" size={8} color={selectedWasteType.color} />
                          <Text style={styles.exampleItemText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Disposal Tips</Text>
                    <Text style={styles.detailText}>{selectedWasteType.disposalTips}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Recycling Process</Text>
                    <Text style={styles.detailText}>{selectedWasteType.recyclingProcess}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Environmental Impact</Text>
                    <Text style={styles.detailText}>{selectedWasteType.environmentalImpact}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>CO₂ Impact</Text>
                    <Text style={styles.detailText}>{selectedWasteType.co2Impact}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Sustainable Alternatives</Text>
                    <Text style={styles.detailText}>{selectedWasteType.alternatives}</Text>
                  </View>
                </ScrollView>

                <TouchableOpacity 
                  style={styles.closeDetailButton}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Icon name="close" size={20} color="#fff" />
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
              <View style={styles.modalHeaderIcon}>
                <Icon name="smart-toy" size={24} color="#87CEEB" />
              </View>
              <Text style={styles.modalTitle}>WACS AI Response</Text>
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  menuItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  activeMenuItem: {
    backgroundColor: '#87CEEB',
  },
  menuText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#87CEEB',
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
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  wasteGrid: {
    gap: 12,
  },
  wasteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  wasteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  wasteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  wasteHeaderText: {
    flex: 1,
  },
  wasteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  wasteDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  wasteExamples: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  examplesText: {
    fontSize: 12,
    color: '#888',
    flex: 1,
  },
  factsSection: {
    marginTop: 20,
  },
  factsScroll: {
    marginTop: 12,
  },
  factCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  factText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 12,
    lineHeight: 20,
  },
  impactTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#87CEEB',
  },
  guideCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  guideContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#87CEEB',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  tipContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statsPreview: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#87CEEB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  aiAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiWelcome: {
    flex: 1,
  },
  aiWelcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  aiWelcomeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  askButton: {
    backgroundColor: '#87CEEB',
    padding: 16,
    borderRadius: 12,
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
    marginTop: 8,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sampleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleButton: {
    backgroundColor: '#f0f8ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#87CEEB',
  },
  sampleButtonText: {
    fontSize: 12,
    color: '#333',
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
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
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
    marginBottom: 20,
    gap: 12,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  responseContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#87CEEB',
    padding: 14,
    borderRadius: 12,
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
  detailHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  examplesList: {
    gap: 6,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exampleItemText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  closeDetailButton: {
    backgroundColor: '#87CEEB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
});

export default Learning;