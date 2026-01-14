import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supa/supabase-client';

// --- REFINED BRAND PALETTE ---
const PRIMARY_COLOR = '#1e4b89';
const BG_LIGHT = '#FDFDFD'; // Slightly warmer white for premium feel
const CARD_WHITE = '#FFFFFF';
const TEXT_DARK = '#0F172A'; // Sharper dark
const TEXT_MUTED = '#64748B';
const BORDER_LIGHT = '#F1F5F9'; // Thinner, lighter borders
const DANGER_COLOR = '#EF4444';

export default function CarProfileLightScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [car, setCar] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      router.replace('../screens/welcome/welcome');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url, is_verified')
      .eq('id', authUser.id)
      .single();

    const { data: carProfile } = await supabase
      .from('car_profiles')
      .select('brand, plate_number, location')
      .eq('user_id', authUser.id)
      .single();

    setUser(profile);
    setCar(carProfile);
    setLoading(false);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          await supabase.auth.signOut();
          router.replace('../screens/welcome/welcome');
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  if (!user || !car) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG_LIGHT} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* MODERN PROFILE HEADER */}
        <View style={styles.headerProfile}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            {user.is_verified && (
              <View style={styles.verifiedBadge}>
                 <MaterialIcons name="verified" size={14} color="white" />
              </View>
            )}
          </View>

          <View style={styles.headerTexts}>
            <Text style={styles.fullName}>{user.full_name}</Text>
            <Text style={styles.username}>@{user.username}</Text>
          </View>

          <TouchableOpacity style={styles.editBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>

        {/* HIGH-CONTRAST VEHICLE CARD */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <View>
              <Text style={styles.vehicleLabel}>Current Vehicle</Text>
              <Text style={styles.vehicleName}>{car.brand}</Text>
            </View>
            <View style={styles.plateContainer}>
              <Text style={styles.plateText}>{car.plate_number}</Text>
            </View>
          </View>
          
          {/* Subtle design element to add "complexity" without adding content */}
          <View style={styles.cardGraphicContainer}>
             <MaterialCommunityIcons name="car-hatchback" size={100} color="rgba(255,255,255,0.1)" />
          </View>
        </View>

        {/* SETTINGS SECTION */}
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIconWrapper, { backgroundColor: '#FEE2E2' }]}>
               <MaterialCommunityIcons name="logout-variant" size={20} color={DANGER_COLOR} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuLabel, { color: DANGER_COLOR }]}>Logout</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Version 1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG_LIGHT 
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scrollContent: { 
    paddingHorizontal: 24, 
    paddingTop: 20,
    paddingBottom: 40 
  },
  headerProfile: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 30,
    backgroundColor: CARD_WHITE,
    padding: 20,
    borderRadius: 24,
    // Modern soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 15,
    elevation: 2,
    borderWidth: 1,
    borderColor: BORDER_LIGHT,
  },
  avatarWrapper: {
    position: 'relative'
  },
  avatar: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: BORDER_LIGHT
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white'
  },
  headerTexts: { 
    marginLeft: 16, 
    flex: 1 
  },
  fullName: { 
    color: TEXT_DARK, 
    fontSize: 18, 
    fontWeight: '700',
    letterSpacing: -0.5
  },
  username: { 
    color: TEXT_MUTED, 
    fontSize: 14,
    marginTop: 2
  },
  editBtn: { 
    backgroundColor: '#F1F5F9', 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  vehicleCard: { 
    backgroundColor: PRIMARY_COLOR, 
    borderRadius: 28, 
    padding: 24, 
    marginBottom: 30,
    overflow: 'hidden', // clips the graphic
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8
  },
  vehicleHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    zIndex: 2 // keeps text above background graphic
  },
  vehicleLabel: { 
    color: 'rgba(255,255,255,0.6)', 
    fontSize: 11, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  vehicleName: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: '800', 
    marginTop: 4 
  },
  plateContainer: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  plateText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 13, 
    letterSpacing: 1 
  },
  cardGraphicContainer: {
    position: 'absolute',
    bottom: -20,
    right: -10,
    zIndex: 1
  },
  sectionTitle: { 
    color: TEXT_DARK, 
    fontSize: 15, 
    fontWeight: '700', 
    marginBottom: 16,
    paddingLeft: 4
  },
  menuContainer: { 
    backgroundColor: CARD_WHITE, 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: BORDER_LIGHT,
    padding: 8
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12 
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  menuContent: { flex: 1 },
  menuLabel: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
  versionText: { 
    textAlign: 'center', 
    color: TEXT_MUTED, 
    fontSize: 12, 
    marginTop: 40,
    fontWeight: '500'
  },
});