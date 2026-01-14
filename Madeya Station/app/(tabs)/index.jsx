import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '../supa/supabase-client';

const { width } = Dimensions.get('window');

// --- MODERN THEME CONFIGURATION ---
const THEME = {
  // Brand Gradients
  GRADIENT_PRIMARY: ['#1e3c72', '#2a5298'], // Deep Royal Blue
  GRADIENT_ACCENT: ['#2c62b0', '#2c62b0'],  // Fresh Green
  
  // Solid Colors
  PRIMARY: '#2a5298',
  SECONDARY: '#F1F5F9',
  SUCCESS: '#2c62b0',
  WARNING: '#2c62b0',
  DANGER: '#EF4444',
  DARK: '#1e293b',
  MEDIUM: '#64748B',
  LIGHT: '#F8FAFC',
  WHITE: '#FFFFFF',
  BORDER: '#E2E8F0',
  
  // Shadows
  SHADOW: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  }
};

export default function StationDashboardScreen() {
  const router = useRouter();
  
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationInfo, setStationInfo] = useState(null);
  const [activeQueue, setActiveQueue] = useState([]);
  const [completedQueue, setCompletedQueue] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    serving: 0,
    completedToday: 0,
    totalFuelSold: 0
  });
  const [selectedCar, setSelectedCar] = useState(null);
  const [modalVisible, setModalVisible] = useState(false); // Kept for future use
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [servedAmount, setServedAmount] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- INITIALIZATION ---
  useEffect(() => {
    initializeDashboard();
    
    const queueChannel = supabase.channel('station-queue')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'fuel_queue' },
        () => loadQueues()
      )
      .subscribe();

    return () => supabase.removeChannel(queueChannel);
  }, []);

  const initializeDashboard = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('../screens/welcome/welcome');
      }
      
      await Promise.all([
        loadStationInfo(user.id),
        loadQueues(),
        loadStats()
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- DATA LOADING LOGIC (UNCHANGED) ---
  const loadStationInfo = async (userId) => {
    const { data, error } = await supabase
      .from('station_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) console.log("Station Info Error:", error.message); // Soft fail
    else setStationInfo(data);
  };

  const loadQueues = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Active
      const { data: activeData } = await supabase
        .from('fuel_queue')
        .select(`*, car_profiles:car_user_id (brand, plate_number)`)
        .eq('station_user_id', user.id)
        .in('status', ['pending', 'serving'])
        .order('queue_position', { ascending: true });
      setActiveQueue(activeData || []);

      // Completed
      const { data: completedData } = await supabase
        .from('fuel_queue')
        .select(`*, car_profiles:car_user_id (brand, plate_number)`)
        .eq('station_user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);
      setCompletedQueue(completedData || []);
    } catch (error) {
      console.error('Error loading queues:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];
      
      const { count: pendingCount } = await supabase
        .from('fuel_queue')
        .select('*', { count: 'exact', head: true })
        .eq('station_user_id', user.id)
        .eq('status', 'pending');

      const { count: servingCount } = await supabase
        .from('fuel_queue')
        .select('*', { count: 'exact', head: true })
        .eq('station_user_id', user.id)
        .eq('status', 'serving');

      const { data: todayCompleted } = await supabase
        .from('fuel_queue')
        .select('served_amount')
        .eq('station_user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);

      const totalFuelSold = todayCompleted?.reduce((sum, item) => sum + (item.served_amount || 0), 0) || 0;

      setStats({
        pending: pendingCount || 0,
        serving: servingCount || 0,
        completedToday: todayCompleted?.length || 0,
        totalFuelSold: parseFloat(totalFuelSold.toFixed(2))
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadQueues(), loadStats()]);
    setRefreshing(false);
  }, []);

  // --- ACTION HANDLERS ---
  const handleCarAction = (action, carData) => {
    setSelectedCar(carData);
    if (action === 'start' || action === 'complete') {
      setActionModalVisible(true);
    } else {
      performAction(action, carData);
    }
  };

  const performAction = async (action, carData) => {
    setProcessingAction(true);
    try {
      let updates = {};
      const now = new Date().toISOString();

      switch (action) {
        case 'start':
          updates = { status: 'serving', started_at: now };
          break;
        case 'complete':
          if (!servedAmount || parseFloat(servedAmount) <= 0) throw new Error('Enter valid amount');
          updates = { 
            status: 'completed', 
            served_amount: parseFloat(servedAmount), 
            completed_at: now
          };
          break;
        case 'cancel':
        case 'skip':
          updates = { status: 'cancelled' };
          break;
      }

      const { error } = await supabase.from('fuel_queue').update(updates).eq('id', carData.id);
      if (error) throw error;

      if (['complete', 'cancel', 'skip'].includes(action)) {
        await updateQueuePositions(carData.station_user_id);
      }

      Alert.alert('Success', `Action ${action} successful`);
      setActionModalVisible(false);
      setSelectedCar(null);
      setServedAmount('');
      await loadQueues();
      await loadStats();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  const updateQueuePositions = async (stationId) => {
    const { data: pendingCars } = await supabase
      .from('fuel_queue')
      .select('id')
      .eq('station_user_id', stationId)
      .eq('status', 'pending')
      .order('queue_position', { ascending: true });

    if (pendingCars) {
      for (let i = 0; i < pendingCars.length; i++) {
        await supabase
          .from('fuel_queue')
          .update({ queue_position: i + 1 })
          .eq('id', pendingCars[i].id);
      }
    }
  };

  // --- FILTERING ---
  const filteredActiveQueue = activeQueue.filter(item =>
    item.car_profiles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.car_profiles?.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.fuel_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER HELPERS ---
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return THEME.WARNING;
      case 'serving': return THEME.PRIMARY;
      case 'completed': return THEME.SUCCESS;
      default: return THEME.DANGER;
    }
  };

  const renderQueueItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View style={styles.card}>
        <View style={[styles.cardLeftStrip, { backgroundColor: getStatusColor(item.status) }]} />
        
        <View style={styles.cardContent}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>#{item.queue_position}</Text>
              </View>
            </View>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Main Info */}
          <View style={styles.carRow}>
            <View style={styles.carIconBox}>
              <MaterialCommunityIcons name="car-hatchback" size={24} color={THEME.PRIMARY} />
            </View>
            <View>
              <Text style={styles.plateNumber}>{item.car_profiles?.plate_number || 'UNKNOWN'}</Text>
              <Text style={styles.carBrand}>{item.car_profiles?.brand || 'Vehicle'}</Text>
            </View>
          </View>

          {/* Fuel Details */}
          <View style={styles.fuelRow}>
            <View style={styles.fuelTag}>
              <MaterialCommunityIcons name="gas-station" size={14} color={THEME.MEDIUM} />
              <Text style={styles.fuelTagText}>{item.fuel_type}</Text>
            </View>
            <View style={styles.fuelTag}>
              <MaterialCommunityIcons name="water" size={14} color={THEME.MEDIUM} />
              <Text style={styles.fuelTagText}>{item.requested_amount}L Requested</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionContainer}>
            {item.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.primaryBtn, { backgroundColor: THEME.SUCCESS }]}
                onPress={() => handleCarAction('start', item)}
              >
                <Text style={styles.btnText}>Start Service</Text>
                <Feather name="play" size={16} color="white" />
              </TouchableOpacity>
            )}

            {item.status === 'serving' && (
              <>
                <TouchableOpacity 
                  style={[styles.primaryBtn, { flex: 2 }]}
                  onPress={() => handleCarAction('complete', item)}
                >
                  <Text style={styles.btnText}>Complete</Text>
                  <Feather name="check" size={16} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.iconBtn, { backgroundColor: THEME.DANGER + '20' }]}
                  onPress={() => handleCarAction('skip', item)}
                >
                  <Feather name="x" size={20} color={THEME.DANGER} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const StatBox = ({ icon, value, label, color }) => (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.PRIMARY} />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* --- HEADER --- */}
      <LinearGradient colors={THEME.GRADIENT_PRIMARY} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
             
              <Text style={styles.stationName}>{stationInfo?.name || 'Station Manager'}</Text>
            </View>
           
          </View>

          {/* Floating Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={THEME.MEDIUM} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plate number or brand..."
              placeholderTextColor={THEME.MEDIUM}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={THEME.MEDIUM} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* --- BODY --- */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.PRIMARY} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <StatBox icon="clock" value={stats.pending} label="Waiting" color={THEME.WARNING} />
          <StatBox icon="zap" value={stats.serving} label="Serving" color={THEME.PRIMARY} />
          <StatBox icon="check-circle" value={stats.completedToday} label="Completed" color={THEME.SUCCESS} />
          <StatBox icon="droplet" value={`${stats.totalFuelSold}L`} label="Sold Today" color={THEME.DARK} />
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Text style={styles.sectionTitle}>Active Queue</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filteredActiveQueue.length}</Text>
            </View>
          </View>
          {filteredActiveQueue.length > 0 && (
             <TouchableOpacity onPress={onRefresh}>
               <Feather name="refresh-cw" size={14} color={THEME.PRIMARY} />
             </TouchableOpacity>
          )}
        </View>

        {/* Queue List */}
        {filteredActiveQueue.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="gas-station-off" size={60} color={THEME.BORDER} />
            <Text style={styles.emptyTitle}>Queue is Empty</Text>
            <Text style={styles.emptySub}>No cars are currently waiting for service.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredActiveQueue}
            renderItem={renderQueueItem}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
          />
        )}

         {/* --- BOTTOM NAV --- */}
      <View style={{paddingTop:200}}>
       
      </View>
      </ScrollView>

      {/* --- ACTION MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            
            <Text style={styles.modalTitle}>
              {selectedCar?.status === 'serving' ? 'Complete Service' : 'Start Service'}
            </Text>
            
            <View style={styles.modalCarInfo}>
              <Text style={styles.modalPlate}>{selectedCar?.car_profiles?.plate_number}</Text>
              <Text style={styles.modalBrand}>{selectedCar?.car_profiles?.brand} • {selectedCar?.fuel_type}</Text>
            </View>

            {selectedCar?.status === 'serving' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Fuel Served (Liters)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    placeholder="0.00"
                    value={servedAmount}
                    onChangeText={setServedAmount}
                    autoFocus
                  />
                  <Text style={styles.unitText}>L</Text>
                </View>
                <Text style={styles.helperText}>Requested: {selectedCar?.requested_amount}L</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => { setActionModalVisible(false); setServedAmount(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmBtn, { opacity: processingAction ? 0.7 : 1 }]}
                disabled={processingAction}
                onPress={() => performAction(selectedCar?.status === 'serving' ? 'complete' : 'start', selectedCar)}
              >
                {processingAction ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {selectedCar?.status === 'serving' ? 'Confirm Complete' : 'Confirm Start'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

     
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.SECONDARY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.SECONDARY,
  },
  loadingText: {
    marginTop: 10,
    color: THEME.MEDIUM,
    fontWeight: '500',
  },
  
  // Header
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  stationName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
  },
  notifBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 12,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: THEME.DANGER,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.PRIMARY,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 16,
    ...THEME.SHADOW,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: THEME.DARK,
  },

  // Body
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statBox: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...THEME.SHADOW,
    shadowOpacity: 0.05,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.DARK,
  },
  statLabel: {
    fontSize: 12,
    color: THEME.MEDIUM,
    fontWeight: '500',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.DARK,
  },
  countBadge: {
    backgroundColor: THEME.BORDER,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.MEDIUM,
  },

  // Cards
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    ...THEME.SHADOW,
  },
  cardLeftStrip: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  queueBadge: {
    backgroundColor: THEME.DARK,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queueBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  timestamp: {
    fontSize: 12,
    color: THEME.MEDIUM,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  carIconBox: {
    width: 44,
    height: 44,
    backgroundColor: THEME.LIGHT,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.DARK,
  },
  carBrand: {
    fontSize: 13,
    color: THEME.MEDIUM,
    fontWeight: '500',
  },
  fuelRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fuelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  fuelTagText: {
    fontSize: 12,
    color: THEME.MEDIUM,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: THEME.PRIMARY,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.MEDIUM,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 5,
  },
  footerSpacer: {
    height: 100,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: THEME.BORDER,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.DARK,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalCarInfo: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: THEME.LIGHT,
    padding: 15,
    borderRadius: 16,
  },
  modalPlate: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.PRIMARY,
  },
  modalBrand: {
    fontSize: 14,
    color: THEME.MEDIUM,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.MEDIUM,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: THEME.BORDER,
    paddingBottom: 5,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: THEME.DARK,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.MEDIUM,
    marginLeft: 10,
  },
  helperText: {
    textAlign: 'center',
    marginTop: 8,
    color: THEME.WARNING,
    fontSize: 13,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: THEME.LIGHT,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: THEME.PRIMARY,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '700',
    color: THEME.MEDIUM,
    fontSize: 16,
  },
  confirmBtnText: {
    fontWeight: '700',
    color: 'white',
    fontSize: 16,
  },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    ...THEME.SHADOW,
    shadowOffset: { width: 0, height: -4 },
  },
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 10,
    marginTop: 4,
    color: THEME.MEDIUM,
    fontWeight: '500',
  },
});