import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Animated, Dimensions,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supa/supabase-client';

const { width } = Dimensions.get('window');

const COLORS = {
  PRIMARY: '#1e4b89',      // Deep Royal Blue
  ACCENT: '#3B82F6',       // Bright Blue
  SUCCESS: '#3B82F6',      // Emerald Green
  WARNING: '#3B82F6',      // Amber
  DANGER: '#EF4444',       // Rose Red
  WHITE: '#FFFFFF',
  BG: '#F1F5F9',           // Soft Gray Blue
  TEXT_MAIN: '#0F172A',
  TEXT_MUTED: '#64748B',
};

export default function MyQueueScreen() {
  const router = useRouter();
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelingQueueId, setCancelingQueueId] = useState(null);
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for LIVE indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchMyQueues = useCallback(async (showLoading = true) => {
    if (showLoading && !refreshing) setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/screens/welcome/welcome');

      const { data: myQueues, error } = await supabase
        .from('fuel_queue')
        .select(`
          id, station_user_id, queue_position, status, requested_amount, fuel_type,
          station_profiles(name, brand, location)
        `)
        .eq('car_user_id', user.id)
        .in('status', ['pending', 'serving'])
        .order('created_at', { ascending: false });

      if (error) throw error;

     
      const updatedQueues = await Promise.all(myQueues.map(async (q) => {
        const { count } = await supabase
          .from('fuel_queue')
          .select('*', { count: 'exact', head: true })
          .eq('station_user_id', q.station_user_id)
          .eq('status', 'pending')
          .lt('queue_position', q.queue_position);
        
        return { ...q, carsAhead: count || 0 };
      }));

      setQueues(updatedQueues);
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, router, fadeAnim]);

  useEffect(() => {
    fetchMyQueues();
    const channel = supabase
      .channel('my_queue_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_queue' }, () => fetchMyQueues(false))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchMyQueues]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyQueues(false);
  };

  // --- HARD DELETE LOGIC ---
  const handleLeaveQueue = async (queueId) => {
    Alert.alert(
      "Confirm Exit", 
      "Leaving will permanently delete this record. You cannot reclaim your spot.", 
      [
        { text: "Stay in Line", style: "cancel" },
        { 
          text: "Delete & Leave", 
          style: "destructive", 
          onPress: async () => {
            setCancelingQueueId(queueId);
            try {
              // PERMANENTLY DELETE RECORD
              const { error } = await supabase
                .from('fuel_queue')
                .delete()
                .eq('id', queueId);

              if (error) throw error;
              
              // Optimistic update
              setQueues(prev => prev.filter(q => q.id !== queueId));
            } catch (err) {
              Alert.alert("Error", "Could not remove record. Please try again.");
            } finally {
              setCancelingQueueId(null);
            }
          } 
        }
      ]
    );
  };

  const renderQueueItem = ({ item }) => {
    const isServing = item.status === 'serving';
    const progressWidth = item.carsAhead > 0 ? (1 / (item.carsAhead + 1)) * 100 : 100;

    return (
      <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={isServing ? ['#ffffff', '#f0fdf4'] : ['#ffffff', '#f8fafc']}
          style={styles.card}
        >
          {/* Header: Ticket Style */}
          <View style={styles.cardHeader}>
            <View style={styles.brandGroup}>
              <View style={[styles.iconCircle, { backgroundColor: isServing ? COLORS.SUCCESS : COLORS.PRIMARY }]}>
                <FontAwesome5 name="gas-pump" size={16} color="white" />
              </View>
              <View>
                <Text style={styles.stationName}>{item.station_profiles?.name}</Text>
                <Text style={styles.stationBrand}>{item.station_profiles?.brand}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isServing ? COLORS.SUCCESS : COLORS.WARNING }]}>
              <Text style={styles.statusBadgeText}>{isServing ? 'READY' : 'WAITING'}</Text>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.midSection}>
             <View style={styles.progressLabelRow}>
                <Text style={styles.progressHint}>
                  {isServing ? "Drive to the pump now" : "Cars waiting ahead"}
                </Text>
                <Text style={styles.progressMainNumber}>
                  {isServing ? "0" : item.carsAhead}
                </Text>
             </View>
             <View style={styles.track}>
                <Animated.View 
                  style={[
                    styles.fill, 
                    { width: `${progressWidth}%`, backgroundColor: isServing ? COLORS.SUCCESS : COLORS.PRIMARY }
                  ]} 
                />
             </View>
          </View>

          {/* Details & Actions */}
          <View style={styles.cardFooter}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>FUEL TYPE</Text>
              <Text style={styles.detailValue}>{item.fuel_type}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>AMOUNT</Text>
              <Text style={styles.detailValue}>{item.requested_amount}L</Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteBtn}
              onPress={() => handleLeaveQueue(item.id)}
            >
              {cancelingQueueId === item.id ? (
                <ActivityIndicator size="small" color={COLORS.DANGER} />
              ) : (
                <Ionicons name="trash-outline" size={22} color={COLORS.DANGER} />
              )}
            </TouchableOpacity>
          </View>

          {/* Real-time Indicator Dot */}
          <View style={styles.liveWrapper}>
            <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>REAL-TIME TRACKING</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>My Position</Text>
          <Text style={styles.headerSub}>Manage your active reservations</Text>
        </View>
        <TouchableOpacity style={styles.circleRefresh} onPress={onRefresh}>
          <Ionicons name="reload" size={20} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={queues}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderQueueItem}
        contentContainerStyle={styles.listPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyGraphic}>
              <Ionicons name="leaf-outline" size={50} color={COLORS.TEXT_MUTED} />
            </View>
            <Text style={styles.emptyTitle}>Queue is Empty</Text>
            <Text style={styles.emptyText}>Join a fuel station queue to see it live-tracked here.</Text>
            <TouchableOpacity style={styles.mainAction} onPress={() => router.push('/')}>
              <Text style={styles.mainActionText}>Find Station</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG },
  topHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 25, paddingVertical: 20
  },
  headerTitle: { fontSize: 32, fontWeight: '900', color: COLORS.TEXT_MAIN, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: COLORS.TEXT_MUTED, fontWeight: '500' },
  circleRefresh: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowOpacity: 0.1 },

  listPadding: { paddingHorizontal: 20, paddingBottom: 50 },
  cardContainer: { marginBottom: 20 },
  card: {
    borderRadius: 30, padding: 25,
    shadowColor: COLORS.PRIMARY, shadowOpacity: 0.08, shadowRadius: 20, elevation: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  stationName: { fontSize: 18, fontWeight: '900', color: COLORS.TEXT_MAIN },
  stationBrand: { fontSize: 12, fontWeight: '600', color: COLORS.TEXT_MUTED, textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusBadgeText: { color: 'white', fontSize: 10, fontWeight: '900' },

  midSection: { marginBottom: 25 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
  progressHint: { fontSize: 13, color: COLORS.TEXT_MUTED, fontWeight: '600' },
  progressMainNumber: { fontSize: 32, fontWeight: '900', color: COLORS.TEXT_MAIN, lineHeight: 32 },
  track: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },

  cardFooter: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' 
  },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 9, fontWeight: '800', color: COLORS.TEXT_MUTED, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '700', color: COLORS.TEXT_MAIN },
  deleteBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  liveWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 15 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.DANGER },
  liveText: { fontSize: 10, fontWeight: '800', color: COLORS.TEXT_MUTED, letterSpacing: 1 },

  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100, paddingHorizontal: 50 },
  emptyGraphic: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: COLORS.TEXT_MAIN },
  emptyText: { textAlign: 'center', color: COLORS.TEXT_MUTED, marginTop: 10, lineHeight: 22 },
  mainAction: { backgroundColor: COLORS.PRIMARY, marginTop: 30, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20 },
  mainActionText: { color: 'white', fontWeight: '900', fontSize: 16 }
});