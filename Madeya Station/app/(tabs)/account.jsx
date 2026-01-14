import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';
import { supabase } from '../supa/supabase-client';

const { width } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 240;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 100 : 80;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const THEME = {
  GRADIENT_PRIMARY: ['#1e3c72', '#2a5298', '#2a5298'],
  PRIMARY: '#2a5298',
  SECONDARY: '#F1F5F9',
  DARK: '#1e293b',
  MEDIUM: '#64748B',
  WHITE: '#FFFFFF',
  BORDER: '#E2E8F0',
  DANGER: '#EF4444',
  SHADOW: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  }
};

export default function StationProfileScreen() {
  const router = useRouter();
  const scrollY = useSharedValue(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({ name: '', brand: '', location: '', latitude: '', longitude: '' });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('station_profiles').select('*').eq('user_id', user.id).single();
      if (data) setProfile({
        name: data.name || '',
        brand: data.brand || '',
        location: data.location || '',
        latitude: data.Latitude?.toString() || '',
        longitude: data.Longitude?.toString() || ''
      });
    } finally { setLoading(false); }
  };

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // --- ANIMATION STYLES ---
  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, HEADER_SCROLL_DISTANCE], [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT], Extrapolate.CLAMP);
    return { height };
  });

  const avatarStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [0, HEADER_SCROLL_DISTANCE], [1, 0.6], Extrapolate.CLAMP);
    const translateY = interpolate(scrollY.value, [0, HEADER_SCROLL_DISTANCE], [0, -10], Extrapolate.CLAMP);
    return { transform: [{ scale }, { translateY }] };
  });

  const textOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, HEADER_SCROLL_DISTANCE / 2], [1, 0], Extrapolate.CLAMP);
    return { opacity };
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={THEME.PRIMARY} /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- ANIMATED STICKY HEADER --- */}
      <Animated.View style={[styles.header, headerStyle]}>
        <LinearGradient colors={THEME.GRADIENT_PRIMARY} style={StyleSheet.absoluteFill}>
          <View style={styles.headerOverlay}>
            <View style={styles.navBar}>
              
              <Text style={styles.headerTitle}>Station Settings</Text>
              <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.iconBtn}>
                <Feather name={isEditing ? "check" : "edit-2"} size={20} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.headerContent}>
              <Animated.View style={[styles.avatarContainer, avatarStyle]}>
                <MaterialCommunityIcons name="gas-station" size={45} color={THEME.PRIMARY} />
              </Animated.View>
              <Animated.View style={textOpacity}>
                <Text style={styles.stationName}>{profile.name || "Station"}</Text>
                <Text style={styles.stationBrand}>{profile.brand || "Fuel Partner"}</Text>
              </Animated.View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* --- SCROLLABLE CONTENT --- */}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Information Details</Text>
          <View style={styles.card}>
            <InputField label="Station Name" value={profile.name} editable={isEditing} icon="storefront-outline" />
            <InputField label="Oil Brand" value={profile.brand} editable={isEditing} icon="business-outline" />
           
          </View>
        </View>

        

        <TouchableOpacity style={styles.logoutBtn} onPress={() => { supabase.auth.signOut();  router.replace('../screens/welcome/welcome'); }}>
          <Feather name="power" size={18} color={THEME.DANGER} />
          <Text style={styles.logoutText}>Sign Out Station</Text>
        </TouchableOpacity>
        <View style={{paddingBottom: 200}}></View>
      </Animated.ScrollView>
    </View>
  );
}

const InputField = ({ label, value, editable, icon, keyboardType }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, !editable && { opacity: 0.6 }]}>
      {icon && <Ionicons name={icon} size={18} color={THEME.MEDIUM} style={{ marginRight: 10 }} />}
      <TextInput
        style={styles.input}
        value={value}
        editable={editable}
        placeholder={`Set ${label}`}
        placeholderTextColor={THEME.MEDIUM}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.SECONDARY },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerOverlay: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 50,
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '800' },
  headerContent: { alignItems: 'center', marginTop: 10 },
  avatarContainer: {
    width: 85,
    height: 85,
    backgroundColor: 'white',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    ...THEME.SHADOW,
    marginBottom: 10,
  },
  stationName: { color: 'white', fontSize: 22, fontWeight: '800' },
  stationBrand: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },

  scrollContent: { paddingTop: HEADER_MAX_HEIGHT + 20, paddingHorizontal: 20, paddingBottom: 50 },
  section: { marginBottom: 25 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: THEME.MEDIUM, textTransform: 'uppercase', marginBottom: 12, marginLeft: 5 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 20, ...THEME.SHADOW, shadowOpacity: 0.04 },
  
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: THEME.MEDIUM, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 15, height: 52, borderWidth: 1, borderColor: THEME.BORDER },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: THEME.DARK },
  row: { flexDirection: 'row' },
  
  iconBtn: { width: 38, height: 38, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, borderRadius: 16, gap: 10, borderWeight: 1, borderColor: THEME.DANGER, backgroundColor: '#FFF1F1' },
  logoutText: { color: THEME.DANGER, fontWeight: '800', fontSize: 15 }
});