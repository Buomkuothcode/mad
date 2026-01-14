import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Appearance,
  DeviceEventEmitter,
  Dimensions,
  Image,
  LayoutAnimation,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View
} from 'react-native';
import app_architecture from '../utils/appInfo';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

// --- 🎨 NEW PALETTE ---
const THEME = {
  light: {
    bg: '#F3F4F6',
    barBg: '#FFFFFF',
    text: '#1E293B',
    activeText: '#FFFFFF',
    inactiveIcon: '#94A3B8',
    shadow: '#E2E8F0',
  },
  dark: {
    bg: '#0F172A',
    barBg: '#1E293B',
    text: '#F8FAFC',
    activeText: '#FFFFFF',
    inactiveIcon: '#1e4b89',
    shadow: '#020617',
  }
};

const COLORS = {
  primary: '#1e4b89',
  accent: '#1e4b89',
};

// --- ⚙️ LOGIC HELPER ---
export const setAppTheme = async (newTheme) => {
  try {
    await AsyncStorage.setItem('theme', newTheme);
    DeviceEventEmitter.emit('THEME_CHANGED', newTheme);
  } catch (error) {
    console.error('Failed to set theme', error);
  }
};

// --- 🧴 ELASTIC TAB ICON COMPONENT ---
const ElasticTab = ({ name, label, focused, theme }) => {
  const isDark = false;
  const t = isDark ? THEME.dark : THEME.light;

  useEffect(() => {
    // Trigger smooth layout change when 'focused' changes
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [focused]);

  return (
    <View style={[
      styles.tabBase,
      focused ? styles.tabActive : styles.tabInactive,
      { backgroundColor: focused ? COLORS.primary : 'transparent' }
    ]}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={22}
        color={focused ? t.activeText : t.inactiveIcon}
      />

      {focused && (
        <Text numberOfLines={1} style={[styles.tabLabel, { color: t.activeText }]}>
          {label}
        </Text>
      )}
    </View>
  );
};

// --- 💎 CUSTOM HEADER COMPONENT ---
const ModernHeader = ({ title, theme }) => {
  const isDark = false;
  const t = isDark ? THEME.dark : THEME.light;

  return (
    <View style={[styles.headerContainer, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
      <View style={styles.headerRow}>
        <View>
        
          <Text style={[styles.headerTitle, { color: t.text }]}>{title}</Text>
        </View>
        <View style={styles.logoWrapper}>
          {/*  */}
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.headerAvatar}
          />
        </View>
      </View>
    </View>
  );
};

const AppLayout = () => {
  const [theme, setTheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem('theme');
      if (saved) setTheme(saved);
    };
    loadTheme();

    const systemSub = Appearance.addChangeListener(({ colorScheme }) => setTheme(colorScheme));
    const manualSub = DeviceEventEmitter.addListener('THEME_CHANGED', (newTheme) => setTheme(newTheme));

    return () => {
      systemSub.remove();
      manualSub.remove();
    };
  }, []);

  const isDark = false;
  const t = isDark ? THEME.dark : THEME.light;

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Tabs
        key={theme}
        screenOptions={{
          headerShown: true,
          header: ({ options }) => <ModernHeader title={options.title || options.headerTitle} theme={theme} />,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,

          // The Container of the Tabs
          tabBarStyle: {
            position: 'absolute',
            bottom: 25,
            left: 20,
            right: 20,
            height: 72,
            borderRadius: 36,
            backgroundColor: t.barBg,
            borderTopWidth: 0,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: isDark ? 0.3 : 0.15,
            shadowRadius: 20,
            elevation: 10,
            paddingHorizontal: 10,
            paddingBottom: 0, // Fix alignment
            justifyContent: 'center'
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: app_architecture.app_name || "Dashboard",
            tabBarIcon: ({ focused }) => (
              <ElasticTab name="grid" label="Home" focused={focused} theme={theme} />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        <Tabs.Screen
          name="history"
          options={{
            headerTitle: "History",
            tabBarIcon: ({ focused }) => (
              <ElasticTab name="list" label="History" focused={focused} theme={theme} />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />

        <Tabs.Screen
          name="account"
          options={{
            headerTitle: "My Profile",
            tabBarIcon: ({ focused }) => (
              <ElasticTab name="person" label="Profile" focused={focused} theme={theme} />
            ),
          }}
          listeners={{ tabPress: () => Haptics.selectionAsync() }}
        />
      </Tabs>
    </>
  );
};

const styles = StyleSheet.create({
  // --- Elastic Tab Styles ---
  tabBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    
    paddingVertical: 12,
    borderRadius: 25,
    height: 50,
  },
  tabInactive: {
    width: 50, // Circle when inactive
    backgroundColor: 'transparent',
  },
  tabActive: {
    paddingHorizontal: 20, // Pill when active
    minWidth: 120, // Force width expansion
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },

  // --- Header Styles ---
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 0,
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    opacity: 0.8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)'
  },
});

export default AppLayout;