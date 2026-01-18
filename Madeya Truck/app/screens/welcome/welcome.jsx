import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

// --- COLOR CONFIGURATION ---
const THEME = {
  primary: '#1e4b89',        // MAIN BLUE
  primaryLight: '#2c62b0',   // LIGHTER BLUE
  primaryPale: '#e8eff7',    // PALE BLUE BACKGROUND
  white: '#FFFFFF',
  textDark: '#121212',
  textGrey: '#9CA3AF',
  accent: '#2c62b0',         // GOLD/YELLOW
  stationGreen: '#2c62b0',   // STATION GREEN
};

export default function MadeyaStationWelcome() {
  const router = useRouter();

  // Animation references
  const slideUpAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fuelPulseAnim = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const pumpAnim = useRef(new Animated.Value(0)).current;
  const queueAnim = useRef(new Animated.Value(0)).current;
  const bgStarsAnim = useRef(new Animated.Value(0)).current;
  const gaugeAnim = useRef(new Animated.Value(0)).current;
  const truckAnim = useRef(new Animated.Value(0)).current;

  // Station animations
  useEffect(() => {
    // Initial entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Fuel pump pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(fuelPulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(fuelPulseAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Station radar scanning
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.delay(500),
      ])
    ).start();

    // Pump nozzle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pumpAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(400),
        Animated.timing(pumpAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ])
    ).start();

    // Queue movement animation
    Animated.loop(
      Animated.timing(queueAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Gauge needle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(gaugeAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(gaugeAnim, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fuel truck delivery animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(truckAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    ).start();

    // Background floating particles
    Animated.loop(
      Animated.timing(bgStarsAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      {/* --- ANIMATED BACKGROUND --- */}
      <View style={styles.background}>
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${(i * 7) % 100}%`,
                top: `${(i * 13) % 100}%`,
                opacity: 0.1 + (i % 3) * 0.1,
                transform: [
                  {
                    translateY: bgStarsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 50]
                    })
                  }
                ]
              }
            ]}
          />
        ))}
      </View>

      {/* --- TOP SECTION --- */}
      <View style={styles.topSection}>
        <LinearGradient
          colors={[THEME.primaryPale, THEME.white]}
          style={styles.gradientBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Animated Rings */}
        <Animated.View style={[
          styles.ring,
          styles.ring1,
          {
            transform: [{
              scale: radarAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.3]
              })
            }]
          }
        ]} />
        <View style={[styles.ring, styles.ring2]} />
        <View style={[styles.ring, styles.ring3]} />

        {/* Station Animation Area */}
        <View style={styles.animationArea}>
          
          {/* Station Building */}
          <View style={styles.stationBuilding}>
            <View style={styles.stationRoof}>
              <Text style={styles.stationSign}>FUEL STATION</Text>
            </View>
            <View style={styles.stationBody}>
              <View style={styles.stationWindows}>
                <View style={styles.stationWindow} />
                <View style={styles.stationWindow} />
              </View>
              <View style={styles.stationDoor}>
                <Ionicons name="storefront" size={20} color={THEME.white} />
              </View>
            </View>
          </View>

          {/* Fuel Pumps Row */}
          <View style={styles.pumpsRow}>
            {[1, 2, 3].map((num) => (
              <View key={num} style={styles.pumpContainer}>
                {/* Pump Body */}
                <View style={styles.pumpBody}>
                  <LinearGradient
                    colors={[THEME.primary, THEME.primaryLight]}
                    style={styles.pumpGradient}
                  >
                    <View style={styles.pumpDisplay}>
                      <Text style={styles.pumpText}>DIESEL</Text>
                      
                    </View>
                    
                    {/* Pump Nozzle */}
                    <Animated.View style={[
                      styles.pumpNozzle,
                      {
                        transform: [
                          { translateY: pumpAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -8]
                          })}
                        ]
                      }
                    ]}>
                      <View style={styles.nozzleHandle} />
                      <View style={styles.nozzleHose} />
                    </Animated.View>
                    
                    {/* Fuel Level */}
                    <Animated.View style={[
                      styles.fuelLevel,
                      {
                        height: fuelPulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['30%', '70%']
                        })
                      }
                    ]} />
                  </LinearGradient>
                </View>
                
                {/* Pump Base */}
                <View style={styles.pumpBase} />
              </View>
            ))}
          </View>

          {/* Fuel Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gauge}>
              <Animated.View style={[
                styles.gaugeNeedle,
                {
                  transform: [{
                    rotate: gaugeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-45deg', '45deg']
                    })
                  }]
                }
              ]} />
              <View style={styles.gaugeCenter} />
              <Text style={styles.gaugeLabel}>FUEL LEVEL</Text>
            </View>
          </View>

          {/* Fuel Truck Delivery */}
          <Animated.View style={[
            styles.truckContainer,
            {
              transform: [{
                translateX: truckAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, width + 100]
                })
              }]
            }
          ]}>
            <View style={styles.truck}>
              <View style={styles.truckCab}>
                <View style={styles.truckWindow} />
              </View>
              <View style={styles.truckTrailer}>
                <Text style={styles.truckText}>FUEL</Text>
                <View style={styles.truckLiquid} />
              </View>
              <View style={styles.truckWheels}>
                <View style={styles.truckWheel} />
                <View style={styles.truckWheel} />
                <View style={styles.truckWheel} />
                <View style={styles.truckWheel} />
              </View>
            </View>
          </Animated.View>

          {/* Vehicle Queue */}
          <View style={styles.queueContainer}>
            <Animated.View style={[
              styles.queueLine,
              {
                transform: [{
                  translateX: queueAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -100]
                  })
                }]
              }
            ]}>
              {[1, 2, 3, 4].map((pos) => (
                <View key={pos} style={styles.queueCar}>
                  <View style={styles.queueCarBody} />
                  <View style={styles.queueCarWheel} />
                  <View style={styles.queueCarWheel} />
                </View>
              ))}
            </Animated.View>
          </View>

        </View>

        {/* Brand Title */}
        <Animated.View style={[styles.brandContainer, { opacity: fadeAnim }]}>
          <Text style={styles.brandTitle}>MADEYA STATION</Text>
          <Text style={styles.brandSubtitle}>FUEL MANAGEMENT SYSTEM</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>
      </View>

      {/* --- BOTTOM SECTION --- */}
      <Animated.View style={[
        styles.bottomSection,
        { transform: [{ translateY: slideUpAnim }] }
      ]}>
        {/* Curved Top Edge */}
        <View style={styles.curveContainer}>
          <View style={styles.curve} />
          <View style={styles.curveShadow} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headlineContainer}>
            <Text style={styles.headline}>STATION</Text>
            <Text style={[styles.headline, styles.headlineAccent]}>
              MANAGEMENT DASHBOARD
            </Text>
          </View>

          {/* CTA Buttons */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('../Login/Login')}
              style={styles.primaryCTA}
            >
              <LinearGradient
                colors={[THEME.white, '#f8f9fa']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.ctaText}>MANAGE YOUR STATION</Text>
                <View style={styles.ctaIcon}>
                  <Ionicons name="arrow-forward-circle" size={28} color={THEME.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('../Account/account')}
              style={styles.secondaryCTA}
            >
              <Text style={styles.secondaryCTAText}>
                New Station? <Text style={styles.secondaryCTAAccent}>Register Here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.white,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.primaryLight,
  },
  topSection: {
    flex: 0.6,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  ring: {
    position: 'absolute',
    borderRadius: 500,
    borderWidth: 1,
    borderColor: 'rgba(30, 75, 137, 0.1)',
  },
  ring1: {
    top: -150,
    right: -100,
    width: 300,
    height: 300,
  },
  ring2: {
    top: -80,
    left: -120,
    width: 400,
    height: 400,
    borderColor: 'rgba(30, 75, 137, 0.07)',
  },
  ring3: {
    top: 100,
    right: -150,
    width: 250,
    height: 250,
    borderColor: 'rgba(30, 75, 137, 0.05)',
  },
  animationArea: {
    height: 250,
    marginTop: 40,
    position: 'relative',
    paddingHorizontal: 20,
  },
  stationBuilding: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  stationRoof: {
    width: 100,
    height: 20,
    backgroundColor: THEME.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationSign: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stationBody: {
    width: 100,
    height: 60,
    backgroundColor: THEME.primaryLight,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    flexDirection: 'row',
    padding: 8,
    justifyContent: 'space-between',
  },
  stationWindows: {
    gap: 5,
  },
  stationWindow: {
    width: 20,
    height: 20,
    backgroundColor: THEME.accent,
    borderRadius: 3,
    opacity: 0.8,
  },
  stationDoor: {
    width: 25,
    height: 40,
    backgroundColor: THEME.primary,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  pumpsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    gap: 10,
  },
  pumpContainer: {
    alignItems: 'center',
  },
  pumpBody: {
    width: 60,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pumpGradient: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  pumpDisplay: {
    alignItems: 'center',
  },
  pumpText: {
    color: THEME.white,
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pumpPrice: {
    color: THEME.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  pumpNozzle: {
    position: 'absolute',
    right: -15,
    top: 40,
    alignItems: 'flex-end',
  },
  nozzleHandle: {
    width: 20,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  nozzleHose: {
    width: 15,
    height: 4,
    backgroundColor: '#666',
    marginTop: 2,
  },
  fuelLevel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: THEME.stationGreen,
    opacity: 0.7,
  },
  pumpBase: {
    width: 40,
    height: 5,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  gaugeContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  gauge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.white,
    borderWidth: 3,
    borderColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  gaugeNeedle: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: THEME.primary,
    top: 10,
    transformOrigin: 'center bottom',
  },
  gaugeCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.primary,
  },
  gaugeLabel: {
    position: 'absolute',
    bottom: -15,
    fontSize: 7,
    color: THEME.primary,
    fontWeight: 'bold',
  },
  truckContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
  },
  truck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  truckCab: {
    width: 40,
    height: 25,
    backgroundColor: THEME.primary,
    borderRadius: 5,
    justifyContent: 'center',
    paddingLeft: 5,
  },
  truckWindow: {
    width: 15,
    height: 12,
    backgroundColor: '#87CEEB',
    borderRadius: 2,
  },
  truckTrailer: {
    width: 60,
    height: 30,
    backgroundColor: THEME.primaryLight,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  truckText: {
    color: THEME.white,
    fontSize: 8,
    fontWeight: 'bold',
    zIndex: 2,
  },
  truckLiquid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.stationGreen,
    opacity: 0.6,
  },
  truckWheels: {
    position: 'absolute',
    bottom: -8,
    flexDirection: 'row',
    gap: 15,
    left: 5,
  },
  truckWheel: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  queueContainer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    height: 30,
    overflow: 'hidden',
  },
  queueLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25,
  },
  queueCar: {
    position: 'relative',
  },
  queueCarBody: {
    width: 25,
    height: 15,
    backgroundColor: THEME.primaryLight,
    borderRadius: 4,
  },
  queueCarWheel: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
    bottom: -3,
  },
  queueCarWheel: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
    bottom: -3,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.primary,
    letterSpacing: -1,
    textShadowColor: 'rgba(30, 75, 137, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: THEME.primaryLight,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: -5,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: THEME.accent,
    marginTop: 5,
    borderRadius: 1.5,
  },
  bottomSection: {
    flex: 0.4,
    backgroundColor: THEME.primary,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  curveContainer: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    height: 60,
    overflow: 'hidden',
  },
  curve: {
    width: width * 1.5,
    height: 120,
    backgroundColor: THEME.primary,
    borderRadius: width,
    alignSelf: 'center',
    top: 0,
  },
  curveShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    top: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headlineContainer: {
    marginBottom: 20,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.white,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  headlineAccent: {
    color: THEME.accent,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: '45%',
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  featureText: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  ctaContainer: {
    gap: 15,
  },
  primaryCTA: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  ctaGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 18,
  },
  ctaText: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 75, 137, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryCTA: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryCTAText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryCTAAccent: {
    color: THEME.white,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});