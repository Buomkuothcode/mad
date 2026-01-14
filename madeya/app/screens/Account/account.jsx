import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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


const THEME = {
  primary: '#1e4b89',       
  primaryLight: '#2c62b0',
  primaryPale: '#e8eff7',
  white: '#FFFFFF',
  textDark: '#121212',
  accent: '#FFD700',
  error: '#FF6B6B',
  success: '#2c62b0',
};

const { width, height } = Dimensions.get('window');

const Account = () => {
  const router = useRouter();

 
  const [formData, setFormData] = useState({
    plateNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', type: 'error' });

  const slideUpAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const alertModalFadeAnim = useRef(new Animated.Value(0)).current;

  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideUpAnim, { toValue: 0, friction: 8, tension: 20, useNativeDriver: true }),
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
const handleSignUp = async () => {
  Keyboard.dismiss();
  const { plateNumber, email, password, confirmPassword } = formData;

  // 1. Basic Validation
  if (!plateNumber || !email || !password || !confirmPassword) {
    return showAlert('Missing Fields', 'Please fill in all details.', 'warning');
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

  // 4. Plate number validation
  const plateRegex = /^[A-Z0-9-]{3,10}$/i;
  const cleanedPlate = plateNumber.trim().toUpperCase();
  if (!plateRegex.test(cleanedPlate)) {
    return showAlert('Invalid Plate Number', 'Please enter a valid plate number (e.g., ABC-123 or ABC123).', 'error');
  }

  setLoading(true);

  try {
    console.log('1. Checking plate number availability...');
    
    // 5. Check if plate number already exists in car_profiles
    const { data: existingCar, error: checkError } = await supabase
      .from('car_profiles')
      .select('plate_number')
      .eq('plate_number', cleanedPlate)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingCar) {
      throw new Error('This plate number is already registered to a car.');
    }

    // 6. Check if plate number exists in truck_profiles
    const { data: existingTruck, error: truckCheckError } = await supabase
      .from('truck_profiles')
      .select('plate_number')
      .eq('plate_number', cleanedPlate)
      .maybeSingle();

    if (truckCheckError) throw truckCheckError;
    if (existingTruck) {
      throw new Error('This plate number is already registered to a truck.');
    }

    console.log('2. Creating Supabase auth user...');
    
    // 7. Supabase Auth Sign Up
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        data: {
          plate_number: cleanedPlate,
          role: 'car' // Set role in user metadata
        }
      }
    });

    if (signUpError) throw signUpError;

    const user = authData.user;
    if (!user) throw new Error('User creation failed.');
    
    console.log('3. User created with ID:', user.id);

    // 8. Create profile entry with role column
    const username = `car_${cleanedPlate.replace(/[^A-Z0-9]/g, '_')}`.substring(0, 50);
    
    console.log('4. Creating profile with username:', username);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        username: username,
        full_name: cleanedPlate,
        role: 'car', // SIMPLE ROLE ASSIGNMENT
        updated_at: new Date().toISOString(),
        is_verified: false
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Try with alternative username if conflict
      if (profileError.code === '23505' && profileError.message.includes('username')) {
        console.log('Username conflict, trying alternative...');
        const altUsername = `${username}_${Date.now().toString().slice(-6)}`;
        
        const { error: altProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: altUsername,
            full_name: cleanedPlate,
            role: 'car', // Role here too
            updated_at: new Date().toISOString(),
            is_verified: false
          });
          
        if (altProfileError) {
          console.error('Alternative profile creation error:', altProfileError);
          throw altProfileError;
        }
        console.log('Profile created with alternative username:', altUsername);
      } else {
        throw profileError;
      }
    } else {
      console.log('Profile created successfully with role: car');
    }

    // 9. Create car profile entry
    console.log('5. Creating car profile...');
    
    const { error: carProfileError } = await supabase
      .from('car_profiles')
      .insert({
        user_id: user.id,
        plate_number: cleanedPlate,
        brand: '',
        location: ''
      });

    if (carProfileError) {
      console.error('Car profile creation error:', carProfileError);
      
      // Rollback: delete the profile if car profile creation fails
      console.log('Rolling back: deleting profile...');
      await supabase.from('profiles').delete().eq('id', user.id);
      
      throw carProfileError;
    }
    
    console.log('6. Car profile created successfully');

    // 10. Optional: Try to update user_roles for backward compatibility (silently fail)
    console.log('7. Optional: Trying user_roles for backward compatibility...');
    try {
      const { error: userRoleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role_id: 1
        });
      
      if (userRoleError) {
        console.log('user_roles insertion failed (expected if table/trigger issues):', userRoleError.message);
      } else {
        console.log('user_roles also updated for backward compatibility');
      }
    } catch (userRoleErr) {
      console.log('user_roles error (non-critical):', userRoleErr.message);
    }

    // 11. Verify registration
    console.log('8. Verifying registration...');
    
    const { data: finalCheck, error: verifyError } = await supabase
      .from('profiles')
      .select('username, role, car_profiles(plate_number)')
      .eq('id', user.id)
      .single();
    
    if (verifyError) {
      console.error('Verification error:', verifyError);
    } else if (finalCheck) {
      console.log('✓ Registration verified successfully');
      console.log('Username:', finalCheck.username);
      console.log('Role:', finalCheck.role);
      console.log('Plate:', finalCheck.car_profiles?.[0]?.plate_number);
    }

    // 12. Success
    console.log('9. Registration completed successfully!');
    
    showAlert(
      'Account Created Successfully!',
      `You have been registered as a car driver.\n\n• Plate: ${cleanedPlate}\n• Role: Car Driver\n• Username: ${username}\n\nYou can now log in to access the app.`,
      'success'
    );

  } catch (error) {
    console.error('Registration Error:', error);
    
    // User-friendly error messages
    let msg = error.message;
    if (msg.includes('already registered') || msg.includes('already exists')) {
      msg = 'This plate number or email is already registered.';
    } else if (msg.includes('User already registered')) {
      msg = 'This email is already registered. Please use a different email.';
    } else if (msg.includes('unique constraint')) {
      if (msg.includes('plate_number')) {
        msg = 'This plate number is already registered to another vehicle.';
      } else if (msg.includes('username')) {
        msg = 'Username already exists. Please try a different plate number.';
      }
    } else if (msg.includes('violates foreign key constraint')) {
      msg = 'Registration failed due to system error. Please try again.';
    } else if (msg.includes('User creation failed')) {
      msg = 'Could not create user account. Please check your email.';
    } else if (msg.includes('check constraint')) {
      if (msg.includes('role')) {
        msg = 'Invalid role. Please contact support.';
      } else if (msg.includes('username')) {
        msg = 'Plate number is too short. Please use a longer plate number.';
      }
    } else if (msg.includes('AuthApiError')) {
      if (msg.includes('Email not confirmed')) {
        msg = 'Please check your email for confirmation link.';
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'Invalid email or password format.';
      }
    }
    
    showAlert('Registration Failed', msg, 'error');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* --- TOP SECTION (White) --- */}
      <View style={styles.topSection}>
        <View style={styles.ring1} />
        <View style={styles.ring2} />

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', transform: [{ scale: pulseAnim }] }}>
          <View style={styles.logoContainer}>
            {/* Car Icon for "Madeya" / Plate Number context */}
            <Ionicons name="car-sport" size={50} color={THEME.primary} />
          </View>
          <Text style={styles.brandTitle}>Madeya</Text>
          <Text style={styles.brandSubtitle}>Driver Registration</Text>
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

            <Text style={styles.headerText}>Create Account</Text>

            {/* FORM INPUTS */}
            <View style={styles.inputGroup}>

              {/* Plate Number */}
              <View style={styles.inputWrapper}>
                <Ionicons name="card-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Plate Number"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  style={styles.input}
                  value={formData.plateNumber}
                  onChangeText={(t) => handleChange('plateNumber', t)}
                  autoCapitalize="characters" // Capitalize plates
                />
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={THEME.white} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email Address"
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
                  placeholder="Password"
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
                  placeholder="Confirm Password"
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
                onPress={handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={THEME.primary} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Sign Up</Text>
                    <Ionicons name="arrow-forward-circle" size={24} color={THEME.primary} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Already have an account? </Text>
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
                color={alertConfig.type === 'error' ? THEME.error : (alertConfig.type === 'success' ? THEME.success : THEME.accent)}
              />
            </View>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMsg}>{alertConfig.message}</Text>
            <TouchableOpacity
              style={[styles.alertBtn, { backgroundColor: alertConfig.type === 'success' ? THEME.success : THEME.primary }]}
              onPress={closeAlert}
            >
              <Text style={styles.alertBtnText}>{alertConfig.type === 'success' ? 'Login Now' : 'Okay'}</Text>
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
    height: height * 0.35, // Slightly shorter than login to fit form
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
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(255,255,255,0.1)', // Glassmorphism
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
  loginLink: {
    color: THEME.white,
    fontWeight: 'bold',
    fontSize: 15,
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

export default Account;