import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import { supabase } from '../../supa/supabase-client'; // Keep your path

// --- THEME CONFIG (Matches your Fluid Design) ---
const THEME = {
  primary: '#1e4b89',       // Deep Blue
  primaryLight: '#2c62b0',  // Lighter Blue for inputs
  primaryPale: '#e8eff7',   // Background rings
  white: '#FFFFFF',
  textDark: '#121212',
  accent: '#FFD700',
  error: '#FF6B6B',
};

const { width, height } = Dimensions.get('window');

// --- KEEPING YOUR EXACT DEVICE ID LOGIC (Not used in login, but kept for structure) ---
const generateDeviceUniqueId = async () => {
  try {
    const storedDeviceId = await AsyncStorage.getItem('device_unique_id');
    if (storedDeviceId) return storedDeviceId;

    let deviceId;
    if (Platform.OS === 'android') {
      const androidId = Application.androidId;
      const installationId = Application.installationId;
      deviceId = `android_${androidId || 'unknown'}_${installationId || Date.now()}`;
    } else {
      const deviceInfo = {
        brand: Device.brand || 'unknown',
        model: Device.modelName || Device.model || 'unknown',
        osName: Device.osName || 'unknown',
        deviceType: Device.deviceType || 0,
        manufacturer: Device.manufacturer || 'unknown',
        deviceYearClass: Device.deviceYearClass || 0,
      };
      const deviceString = JSON.stringify(deviceInfo);
      let hash = 0;
      for (let i = 0; i < deviceString.length; i++) {
        const char = deviceString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const installationId = Application.installationId;
      deviceId = `ios_${Math.abs(hash).toString(36)}_${installationId || Date.now()}`;
    }

    await AsyncStorage.setItem('device_unique_id', deviceId);
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    let fallbackId = await AsyncStorage.getItem('fallback_device_id');
    if (!fallbackId) {
      fallbackId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('fallback_device_id', fallbackId);
    }
    return fallbackId;
  }
};

const Login = () => {
  const router = useRouter();

  // State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Alert State
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' });

  // Animations
  const slideUpAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const alertModalFadeAnim = useRef(new Animated.Value(0)).current;

  // --- Animation Logic ---
  useEffect(() => {
    // 1. Entry Animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 20,
        useNativeDriver: true,
      }),
    ]).start();

   
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  
  const showAlert = (title, message, type = 'error') => {
    setAlertConfig({ title, message, type });
    setShowAlertModal(true);
    Animated.timing(alertModalFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const closeAlert = () => {
    Animated.timing(alertModalFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setShowAlertModal(false));
  };

  
  const handleHelp = async () => {
   
    const telegramUrl = 'https://t.me/MadeyaSupport';
    try {
      const supported = await Linking.canOpenURL(telegramUrl);
      if (supported) {
        await Linking.openURL(telegramUrl);
      } else {
        showAlert('Cannot Open Link', 'Please ensure you have Telegram installed, or contact support directly.', 'error');
      }
    } catch (error) {
      showAlert('Error', 'Could not open help link.', 'error');
    }
  };
const handleLogin = async () => {
  Keyboard.dismiss();
  if (!email || !password) {
    showAlert('Missing Info', 'Please enter both email and password.', 'warning');
    return;
  }

  setLoading(true);
  try {
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Authentication failed');

    console.log('User authenticated, checking role...');

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, username, full_name, car_profiles(plate_number)')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Could not fetch user profile');
    }

    if (!profileData) {
      throw new Error('User profile not found. Please contact support.');
    }

 
    const userRole = profileData.role;
    
    
    if (userRole !== 'car') {
      
      await supabase.auth.signOut();
      
      let errorMessage = 'Access Denied';
      if (userRole === 'truck') {
        errorMessage = 'This app is for car drivers only. Please use the truck driver app.';
      } else if (userRole === 'station') {
        errorMessage = 'This app is for car drivers only. Please use the fuel station app.';
      } else if (!userRole) {
        errorMessage = 'Your account does not have a role assigned. Please contact support.';
      } else {
        errorMessage = 'Your account does not have car driver permissions.';
      }
      
      throw new Error(errorMessage);
    }

  

    router.replace('../../(tabs)'); 
    setEmail('');
    setPassword('');

  } catch (error) {
    console.error('Login error:', error);
    let msg = error.message;
    
   
    if (msg.includes('Invalid login credentials')) {
      msg = 'Invalid email or password';
    } else if (msg.includes('Email not confirmed')) {
      msg = 'Please verify your email address before logging in.';
    } else if (msg.includes('Access Denied') || msg.includes('car driver')) {
     
    } else if (msg.includes('User profile not found')) {
      msg = 'Account setup incomplete. Please contact support.';
    }
    
    showAlert('Login Failed', msg, 'error');
  } finally {
    setLoading(false);
  }
};
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* --- TOP SECTION (White - Logo Area) --- */}
      <View style={styles.topSection}>
        {/* Background Decoration */}
        <View style={styles.ring1} />
        <View style={styles.ring2} />

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', transform: [{ scale: pulseAnim }] }}>
          <View style={styles.logoContainer}>
            {/* MADEVA CONTEXT ICON */}
            <Ionicons name="car-sport" size={60} color={THEME.primary} />
          </View>
          <Text style={styles.brandTitle}>Madeya</Text>
          <Text style={styles.brandSubtitle}>Driver Login</Text>
        </Animated.View>
      </View>

      {/* --- BOTTOM SECTION (Blue - Form Area) --- */}
      <Animated.View style={[styles.bottomContainer, { transform: [{ translateY: slideUpAnim }] }]}>

        {/* The Curve Shape */}
        <View style={styles.curveMask}>
          <View style={styles.curveShape} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>

            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.instructionText}>Please sign in to your account.</Text>

            {/* FORM INPUTS */}
            <View style={styles.inputGroup}>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                  textContentType="password"
                />
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Ionicons name={secureTextEntry ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity onPress={() => showAlert('Reset Password', 'To reset your password, please use the "Forgot Password" link on the web portal or contact support.', 'info')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

            </View>

            {/* BUTTONS */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={THEME.primary} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Log In</Text>
                    <Ionicons name="arrow-forward" size={20} color={THEME.primary} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('../Account/account')}>
                  <Text style={styles.signupText}>Sign Up</Text>
                </TouchableOpacity>
              </View>

              {/* Help Center Pill */}
              <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
                <Ionicons name="chatbubbles-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.helpText}>Help Center</Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingBottom: 200 }}>

            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>

      {/* --- CUSTOM ALERT MODAL --- */}
      <Modal visible={showAlertModal} transparent animationType="fade" onRequestClose={closeAlert}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.alertBox, { opacity: alertModalFadeAnim, transform: [{ scale: alertModalFadeAnim }] }]}>
            <View style={[styles.alertIcon, { backgroundColor: alertConfig.type === 'error' ? '#FFEBEE' : (alertConfig.type === 'warning' ? '#FFF3E0' : '#E3F2FD') }]}>
              <Ionicons
                name={alertConfig.type === 'error' ? "alert" : (alertConfig.type === 'warning' ? "warning" : "information-circle")}
                size={32}
                color={alertConfig.type === 'error' ? THEME.error : (alertConfig.type === 'warning' ? THEME.accent : THEME.primary)}
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMsg}>{alertConfig.message}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={closeAlert}>
              <Text style={styles.alertBtnText}>Okay</Text>
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
    height: height * 0.45, // 45% of screen
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 15,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 5,
    textTransform: 'uppercase',
  },

  // --- BOTTOM SECTION ---
  bottomContainer: {
    flex: 1,
    backgroundColor: THEME.primary,
    marginTop: -40, // Pull up to overlap slightly 
  },
  curveMask: {
    height: 60,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    marginTop: -59, // Pull the curve UP into the white space
    zIndex: 10,
  },
  curveShape: {
    width: width,
    height: 120,
    backgroundColor: THEME.primary,
    borderRadius: width,
    transform: [{ scaleX: 1.5 }],
    top: 0,
  },
  formContent: {
    paddingHorizontal: 30,
    paddingTop: 10,
    paddingBottom: 30,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: THEME.white,
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 30,
  },

  // --- INPUTS ---
  inputGroup: {
    gap: 16,
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', // Glass effect
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 60,
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
  forgotText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
  },

  // --- ACTIONS ---
  actionGroup: {
    gap: 20,
    alignItems: 'center',
  },
  loginButton: {
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
  loginButtonText: {
    color: THEME.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  signupText: {
    color: THEME.white,
    fontWeight: 'bold',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  helpText: {
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
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
    backgroundColor: THEME.primary,
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

export default Login;