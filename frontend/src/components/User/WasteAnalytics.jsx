import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { getUserReports } from '../../redux/slices/wasteReportSlice';

const { width } = Dimensions.get('window');

const WasteAnalytics = ({ navigation }) => {
  const dispatch = useDispatch();
  const { reports, loading } = useSelector((state) => state.wasteReport);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // 'week', 'month', 'year', 'all'
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (reports.length > 0) {
      calculateAnalytics();
    }
  }, [reports, timeRange]);

  const loadReports = async () => {
    try {
      await dispatch(getUserReports({ limit: 1000 })).unwrap();
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const filterReportsByTimeRange = (reports) => {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        return reports; // 'all'
    }

    return reports.filter(report => 
      new Date(report.scanDate || report.createdAt) >= startDate
    );
  };

  const calculateAnalytics = () => {
    const filteredReports = filterReportsByTimeRange(reports);
    
    if (filteredReports.length === 0) {
      setAnalytics(null);
      return;
    }

    // Waste type distribution
    const wasteDistribution = {};
    const materialBreakdown = {};
    const statusDistribution = {};
    let totalConfidence = 0;
    let totalRecyclingTips = 0;

    filteredReports.forEach(report => {
      // Count waste types
      const wasteType = report.classification || 'Unknown';
      wasteDistribution[wasteType] = (wasteDistribution[wasteType] || 0) + 1;

      // Count materials from breakdown
      if (report.materialBreakdown) {
        Object.keys(report.materialBreakdown).forEach(material => {
          materialBreakdown[material] = (materialBreakdown[material] || 0) + 1;
        });
      }

      // Count status
      const status = report.status || 'pending';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      // Sum confidence
      totalConfidence += report.classificationConfidence || 0;

      // Count recycling tips
      totalRecyclingTips += report.recyclingTips?.length || 0;
    });

    // Calculate percentages and stats
    const totalReports = filteredReports.length;
    const avgConfidence = totalConfidence / totalReports;
    
    // Most common waste type
    const mostCommonWaste = Object.entries(wasteDistribution)
      .sort(([,a], [,b]) => b - a)[0];

    // Most common material
    const mostCommonMaterial = Object.entries(materialBreakdown)
      .sort(([,a], [,b]) => b - a)[0];

    // Sustainability score calculation
    const recycledReports = statusDistribution.recycled || 0;
    const processedReports = statusDistribution.processed || 0;
    const sustainabilityScore = Math.round(
      ((recycledReports * 1.5 + processedReports) / totalReports) * 100
    );

    setAnalytics({
      totalReports,
      wasteDistribution,
      materialBreakdown,
      statusDistribution,
      avgConfidence: Math.round(avgConfidence * 100),
      totalRecyclingTips,
      mostCommonWaste: mostCommonWaste ? {
        type: mostCommonWaste[0],
        count: mostCommonWaste[1],
        percentage: Math.round((mostCommonWaste[1] / totalReports) * 100)
      } : null,
      mostCommonMaterial: mostCommonMaterial ? {
        type: mostCommonMaterial[0],
        count: mostCommonMaterial[1]
      } : null,
      sustainabilityScore: Math.min(sustainabilityScore, 100),
      recycledCount: recycledReports,
      processedCount: processedReports,
      co2Reduction: Math.round(recycledReports * 2.5 + processedReports * 1.2) // Estimated kg CO2 reduction
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recycled': return '#4CAF50';
      case 'processed': return '#2196F3';
      case 'pending': return '#FF9800';
      case 'disposed': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getWasteTypeColor = (type) => {
    const colors = {
      'plastic': '#2196F3',
      'paper': '#FF9800',
      'glass': '#4CAF50',
      'metal': '#607D8B',
      'organic': '#795548',
      'electronic': '#9C27B0',
      'hazardous': '#F44336',
      'mixed': '#FFC107',
      'unknown': '#9E9E9E'
    };
    return colors[type.toLowerCase()] || '#9E9E9E';
  };

  const StatCard = ({ title, value, subtitle, color = '#2196F3' }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ProgressBar = ({ percentage, color, label }) => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={styles.progressPercentage}>{percentage}%</Text>
    </View>
  );

  if (loading && !refreshing && !analytics) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#2196F3']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Waste Analytics</Text>
        <Text style={styles.headerSubtitle}>
          Track your sustainability contributions
        </Text>
      </View>

      {/* Time Range Filter */}
      <View style={styles.timeFilter}>
        {['week', 'month', 'year', 'all'].map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeButton,
              timeRange === range && styles.timeButtonActive
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeButtonText,
              timeRange === range && styles.timeButtonTextActive
            ]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!analytics ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Data Available</Text>
          <Text style={styles.emptyText}>
            {reports.length === 0 
              ? "Start by creating your first waste report to see analytics."
              : `No reports found for the selected time range (${timeRange}).`
            }
          </Text>
        </View>
      ) : (
        <>
          {/* Key Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Reports"
                value={analytics.totalReports}
                subtitle="All time"
                color="#2196F3"
              />
              <StatCard
                title="Sustainability Score"
                value={analytics.sustainabilityScore}
                subtitle="Out of 100"
                color="#4CAF50"
              />
              <StatCard
                title="Recycled Items"
                value={analytics.recycledCount}
                subtitle="Environment saved"
                color="#4CAF50"
              />
              <StatCard
                title="CO₂ Reduction"
                value={`${analytics.co2Reduction}kg`}
                subtitle="Estimated"
                color="#FF9800"
              />
            </View>
          </View>

          {/* Waste Type Distribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Waste Type Distribution</Text>
            <View style={styles.distributionCard}>
              {analytics.mostCommonWaste && (
                <View style={styles.mostCommon}>
                  <Text style={styles.mostCommonLabel}>Most Common:</Text>
                  <Text style={[
                    styles.mostCommonValue,
                    { color: getWasteTypeColor(analytics.mostCommonWaste.type) }
                  ]}>
                    {analytics.mostCommonWaste.type} ({analytics.mostCommonWaste.percentage}%)
                  </Text>
                </View>
              )}
              
              {Object.entries(analytics.wasteDistribution)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => {
                  const percentage = Math.round((count / analytics.totalReports) * 100);
                  return (
                    <ProgressBar
                      key={type}
                      percentage={percentage}
                      color={getWasteTypeColor(type)}
                      label={`${type} (${count})`}
                    />
                  );
                })
              }
            </View>
          </View>

          {/* Status Distribution */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report Status</Text>
            <View style={styles.statsGrid}>
              {Object.entries(analytics.statusDistribution).map(([status, count]) => {
                const percentage = Math.round((count / analytics.totalReports) * 100);
                return (
                  <View key={status} style={styles.statusItem}>
                    <View style={styles.statusHeader}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(status) }
                      ]} />
                      <Text style={styles.statusText}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.statusCount}>{count}</Text>
                    <Text style={styles.statusPercentage}>{percentage}%</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Additional Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Insights</Text>
            <View style={styles.insightsCard}>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Average Confidence</Text>
                <Text style={styles.insightValue}>{analytics.avgConfidence}%</Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Recycling Tips Received</Text>
                <Text style={styles.insightValue}>{analytics.totalRecyclingTips}</Text>
              </View>
              {analytics.mostCommonMaterial && (
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>Most Common Material</Text>
                  <Text style={styles.insightValue}>
                    {analytics.mostCommonMaterial.type}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Environmental Impact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Environmental Impact</Text>
            <View style={styles.impactCard}>
              <View style={styles.impactItem}>
                <Text style={styles.impactValue}>{analytics.co2Reduction} kg</Text>
                <Text style={styles.impactLabel}>CO₂ Reduction</Text>
                <Text style={styles.impactDescription}>
                  Equivalent to {Math.round(analytics.co2Reduction / 2.3)} liters of gasoline
                </Text>
              </View>
              <View style={styles.impactItem}>
                <Text style={styles.impactValue}>{analytics.recycledCount}</Text>
                <Text style={styles.impactLabel}>Items Recycled</Text>
                <Text style={styles.impactDescription}>
                  Saving natural resources and energy
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  timeFilter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  timeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 2,
  },
  timeButtonActive: {
    backgroundColor: '#2196F3',
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  timeButtonTextActive: {
    color: 'white',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 40) / 2,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  distributionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mostCommon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  mostCommonLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mostCommonValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    width: 100,
    marginRight: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#666',
    width: 30,
    textAlign: 'right',
  },
  statusItem: {
    flex: 1,
    minWidth: (width - 40) / 2,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusPercentage: {
    fontSize: 12,
    color: '#999',
  },
  insightsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
  },
  insightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  impactCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
  },
  impactItem: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  impactValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  impactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  impactDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WasteAnalytics;