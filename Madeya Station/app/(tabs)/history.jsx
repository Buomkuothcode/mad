import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '../supa/supabase-client';

const { width } = Dimensions.get('window');

// --- MATCHING THEME CONFIGURATION ---
const THEME = {
  GRADIENT_PRIMARY: ['#1e3c72', '#2a5298'],
  PRIMARY: '#2a5298',
  SECONDARY: '#F1F5F9',
  SUCCESS: '#2a5298',
  DARK: '#1e293b',
  MEDIUM: '#64748B',
  LIGHT: '#F8FAFC',
  WHITE: '#FFFFFF',
  BORDER: '#E2E8F0',
  SHADOW: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  }
};

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totals, setTotals] = useState({ fuel: 0, count: 0 });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('../screens/welcome/welcome');
      }

      const { data, error } = await supabase
        .from('fuel_queue')
        .select(`*, car_profiles:car_user_id (brand, plate_number)`)
        .eq('station_user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
      const totalFuel = data?.reduce((sum, item) => sum + (item.served_amount || 0), 0);
      setTotals({ fuel: totalFuel.toFixed(1), count: data?.length || 0 });
    } catch (error) {
      console.error('History Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => 
    item.car_profiles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.fuel_type.toLowerCase().includes(searchQuery.toLowerCase())
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

  const renderHistoryItem = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View style={styles.card}>
        <View style={[styles.cardLeftStrip, { backgroundColor: THEME.SUCCESS }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
                <Text style={[styles.badgeText, { color: THEME.SUCCESS }]}>COMPLETED</Text>
            </View>
            <Text style={styles.timestamp}>
              {new Date(item.completed_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.carRow}>
            <View style={styles.carIconBox}>
              <MaterialCommunityIcons name="car-hatchback" size={24} color={THEME.PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.plateNumber}>{item.car_profiles?.plate_number}</Text>
              <Text style={styles.carBrand}>{item.car_profiles?.brand} • {item.fuel_type}</Text>
            </View>
            <View style={styles.amountContainer}>
                <Text style={styles.amountText}>{item.served_amount}L</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* --- MATCHING HEADER --- */}
      <LinearGradient colors={THEME.GRADIENT_PRIMARY} style={styles.header}>
        <SafeAreaView>
         

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={THEME.MEDIUM} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search history..."
              placeholderTextColor={THEME.MEDIUM}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* --- BODY --- */}
      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <StatBox icon="droplet" value={`${totals.fuel}L`} label="Total Dispensed" color={THEME.PRIMARY} />
          <StatBox icon="hash" value={totals.count} label="Cars Served" color={THEME.SUCCESS} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={THEME.PRIMARY} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredHistory}
            renderItem={renderHistoryItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="history" size={60} color={THEME.BORDER} />
                    <Text style={styles.emptyTitle}>No History Found</Text>
                </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.SECONDARY },
  
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
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '800',
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
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
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: THEME.DARK },

  // Stats
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
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
  statValue: { fontSize: 18, fontWeight: '800', color: THEME.DARK },
  statLabel: { fontSize: 11, color: THEME.MEDIUM, fontWeight: '500' },

  // List Cards
  listPadding: { paddingBottom: 40 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...THEME.SHADOW,
    shadowOpacity: 0.05,
  },
  cardLeftStrip: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: THEME.SUCCESS + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  timestamp: { fontSize: 12, color: THEME.MEDIUM },
  carRow: { flexDirection: 'row', alignItems: 'center' },
  carIconBox: {
    width: 44,
    height: 44,
    backgroundColor: THEME.LIGHT,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  plateNumber: { fontSize: 17, fontWeight: '800', color: THEME.DARK },
  carBrand: { fontSize: 13, color: THEME.MEDIUM, fontWeight: '500' },
  amountContainer: {
    backgroundColor: THEME.LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.SUCCESS,
  },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: THEME.MEDIUM, marginTop: 10 }
});