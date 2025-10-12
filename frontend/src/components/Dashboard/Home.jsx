import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  StatusBar,
  TextInput,
  SafeAreaView,
} from 'react-native';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: ''
  });

  const handleFormChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
    alert('Thank you for contacting us! We will respond within 24 hours.');
    setFormData({
      name: '',
      email: '',
      phone: '',
      organization: '',
      message: ''
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Navigation */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>WasteWise</Text>
        </View>

        <View style={styles.navLinks}>
          <TouchableOpacity 
            style={styles.navLink}
            onPress={() => setActiveTab('home')}
          >
            <Text style={[styles.navLinkText, activeTab === 'home' && styles.navLinkActive]}>
              Home
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navLink}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.navLinkText, activeTab === 'about' && styles.navLinkActive]}>
              About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navLink}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[styles.navLinkText, activeTab === 'services' && styles.navLinkActive]}>
              Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navLink}
            onPress={() => setActiveTab('contact')}
          >
            <Text style={[styles.navLinkText, activeTab === 'contact' && styles.navLinkActive]}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'home' && (
          <>
            {/* Hero Banner */}
            <View style={styles.heroBanner}>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>Smart Waste Management Solutions</Text>
                <Text style={styles.heroSubtitle}>
                  Revolutionizing waste classification with advanced AI technology for a sustainable future
                </Text>
                <View style={styles.heroButtons}>
                  <TouchableOpacity
                    style={styles.heroBtnPrimary}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.heroBtnPrimaryText}>Get Started</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.heroBtnSecondary}
                    onPress={() => navigation.navigate('Register')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.heroBtnSecondaryText}>Learn More</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.section}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>99%</Text>
                  <Text style={styles.statLabel}>Classification Accuracy</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>24/7</Text>
                  <Text style={styles.statLabel}>Technical Support</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>10K+</Text>
                  <Text style={styles.statLabel}>Active Users</Text>
                </View>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Why Choose WasteWise</Text>
              
              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>AI-Powered Classification</Text>
                <Text style={styles.featureText}>
                  Our advanced machine learning algorithms ensure accurate waste identification and sorting recommendations.
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Real-Time Analytics</Text>
                <Text style={styles.featureText}>
                  Access comprehensive data insights to optimize your waste management operations and track sustainability metrics.
                </Text>
              </View>

              <View style={styles.featureCard}>
                <Text style={styles.featureTitle}>Scalable Solutions</Text>
                <Text style={styles.featureText}>
                  Whether you're managing waste for a household or an entire municipality, our platform scales to meet your needs.
                </Text>
              </View>
            </View>

            {/* CTA Section */}
            <View style={styles.ctaSection}>
              <Text style={styles.ctaTitle}>Ready to Transform Your Waste Management?</Text>
              <Text style={styles.ctaText}>
                Join leading organizations using WasteWise for intelligent waste classification and sustainable operations
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.8}
              >
                <Text style={styles.ctaButtonText}>Start Free Trial</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaLink}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.ctaLinkText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'about' && (
          <View style={styles.section}>
            <Text style={styles.pageTitle}>About WasteWise</Text>
            
            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Our Mission</Text>
              <Text style={styles.contentText}>
                WasteWise is dedicated to revolutionizing waste management through cutting-edge artificial intelligence and data-driven insights. Our mission is to empower organizations and communities with the tools they need to achieve sustainable waste management practices and contribute to a cleaner environment.
              </Text>
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Our Vision</Text>
              <Text style={styles.contentText}>
                To become the global standard for intelligent waste management solutions, driving environmental sustainability through innovation, technology, and community engagement. We envision a future where every piece of waste is properly classified, processed, and recycled, minimizing environmental impact and maximizing resource recovery.
              </Text>
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Advanced Technology</Text>
              <Text style={styles.contentText}>
                Our platform leverages state-of-the-art machine learning models trained on extensive datasets to deliver industry-leading accuracy in waste classification. We continuously improve our algorithms to adapt to new materials and waste types, ensuring our solution remains at the forefront of waste management technology.
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>1M+</Text>
                <Text style={styles.statLabel}>Items Classified</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>500+</Text>
                <Text style={styles.statLabel}>Partner Organizations</Text>
              </View>
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Core Capabilities</Text>
              <View style={styles.capabilityItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.capabilityText}>Advanced AI-powered waste identification and classification</Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.capabilityText}>Real-time waste stream monitoring and analytics</Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.capabilityText}>Intelligent route optimization for collection services</Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.capabilityText}>Comprehensive reporting and sustainability metrics</Text>
              </View>
              <View style={styles.capabilityItem}>
                <View style={styles.bulletDot} />
                <Text style={styles.capabilityText}>Enterprise-grade security and data protection</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'services' && (
          <View style={styles.section}>
            <Text style={styles.pageTitle}>Our Services</Text>

            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceNumber}>01</Text>
                <Text style={styles.serviceTitle}>Waste Classification AI</Text>
              </View>
              <Text style={styles.serviceDesc}>
                Industry-leading machine learning algorithms that provide accurate, real-time identification of waste materials across multiple categories, ensuring proper disposal and maximizing recycling efficiency.
              </Text>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceNumber}>02</Text>
                <Text style={styles.serviceTitle}>Smart Detection Platform</Text>
              </View>
              <Text style={styles.serviceDesc}>
                Mobile and web-based scanning technology that delivers instant waste identification and disposal recommendations, empowering users to make informed decisions about waste sorting.
              </Text>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceNumber}>03</Text>
                <Text style={styles.serviceTitle}>Operations Management</Text>
              </View>
              <Text style={styles.serviceDesc}>
                Comprehensive collection scheduling and route optimization tools that reduce operational costs, improve efficiency, and enhance service delivery across your waste management operations.
              </Text>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceNumber}>04</Text>
                <Text style={styles.serviceTitle}>Analytics & Insights</Text>
              </View>
              <Text style={styles.serviceDesc}>
                Advanced data visualization and reporting capabilities that transform waste data into actionable insights, enabling data-driven decision-making for sustainability initiatives.
              </Text>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceNumber}>05</Text>
                <Text style={styles.serviceTitle}>Recycling Network Integration</Text>
              </View>
              <Text style={styles.serviceDesc}>
                Seamless connection to certified recycling facilities and partners, with comprehensive tracking of environmental impact through detailed sustainability metrics and performance indicators.
              </Text>
            </View>

            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceNumber}>06</Text>
                <Text style={styles.serviceTitle}>Training & Education</Text>
              </View>
              <Text style={styles.serviceDesc}>
                Extensive library of educational resources, training programs, and best practices for waste management professionals and organizations committed to environmental sustainability.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'contact' && (
          <View style={styles.section}>
            <Text style={styles.pageTitle}>Contact Us</Text>
            
            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Get in Touch</Text>
              <Text style={styles.contentText}>
                Our team is ready to assist you with any questions about our platform, services, or how WasteWise can support your sustainability goals. Reach out through any of the channels below.
              </Text>
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Send Us a Message</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={formData.name}
                  onChangeText={(val) => handleFormChange('name', val)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@company.com"
                  placeholderTextColor="#94A3B8"
                  value={formData.email}
                  onChangeText={(val) => handleFormChange('email', val)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+63 XXX XXX XXXX"
                  placeholderTextColor="#94A3B8"
                  value={formData.phone}
                  onChangeText={(val) => handleFormChange('phone', val)}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organization</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your company or organization"
                  placeholderTextColor="#94A3B8"
                  value={formData.organization}
                  onChangeText={(val) => handleFormChange('organization', val)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us about your inquiry..."
                  placeholderTextColor="#94A3B8"
                  value={formData.message}
                  onChangeText={(val) => handleFormChange('message', val)}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
                <Text style={styles.submitButtonText}>Send Message</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactGrid}>
              <View style={styles.contactCard}>
                <Text style={styles.contactCardTitle}>Corporate Office</Text>
                <Text style={styles.contactCardText}>WasteWise Philippines Inc.</Text>
                <Text style={styles.contactCardText}>123 Innovation Drive</Text>
                <Text style={styles.contactCardText}>Quezon City, Metro Manila</Text>
                <Text style={styles.contactCardText}>Philippines 1100</Text>
              </View>

              <View style={styles.contactCard}>
                <Text style={styles.contactCardTitle}>Contact Information</Text>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Phone:</Text>
                  <Text style={styles.contactValue}>+63 2 8123 4567</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Mobile:</Text>
                  <Text style={styles.contactValue}>+63 917 123 4567</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Email:</Text>
                  <Text style={styles.contactValue}>info@wastewise.ph</Text>
                </View>
                <View style={styles.contactRow}>
                  <Text style={styles.contactLabel}>Support:</Text>
                  <Text style={styles.contactValue}>support@wastewise.ph</Text>
                </View>
              </View>
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Business Hours</Text>
              <View style={styles.hoursTable}>
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>Monday - Friday</Text>
                  <Text style={styles.hoursTime}>8:00 AM - 6:00 PM</Text>
                </View>
                <View style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>Saturday</Text>
                  <Text style={styles.hoursTime}>8:00 AM - 12:00 PM</Text>
                </View>
                <View style={[styles.hoursRow, styles.hoursRowLast]}>
                  <Text style={styles.hoursDay}>Sunday</Text>
                  <Text style={styles.hoursTime}>Closed</Text>
                </View>
              </View>
            </View>

            <View style={styles.contentBlock}>
              <Text style={styles.contentTitle}>Departments</Text>
              <View style={styles.departmentList}>
                <View style={styles.departmentItem}>
                  <Text style={styles.departmentName}>Technical Support</Text>
                  <Text style={styles.departmentExt}>Ext. 101</Text>
                </View>
                <View style={styles.departmentItem}>
                  <Text style={styles.departmentName}>Customer Success</Text>
                  <Text style={styles.departmentExt}>Ext. 102</Text>
                </View>
                <View style={styles.departmentItem}>
                  <Text style={styles.departmentName}>Sales & Partnerships</Text>
                  <Text style={styles.departmentExt}>Ext. 103</Text>
                </View>
                <View style={[styles.departmentItem, styles.departmentItemLast]}>
                  <Text style={styles.departmentName}>Enterprise Solutions</Text>
                  <Text style={styles.departmentExt}>Ext. 104</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerSection}>
              <Text style={styles.footerTitle}>Company</Text>
              <TouchableOpacity style={styles.footerLink} onPress={() => setActiveTab('home')}>
                <Text style={styles.footerLinkText}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink} onPress={() => setActiveTab('about')}>
                <Text style={styles.footerLinkText}>About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink} onPress={() => setActiveTab('services')}>
                <Text style={styles.footerLinkText}>Services</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink} onPress={() => setActiveTab('contact')}>
                <Text style={styles.footerLinkText}>Contact</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.footerSection}>
              <Text style={styles.footerTitle}>Resources</Text>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerLinkText}>Documentation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerLinkText}>API Reference</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerLinkText}>Support Center</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerLinkText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>© 2025 WasteWise Philippines Inc. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: -0.5,
  },
  navLinks: {
    flexDirection: 'row',
    gap: 32,
  },
  navLink: {
    paddingVertical: 4,
  },
  navLinkText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  navLinkActive: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  
  // Hero Banner
  heroBanner: {
    backgroundColor: '#1E40AF',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#BFDBFE',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: 500,
  },
  heroButtons: {
    width: '100%',
    gap: 12,
  },
  heroBtnPrimary: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroBtnSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroBtnSecondaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  // Section
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Feature Cards
  featureCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  
  // CTA Section
  ctaSection: {
    backgroundColor: '#1E293B',
    padding: 32,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  ctaText: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ctaLink: {
    paddingVertical: 8,
  },
  ctaLinkText: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Page Content
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  contentBlock: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 8,
  },
  
  // Capability Items
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 12,
    marginTop: 8,
  },
  capabilityText: {
    flex: 1,
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  
  // Service Cards
  serviceCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  serviceNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#BFDBFE',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  serviceDesc: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
  },
  
  // Form Inputs
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 16,
    borderRadius: 8,
        alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  // Contact Grid
  contactGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  contactCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
  },
  contactCardText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
    lineHeight: 20,
  },
  
  // Contact Info
  contactRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    width: 70,
  },
  contactValue: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  
  // Hours Table
  hoursTable: {
    marginTop: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hoursRowLast: {
    borderBottomWidth: 0,
  },
  hoursDay: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  hoursTime: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  
  // Department List
  departmentList: {
    marginTop: 8,
  },
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  departmentItemLast: {
    borderBottomWidth: 0,
  },
  departmentName: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  departmentExt: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  
  // Footer
  footer: {
    backgroundColor: '#0F172A',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  footerSection: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  footerLink: {
    marginBottom: 10,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 20,
  },
  footerCopyright: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default HomeScreen;