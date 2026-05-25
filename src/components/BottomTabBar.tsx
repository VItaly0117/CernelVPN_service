import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  Animated,
  Dimensions,
} from 'react-native';
import type {AppTheme} from '../theme/theme';
import type {AppScreenName} from '../services/navigationService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface BottomTabBarProps {
  currentScreen: AppScreenName;
  onNavigate: (screen: AppScreenName) => void;
  theme: AppTheme;
  scrollX?: Animated.Value;
}

export function BottomTabBar({currentScreen, onNavigate, theme, scrollX}: BottomTabBarProps) {
  // We determine which tab is active. Settings maps to 'Settings', Security to 'SplitTunneling'
  const isHome = currentScreen === 'Home' || currentScreen === 'Servers' || currentScreen === 'ImportProfile';
  const isSecurity = currentScreen === 'SplitTunneling' || currentScreen === 'Diagnostics';
  const isSettings = currentScreen === 'Settings' || currentScreen === 'Panel';

  const bottomPadding = Platform.OS === 'ios' ? 24 : 12;

  // Dynamic horizontal slider calculation
  const {width} = Dimensions.get('window');
  // Active tabBarWidth = width - 40 (container paddings) - 32 (tabBar horizontal paddings)
  const tabWidth = (width - 72) / 3;

  const translateX = scrollX
    ? scrollX.interpolate({
        inputRange: [0, width * 2],
        outputRange: [0, tabWidth * 2],
        extrapolate: 'clamp',
      })
    : 0;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.isDark
              ? 'rgba(25, 26, 35, 0.7)'
              : 'rgba(255, 255, 255, 0.95)',
            borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            paddingBottom: bottomPadding,
          },
        ]}>
        
        {/* Sliding Neon Glowing Indicator */}
        {scrollX && (
          <Animated.View
            style={[
              styles.glowingSlider,
              {
                width: 24,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: theme.colors.primary,
                position: 'absolute',
                bottom: Platform.OS === 'ios' ? 10 : 4,
                left: 16 + tabWidth / 2 - 12,
                transform: [{ translateX }],
                shadowColor: theme.isDark ? theme.colors.primary : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: theme.isDark ? 1 : 0,
                shadowRadius: 6,
                elevation: theme.isDark ? 4 : 0,
              }
            ]}
          />
        )}

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('Home')}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name={isHome ? 'home-variant' : 'home-variant-outline'}
            size={26}
            color={isHome ? theme.colors.primary : theme.colors.secondaryText}
          />
          <Text style={[
            styles.tabLabel, 
            { 
              color: isHome ? theme.colors.primary : theme.colors.secondaryText,
              fontFamily: theme.fonts.medium,
            }
          ]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('SplitTunneling')}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name={isSecurity ? 'shield-lock' : 'shield-lock-outline'}
            size={26}
            color={isSecurity ? theme.colors.primary : theme.colors.secondaryText}
          />
          <Text style={[
            styles.tabLabel, 
            { 
              color: isSecurity ? theme.colors.primary : theme.colors.secondaryText,
              fontFamily: theme.fonts.medium,
            }
          ]}>
            Security
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onNavigate('Settings')}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name={isSettings ? 'cog' : 'cog-outline'}
            size={26}
            color={isSettings ? theme.colors.primary : theme.colors.secondaryText}
          />
          <Text style={[
            styles.tabLabel, 
            { 
              color: isSettings ? theme.colors.primary : theme.colors.secondaryText,
              fontFamily: theme.fonts.medium,
            }
          ]}>
            Settings
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 16 : 0,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  glowingSlider: {},
});
