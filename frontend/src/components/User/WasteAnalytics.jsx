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
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getUserReports } from '../../redux/slices/wasteReportSlice';

const { width } = Dimensions.get('window');

// CO₂ emission factors (kg CO₂ equivalent per kg of waste)
// Source: EPA, IPCC, and environmental research data
const CO2_EMISSION_FACTORS = {
  // Recycling saves CO₂ compared to virgin production
  recycling: {
    plastic: 1.5, // kg CO₂ saved per kg recycled plastic
    paper: 0.9,   // kg CO₂ saved per kg recycled paper
    glass: 0.6,   // kg CO₂ saved per kg recycled glass
    metal: 3.0,   // kg CO₂ saved per kg recycled metal
    aluminum: 8.0, // kg CO₂ saved per kg recycled aluminum
    organic: 0.1,  // kg CO₂ saved per kg composted organic
    electronic: 2.5, // kg CO₂ saved per kg recycled e-waste
    textile: 2.0,  // kg CO₂ saved per kg recycled textile
    cardboard: 1.1, // kg CO₂ saved per kg recycled cardboard
    default: 1.0   // Default saving factor
  },
  // Landfill emissions (if not recycled)
  landfill: {
    plastic: 0.1,   // Minimal degradation in landfill
    paper: 0.5,     // Produces methane when decomposing
    glass: 0.02,    // Inert material, minimal emissions
    metal: 0.05,    // Minimal emissions
    aluminum: 0.05,
    organic: 1.5,   // Produces methane in landfill
    electronic: 0.8, // Heavy metals and chemicals
    textile: 0.7,    // Produces methane
    cardboard: 0.5,
    default: 0.3
  },
  // Incineration emissions
  incineration: {
    plastic: 2.5,   // High emissions when burned
    paper: 0.8,
    glass: 0.1,     // Doesn't burn well
    metal: 0.1,
    aluminum: 0.1,
    organic: 0.3,
    electronic: 1.2,
    textile: 1.5,
    cardboard: 0.9,
    default: 1.0
  }
};

// Average weight per waste item (kg)
// Based on typical household waste items
const AVG_ITEM_WEIGHT = {
  plastic: {
    bottle: 0.05,    // 50g plastic bottle
    bag: 0.01,       // 10g plastic bag
    container: 0.03, // 30g container
    default: 0.03
  },
  paper: {
    newspaper: 0.1,  // 100g newspaper
    magazine: 0.15,
    office: 0.05,
    default: 0.08
  },
  glass: {
    bottle: 0.3,     // 300g glass bottle
    jar: 0.2,
    default: 0.25
  },
  metal: {
    can: 0.015,      // 15g aluminum can
    default: 0.02
  },
  organic: {
    food: 0.2,
    yard: 0.5,
    default: 0.3
  },
  electronic: {
    small: 0.5,      // Small electronics
    medium: 2.0,
    default: 1.0
  },
  default: 0.1        // Default weight if unknown
};

const WasteAnalytics = ({ navigation }) => {
  const dispatch = useDispatch();
  const { reports, loading } = useSelector((state) => state.wasteReport);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); 
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

  const calculateWasteWeight = (report) => {
    // If report has actual weight data, use it
    if (report.weight) {
      return report.weight;
    }
    
    // Otherwise estimate based on waste type
    const wasteType = (report.classification || 'default').toLowerCase();
    const itemType = report.itemType || 'default';
    
    // Get weight factor for the waste type
    const typeWeights = AVG_ITEM_WEIGHT[wasteType] || AVG_ITEM_WEIGHT.default;
    const weight = typeof typeWeights === 'object' 
      ? (typeWeights[itemType] || typeWeights.default || AVG_ITEM_WEIGHT.default)
      : AVG_ITEM_WEIGHT.default;
    
    // Multiply by quantity if available
    return weight * (report.quantity || 1);
  };

  const calculateCO2Impact = (report, wasteType, weight) => {
    const type = (wasteType || 'default').toLowerCase();
    const status = report.status || 'pending';
    
    let co2Impact = 0;
    
    switch (status) {
      case 'recycled':
        // CO₂ saved through recycling (negative = reduction)
        co2Impact = -(weight * (CO2_EMISSION_FACTORS.recycling[type] || CO2_EMISSION_FACTORS.recycling.default));
        break;
        
      case 'processed':
        // Processed typically means composted or treated - calculate savings based on treatment
        if (type === 'organic') {
          // Composting saves methane emissions from landfill
          co2Impact = -(weight * 0.5); // Composting saves ~0.5 kg CO₂e per kg
        } else {
          // Other processing methods
          co2Impact = -(weight * 0.3);
        }
        break;
        
      case 'disposed':
        // Landfill emissions
        co2Impact = weight * (CO2_EMISSION_FACTORS.landfill[type] || CO2_EMISSION_FACTORS.landfill.default);
        break;
        
      default:
        // Pending - assume worst case (landfill) for conservative estimate
        co2Impact = weight * (CO2_EMISSION_FACTORS.landfill[type] || CO2_EMISSION_FACTORS.landfill.default);
    }
    
    return co2Impact;
  };

  const calculateAnalytics = () => {
    const filteredReports = filterReportsByTimeRange(reports);
    
    if (filteredReports.length === 0) {
      setAnalytics(null);
      return;
    }

    // Initialize tracking objects
    const wasteDistribution = {};
    const materialBreakdown = {};
    const statusDistribution = {};
    let totalConfidence = 0;
    let totalRecyclingTips = 0;
    let totalWeight = 0;
    let totalCO2Impact = 0;
    
    // Track CO₂ by status and type
    const co2ByStatus = {
      recycled: { total: 0, count: 0, weight: 0 },
      processed: { total: 0, count: 0, weight: 0 },
      disposed: { total: 0, count: 0, weight: 0 },
      pending: { total: 0, count: 0, weight: 0 }
    };
    
    const co2ByWasteType = {};

    filteredReports.forEach(report => {
      // Get waste type
      const wasteType = report.classification || 'Unknown';
      const wasteTypeLower = wasteType.toLowerCase();
      
      // Calculate weight
      const weight = calculateWasteWeight(report);
      totalWeight += weight;
      
      // Calculate CO₂ impact
      const co2Impact = calculateCO2Impact(report, wasteType, weight);
      totalCO2Impact += co2Impact;
      
      // Track by waste type
      wasteDistribution[wasteType] = (wasteDistribution[wasteType] || 0) + 1;
      
      // Track CO₂ by waste type
      if (!co2ByWasteType[wasteType]) {
        co2ByWasteType[wasteType] = {
          count: 0,
          weight: 0,
          co2Impact: 0,
          co2PerKg: 0
        };
      }
      co2ByWasteType[wasteType].count += 1;
      co2ByWasteType[wasteType].weight += weight;
      co2ByWasteType[wasteType].co2Impact += co2Impact;

      // Count materials from breakdown
      if (report.materialBreakdown) {
        Object.keys(report.materialBreakdown).forEach(material => {
          materialBreakdown[material] = (materialBreakdown[material] || 0) + 1;
        });
      }

      // Count status
      const status = report.status || 'pending';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      
      // Track CO₂ by status
      if (co2ByStatus[status]) {
        co2ByStatus[status].count += 1;
        co2ByStatus[status].weight += weight;
        co2ByStatus[status].total += co2Impact;
      }

      // Sum confidence
      totalConfidence += report.classificationConfidence || 0;

      // Count recycling tips
      totalRecyclingTips += report.recyclingTips?.length || 0;
    });

    // Calculate CO₂ per kg for each waste type
    Object.keys(co2ByWasteType).forEach(type => {
      const data = co2ByWasteType[type];
      data.co2PerKg = data.weight > 0 ? (data.co2Impact / data.weight).toFixed(2) : 0;
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

    // Calculate weighted sustainability score
    const recycledWeight = co2ByStatus.recycled.weight || 0;
    const processedWeight = co2ByStatus.processed.weight || 0;
    const disposedWeight = co2ByStatus.disposed.weight || 0;
    
    // Sustainability score based on CO₂ reduction percentage
    const maxPossibleCO2 = totalWeight * 2.5; // Assuming worst-case scenario (all incinerated)
    const actualCO2 = Math.max(0, totalCO2Impact); // CO₂ emitted (positive)
    const co2ReductionPercent = Math.min(100, Math.max(0, 
      ((maxPossibleCO2 - actualCO2) / maxPossibleCO2) * 100
    ));
    
    const sustainabilityScore = Math.round(co2ReductionPercent);

    // Calculate environmental equivalents with safe defaults
    const co2Savings = Math.max(0, -Math.min(0, totalCO2Impact)); // Negative = savings, make positive
    const co2Emissions = Math.max(0, totalCO2Impact); // Positive = emissions
    
    // Equivalents (based on EPA data) with safe calculations
    const treesEquivalent = co2Savings > 0 ? Math.max(1, Math.round(co2Savings / 21)) : 0;
    const carsEquivalent = co2Emissions > 0 ? (co2Emissions / 4600).toFixed(2) : "0";
    const homesEquivalent = co2Emissions > 0 ? (co2Emissions / 11000).toFixed(2) : "0";
    const gasolineLiters = co2Emissions > 0 ? Math.round(co2Emissions * 0.43) : 0;
    const smartphonesCharged = co2Savings > 0 ? Math.round(co2Savings * 120) : 0;

    setAnalytics({
      totalReports,
      totalWeight: totalWeight.toFixed(2),
      wasteDistribution,
      materialBreakdown,
      statusDistribution,
      avgConfidence: Math.round(avgConfidence * 100) || 0,
      totalRecyclingTips,
      mostCommonWaste: mostCommonWaste ? {
        type: mostCommonWaste[0],
        count: mostCommonWaste[1],
        percentage: Math.round((mostCommonWaste[1] / totalReports) * 100) || 0
      } : null,
      mostCommonMaterial: mostCommonMaterial ? {
        type: mostCommonMaterial[0],
        count: mostCommonMaterial[1]
      } : null,
      sustainabilityScore: sustainabilityScore || 0,
      recycledCount: co2ByStatus.recycled.count || 0,
      processedCount: co2ByStatus.processed.count || 0,
      disposedCount: co2ByStatus.disposed.count || 0,
      totalCO2Impact: totalCO2Impact.toFixed(2),
      co2Savings: co2Savings.toFixed(2),
      co2Emissions: co2Emissions.toFixed(2),
      co2ByStatus,
      co2ByWasteType,
      environmentalEquivalents: {
        treesEquivalent: treesEquivalent || 0,
        carsEquivalent: carsEquivalent || "0",
        homesEquivalent: homesEquivalent || "0",
        gasolineLiters: gasolineLiters || 0,
        smartphonesCharged: smartphonesCharged || 0
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recycled': return '#87CEEB';
      case 'processed': return '#4682B4';
      case 'pending': return '#FFA500';
      case 'disposed': return '#B0C4DE';
      default: return '#9E9E9E';
    }
  };

  const getWasteTypeColor = (type) => {
    const colors = {
      'plastic': '#87CEEB',
      'paper': '#B0E0E6',
      'glass': '#4682B4',
      'metal': '#5F9EA0',
      'organic': '#8FBC8F',
      'electronic': '#6A5ACD',
      'hazardous': '#B0C4DE',
      'mixed': '#87CEFA',
      'unknown': '#C0C0C0'
    };
    return colors[type?.toLowerCase()] || '#C0C0C0';
  };

  const formatCO2 = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 1000) {
      return `${(numValue / 1000).toFixed(2)}t`;
    }
    return `${numValue}kg`;
  };

  const StatCard = ({ title, value, subtitle, color = '#87CEEB', icon, unit }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <Icon name={icon} size={20} color="#fff" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
    </View>
  );

  const ProgressBar = ({ percentage, color, label, value, unit }) => {
    const safePercentage = Math.min(100, Math.max(0, percentage || 0));
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Icon name="trending-up" size={16} color={color} />
          <Text style={styles.progressLabel}>{label}</Text>
          {value && <Text style={styles.progressValue}>{value} {unit}</Text>}
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${safePercentage}%`, backgroundColor: color }
            ]} 
          />
        </View>
        <Text style={styles.progressPercentage}>{safePercentage}%</Text>
      </View>
    );
  };

  if (loading && !refreshing && !analytics) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#87CEEB" />
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
          colors={['#87CEEB']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="analytics" size={28} color="#87CEEB" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Waste Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Track your carbon footprint impact
          </Text>
        </View>
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
            <Icon 
              name={
                range === 'week' ? 'date-range' :
                range === 'month' ? 'calendar-today' :
                range === 'year' ? 'event-note' : 'all-inclusive'
              } 
              size={16} 
              color={timeRange === range ? '#fff' : '#87CEEB'} 
            />
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
          <Icon name="analytics" size={64} color="#B0C4DE" />
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
            <View style={styles.sectionHeader}>
              <Icon name="insights" size={24} color="#333" />
              <Text style={styles.sectionTitle}>Carbon Impact Overview</Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Waste"
                value={`${analytics.totalWeight || 0}kg`}
                subtitle={`${analytics.totalReports || 0} items`}
                color="#87CEEB"
                icon="delete-sweep"
              />
              <StatCard
                title="CO₂ Savings"
                value={formatCO2(analytics.co2Savings || 0)}
                subtitle="Through recycling"
                color="#4682B4"
                icon="cloud-queue"
              />
              <StatCard
                title="CO₂ Emissions"
                value={formatCO2(analytics.co2Emissions || 0)}
                subtitle="From disposed waste"
                color="#B0C4DE"
                icon="cloud"
              />
              <StatCard
                title="Net Impact"
                value={formatCO2(analytics.totalCO2Impact || 0)}
                subtitle={parseFloat(analytics.totalCO2Impact || 0) < 0 ? 'Carbon negative' : 'Carbon positive'}
                color={parseFloat(analytics.totalCO2Impact || 0) < 0 ? '#87CEEB' : '#B0C4DE'}
                icon={parseFloat(analytics.totalCO2Impact || 0) < 0 ? 'eco' : 'warning'}
              />
            </View>
          </View>

          {/* Environmental Equivalents */}
          {analytics.environmentalEquivalents && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="public" size={24} color="#333" />
                <Text style={styles.sectionTitle}>Environmental Impact</Text>
              </View>
              <View style={styles.equivalentsCard}>
                <View style={styles.equivalentsGrid}>
                  <View style={styles.equivalentItem}>
                    <Icon name="park" size={24} color="#87CEEB" />
                    <Text style={styles.equivalentValue}>
                      {analytics.environmentalEquivalents.treesEquivalent || 0}
                    </Text>
                    <Text style={styles.equivalentLabel}>Trees needed to absorb CO₂ emissions</Text>
                  </View>
                  <View style={styles.equivalentItem}>
                    <Icon name="directions-car" size={24} color="#4682B4" />
                    <Text style={styles.equivalentValue}>
                      {analytics.environmentalEquivalents.carsEquivalent || "0"}
                    </Text>
                    <Text style={styles.equivalentLabel}>Cars off the road for a year</Text>
                  </View>
                  <View style={styles.equivalentItem}>
                    <Icon name="local-gas-station" size={24} color="#5F9EA0" />
                    <Text style={styles.equivalentValue}>
                      {analytics.environmentalEquivalents.gasolineLiters || 0}L
                    </Text>
                    <Text style={styles.equivalentLabel}>Gasoline saved</Text>
                  </View>
                  <View style={styles.equivalentItem}>
                    <Icon name="phone-android" size={24} color="#6A5ACD" />
                    <Text style={styles.equivalentValue}>
                      {analytics.environmentalEquivalents.smartphonesCharged || 0}
                    </Text>
                    <Text style={styles.equivalentLabel}>Smartphones charged</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Sustainability Score */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="eco" size={24} color="#333" />
              <Text style={styles.sectionTitle}>Sustainability Score</Text>
            </View>
            <View style={styles.scoreCard}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{analytics.sustainabilityScore || 0}</Text>
                <Text style={styles.scoreLabel}>out of 100</Text>
              </View>
              <View style={styles.scoreDetails}>
                <View style={styles.scoreDetail}>
                  <View style={[styles.scoreDot, { backgroundColor: '#87CEEB' }]} />
                  <Text style={styles.scoreDetailText}>Recycled: {analytics.recycledCount || 0} items</Text>
                </View>
                <View style={styles.scoreDetail}>
                  <View style={[styles.scoreDot, { backgroundColor: '#4682B4' }]} />
                  <Text style={styles.scoreDetailText}>Processed: {analytics.processedCount || 0} items</Text>
                </View>
                <View style={styles.scoreDetail}>
                  <View style={[styles.scoreDot, { backgroundColor: '#B0C4DE' }]} />
                  <Text style={styles.scoreDetailText}>Disposed: {analytics.disposedCount || 0} items</Text>
                </View>
              </View>
            </View>
          </View>

          {/* CO₂ by Waste Type */}
          {analytics.co2ByWasteType && Object.keys(analytics.co2ByWasteType).length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="pie-chart" size={24} color="#333" />
                <Text style={styles.sectionTitle}>CO₂ Impact by Waste Type</Text>
              </View>
              <View style={styles.distributionCard}>
                {Object.entries(analytics.co2ByWasteType)
                  .sort(([,a], [,b]) => Math.abs(b.co2Impact || 0) - Math.abs(a.co2Impact || 0))
                  .map(([type, data]) => {
                    const totalImpact = Math.abs(analytics.totalCO2Impact || 1);
                    const percentage = totalImpact > 0 
                      ? (Math.abs(data.co2Impact || 0) / totalImpact * 100).toFixed(1)
                      : "0";
                    const isPositive = (data.co2Impact || 0) > 0;
                    return (
                      <ProgressBar
                        key={type}
                        percentage={percentage}
                        color={isPositive ? '#B0C4DE' : '#87CEEB'}
                        label={`${type} (${data.count || 0} items)`}
                        value={formatCO2(data.co2Impact || 0)}
                        unit={isPositive ? 'emitted' : 'saved'}
                      />
                    );
                  })
                }
              </View>
            </View>
          )}

          {/* CO₂ by Status */}
          {analytics.co2ByStatus && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="donut-large" size={24} color="#333" />
                <Text style={styles.sectionTitle}>CO₂ by Processing Status</Text>
              </View>
              <View style={styles.statsGrid}>
                {Object.entries(analytics.co2ByStatus).map(([status, data]) => {
                  if ((data.count || 0) === 0) return null;
                  return (
                    <View key={status} style={styles.statusItem}>
                      <View style={styles.statusHeader}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(status) }
                        ]} />
                        <Icon 
                          name={
                            status === 'recycled' ? 'check-circle' :
                            status === 'processed' ? 'build' :
                            status === 'pending' ? 'schedule' : 'delete'
                          } 
                          size={16} 
                          color={getStatusColor(status)} 
                        />
                        <Text style={styles.statusText}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.statusCount}>{data.count || 0} items</Text>
                      <Text style={styles.statusWeight}>{(data.weight || 0).toFixed(2)}kg</Text>
                      <Text style={[
                        styles.statusCO2,
                        { color: (data.total || 0) < 0 ? '#87CEEB' : '#B0C4DE' }
                      ]}>
                        {(data.total || 0) < 0 ? 'Saved: ' : 'Emitted: '}
                        {formatCO2(Math.abs(data.total || 0))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Additional Insights */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="lightbulb" size={24} color="#333" />
              <Text style={styles.sectionTitle}>Insights & Recommendations</Text>
            </View>
            <View style={styles.insightsCard}>
              <View style={styles.insightItem}>
                <View style={styles.insightHeader}>
                  <Icon name="psychology" size={18} color="#87CEEB" />
                  <Text style={styles.insightLabel}>Average Confidence</Text>
                </View>
                <Text style={styles.insightValue}>{analytics.avgConfidence || 0}%</Text>
              </View>
              <View style={styles.insightItem}>
                <View style={styles.insightHeader}>
                  <Icon name="tips-and-updates" size={18} color="#87CEEB" />
                  <Text style={styles.insightLabel}>Recycling Tips Received</Text>
                </View>
                <Text style={styles.insightValue}>{analytics.totalRecyclingTips || 0}</Text>
              </View>
              {analytics.mostCommonWaste && (
                <View style={styles.insightItem}>
                  <View style={styles.insightHeader}>
                    <Icon name="category" size={18} color="#87CEEB" />
                    <Text style={styles.insightLabel}>Most Common Waste</Text>
                  </View>
                  <Text style={styles.insightValue}>
                    {analytics.mostCommonWaste.type} ({analytics.mostCommonWaste.percentage || 0}%)
                  </Text>
                </View>
              )}
              {parseFloat(analytics.co2Emissions || 0) > 0 && (
                <View style={styles.recommendationBox}>
                  <Icon name="warning" size={20} color="#FFA500" />
                  <Text style={styles.recommendationText}>
                    To reduce your CO₂ emissions by 50%, focus on recycling more {
                      Object.entries(analytics.co2ByWasteType || {})
                        .filter(([,data]) => (data.co2Impact || 0) > 0)
                        .sort(([,a], [,b]) => (b.co2Impact || 0) - (a.co2Impact || 0))
                        .map(([type]) => type)
                        .slice(0, 2)
                        .join(' and ') || 'waste'
                    }.
                  </Text>
                </View>
              )}
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
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  timeButtonActive: {
    backgroundColor: '#87CEEB',
  },
  timeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#87CEEB',
  },
  timeButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  statUnit: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  equivalentsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  equivalentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  equivalentItem: {
    flex: 1,
    minWidth: (width - 80) / 2,
    alignItems: 'center',
  },
  equivalentValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  equivalentLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  scoreCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#87CEEB',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  scoreDetails: {
    flex: 1,
  },
  scoreDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  scoreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreDetailText: {
    fontSize: 14,
    color: '#666',
  },
  distributionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  progressLabel: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  statusItem: {
    flex: 1,
    minWidth: (width - 40) / 2,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  statusCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statusWeight: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statusCO2: {
    fontSize: 12,
    fontWeight: '500',
  },
  insightsCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
  },
  insightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
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
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WasteAnalytics;