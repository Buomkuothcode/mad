import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing // Make sure Easing is imported
  ,



  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supa/supabase-client';

// --- THEME CONFIG ---
const THEME = {
  primary: '#1e4b89',       // Deep Blue
  primaryLight: '#2c62b0',
  primaryPale: '#e8eff7',
  white: '#FFFFFF',
  textDark: '#121212',
  accent: '#2c62b0',        // Lighter Blue
  error: '#2c62b0',
  success: '#2c62b0',
  stationGreen: '#2c62b0',   // Added station green
};

const { width, height } = Dimensions.get('window');

const StationAccount = () => {
  const router = useRouter();

  // --- State ---
  const [formData, setFormData] = useState({
    stationName: '',
    stationBrand: '',
    location: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);

  // Alert State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' });

  // Animations
  const slideUpAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const alertModalFadeAnim = useRef(new Animated.Value(0)).current;
  const pumpPulseAnim = useRef(new Animated.Value(0)).current;

  // --- Animation On Mount ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 20, useNativeDriver: true }),
    ]).start();

    // Fuel pump pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Fuel pulse for pump icon - FIXED Easing usage
    Animated.loop(
      Animated.sequence([
        Animated.timing(pumpPulseAnim, { 
          toValue: 1, 
          duration: 1500, 
          easing: Easing.inOut(Easing.sin),  // Fixed: Use Easing directly, not Animated.Easing
          useNativeDriver: true 
        }),
        Animated.timing(pumpPulseAnim, { 
          toValue: 0, 
          duration: 1500, 
          easing: Easing.inOut(Easing.sin),  // Fixed: Use Easing directly
          useNativeDriver: true 
        }),
      ])
    ).start();

  }, []);

  // --- Helper Functions ---
  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
    Animated.timing(alertModalFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const closeAlert = () => {
    Animated.timing(alertModalFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowAlertModal(false);
      if (alertConfig.type === 'success') {
        router.replace('../Login/Login');
      }
    });
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- Validation & Submit ---
  const handleStationSignUp = async () => {
    Keyboard.dismiss();
    const { stationName, stationBrand, location, email, password, confirmPassword } = formData;

    // 1. Basic Validation
    if (!stationName || !stationBrand || !location || !email || !password || !confirmPassword) {
      return showAlert('Missing Fields', 'Please fill in all station details.', 'warning');
    }

    // 2. Email Regex
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return showAlert('Invalid Email', 'Please enter a valid email address.', 'error');
    }

    // 3. Password Match
    if (password !== confirmPassword) {
      return showAlert('Password Mismatch', 'Passwords do not match.', 'error');
    }

    if (password.length < 6) {
      return showAlert('Weak Password', 'Password must be at least 6 characters.', 'warning');
    }

    setLoading(true);

    try {
      // 4. Supabase Sign Up with station role
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            role: 'station', // Set role as station
            full_name: stationName.trim(),
            station_name: stationName.trim(),
            station_brand: stationBrand.trim(),
          }
        }
      });

      if (signUpError) throw signUpError;

      const user = authData.user;
      if (!user) throw new Error('User creation failed.');

      // 5. Insert into profiles table with station role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          role: 'station',
          full_name: stationName.trim(),
          updated_at: new Date().toISOString(),
          is_verified: false, // Default to false, can be verified later
        });

      if (profileError) throw profileError;

      // 6. Insert into station_profiles table
      const { error: stationProfileError } = await supabase
        .from('station_profiles')
        .insert({
          user_id: user.id,
          name: stationName.trim(),
          brand: stationBrand.trim(),
          location: location.trim(),
          is_verified: false, // Default to false
        });

      if (stationProfileError) {
        // Check if it's a duplicate station name error
        if (stationProfileError.code === '23505') {
          throw new Error('Station name already exists. Please choose a different name.');
        }
        throw stationProfileError;
      }

      // 7. Success
      showAlert(
        'Station Account Created!',
        `Your station "${stationName}" has been registered successfully. Please check your email to verify your account.`,
        'success'
      );

    } catch (error) {
      console.error('Station Registration Error:', error);
      let msg = error.message;
      
      // Handle specific error cases
      if (msg.includes('already registered')) {
        msg = 'This email is already in use.';
      } else if (msg.includes('duplicate key')) {
        msg = 'Station name already exists. Please choose a different name.';
      } else if (msg.includes('violates unique constraint')) {
        msg = 'Station name must be unique. Please choose a different name.';
      }
      
      showAlert('Registration Failed', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fuel pump glow interpolation
  const pumpGlowOpacity = pumpPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8]
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* --- TOP SECTION (White) --- */}
      <View style={styles.topSection}>
        <View style={styles.ring1} />
        <View style={styles.ring2} />

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', transform: [{ scale: pulseAnim }] }}>
          <View style={styles.logoContainer}>
            {/* Animated Fuel Pump Icon with glow */}
            <Animated.View style={[
              styles.pumpGlow,
              { opacity: pumpGlowOpacity }
            ]} />
            <Ionicons name="business" size={50} color={THEME.primary} />
          </View>
          <Text style={styles.brandTitle}>Madeya Station</Text>
          <Text style={styles.brandSubtitle}>Station Registration</Text>
        </Animated.View>
      </View>

      {/* --- BOTTOM SECTION (Blue) --- */}
      <Animated.View style={[styles.bottomContainer, { transform: [{ translateY: slideUpAnim }] }]}>

        {/* The Convex Curve */}
        <View style={styles.curveMask}>
          <View style={styles.curveShape} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>

            <Text style={styles.headerText}>Register Your Station</Text>

            {/* FORM INPUTS */}
            <View style={styles.inputGroup}>

              {/* Station Name */}
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Station Name *"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={formData.stationName}
                  onChangeText={(t) => handleChange('stationName', t)}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>

              {/* Station Brand */}
              <View style={styles.inputWrapper}>
                <Ionicons name="flag-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Station Brand (e.g., Shell, BP)"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={formData.stationBrand}
                  onChangeText={(t) => handleChange('stationBrand', t)}
                  autoCapitalize="words"
                />
              </View>

              {/* Location */}
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Station Location (Address)"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(t) => handleChange('location', t)}
                  autoCapitalize="words"
                />
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email Address *"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(t) => handleChange('email', t)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password *"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(t) => handleChange('password', t)}
                  secureTextEntry={secureTextEntry}
                />
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Ionicons name={secureTextEntry ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Confirm Password *"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(t) => handleChange('confirmPassword', t)}
                  secureTextEntry={secureConfirmEntry}
                />
                <TouchableOpacity onPress={() => setSecureConfirmEntry(!secureConfirmEntry)}>
                  <Ionicons name={secureConfirmEntry ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </View>


            </View>

            {/* BUTTONS */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.primaryButton}
                onPress={handleStationSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={THEME.primary} />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={24} color={THEME.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Register Station</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Already have a station? </Text>
                <TouchableOpacity onPress={() => router.push('../Login/Login')}>
                  <Text style={styles.loginLink}>Log In</Text>
                </TouchableOpacity>
              </View>
              
             
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* --- ALERT MODAL --- */}
      <Modal visible={showAlertModal} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.alertBox, { opacity: alertModalFadeAnim, transform: [{ scale: alertModalFadeAnim }] }]}>
            <View style={[styles.alertIcon, { backgroundColor: alertConfig.type === 'error' ? '#FFEBEE' : (alertConfig.type === 'success' ? '#E8F5E9' : '#FFF3E0') }]}>
              <Ionicons
                name={alertConfig.type === 'success' ? "checkmark-circle" : (alertConfig.type === 'error' ? "alert" : "warning")}
                size={32}
                color={alertConfig.type === 'error' ? THEME.error : (alertConfig.type === 'success' ? THEME.stationGreen : THEME.accent)}
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMsg}>{alertConfig.message}</Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: alertConfig.type === 'success' ? THEME.stationGreen : THEME.primary }]}
              onPress={closeAlert}
            >
              <Text style={styles.alertBtnText}>{alertConfig.type === 'success' ? 'Go to Login' : 'Okay'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.white,
  },

  // --- TOP SECTION ---
  topSection: {
    height: height * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring1: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: THEME.primaryPale,
    opacity: 0.6,
  },
  ring2: {
    position: 'absolute',
    top: 50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F3F4F6',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 10,
    position: 'relative',
    overflow: 'visible',
  },
  pumpGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.stationGreen,
    zIndex: -1,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: THEME.stationGreen,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // --- BOTTOM SECTION ---
  bottomContainer: {
    flex: 1,
    backgroundColor: THEME.primary,
    marginTop: -30,
  },
  curveMask: {
    height: 50,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginTop: -49,
    zIndex: 10,
  },
  curveShape: {
    width: width,
    height: 100,
    backgroundColor: THEME.primary,
    borderRadius: width,
    transform: [{ scaleX: 1.5 }],
    top: 0,
  },
  formContent: {
    paddingHorizontal: 30,
    paddingTop: 0,
    paddingBottom: 40,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.white,
    marginBottom: 25,
    textAlign: 'center',
  },

  // --- INPUTS ---
  inputGroup: {
    gap: 16,
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: THEME.white,
    fontSize: 16,
    height: '100%',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: THEME.stationGreen,
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },

  // --- ACTIONS ---
  actionGroup: {
    gap: 20,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: THEME.white,
    width: '100%',
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButtonText: {
    color: THEME.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  loginLink: {
    color: THEME.white,
    fontWeight: 'bold',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  switchAccountType: {
    marginTop: 10,
    padding: 8,
  },
  switchText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  switchLink: {
    color: THEME.accent,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

  // --- MODAL ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  alertIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.textDark,
    marginBottom: 8,
  },
  alertMsg: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  alertBtn: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  alertBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StationAccount;