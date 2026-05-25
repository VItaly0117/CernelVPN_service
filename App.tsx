/**
 * App.tsx — Root component with simple screen navigation.
 *
 * Uses a minimal stack-based navigation without react-navigation dependency.
 * Screens: Home, ImportProfile, SplitTunneling, Diagnostics, Panel.
 */
import React, {useState, useCallback, useEffect, useRef} from 'react';
import {Alert, BackHandler, StatusBar, View, Animated, ScrollView, Dimensions, AppState} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {HomeScreen} from './src/screens/HomeScreen';
import {ImportProfileScreen} from './src/screens/ImportProfileScreen';
import {SplitTunnelingScreen} from './src/screens/SplitTunnelingScreen';
import {DiagnosticsScreen} from './src/screens/DiagnosticsScreen';
import {PanelScreen} from './src/screens/PanelScreen';
import {ServerListScreen} from './src/screens/ServerListScreen';
import {EventLogScreen} from './src/screens/EventLogScreen';
import {QRScannerScreen} from './src/screens/QRScannerScreen';
import {OnboardingScreen} from './src/screens/OnboardingScreen';
import {parseProfileLink} from './src/services/profileParser';
import {SettingsScreen} from './src/screens/SettingsScreen';
import {useVpnStore} from './src/store/vpnStore';
import {useResolvedTheme} from './src/theme/theme';
import {
  hydrateVpnStore,
  startPersistingVpnStore,
} from './src/services/persistenceService';
import {
  resolveBackNavigation,
  type AppScreenName,
} from './src/services/navigationService';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {BottomTabBar} from './src/components/BottomTabBar';
import {CustomAlertModal} from './src/components/CustomAlertModal';
import {alertService} from './src/services/alertService';

import {appLogger} from './src/services/appLogger';
import './src/locales/i18n'; // Initialize i18n

// Register global uncaught exception handlers
const globalAny: any = global;
if (globalAny.ErrorUtils) {
  const globalHandler = globalAny.ErrorUtils.getGlobalHandler();
  globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: any) => {
    appLogger.error('frontend', `Global Uncaught Exception (Fatal: ${isFatal}): ${error?.message || error}`, {
      raw: error instanceof Error ? error.stack : String(error),
    });
    if (globalHandler) {
      globalHandler(error, isFatal);
    }
  });
}

// Register global unhandled promise rejection tracking
if (globalAny.Promise && (globalAny.Promise as any).onUnhandled) {
  (globalAny.Promise as any).onUnhandled = (id: any, rejection: any) => {
    appLogger.error('frontend', `Unhandled Promise Rejection: ${rejection?.message || rejection}`, {
      raw: rejection instanceof Error ? rejection.stack : String(rejection),
    });
  };
}

// Override native Alert.alert with our custom glassmorphic version
(Alert as any).alert = (
  title: string,
  message?: string,
  buttons?: Array<{text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void}>,
) => {
  alertService.show(
    title,
    message,
    buttons?.map(b => ({text: b.text ?? 'OK', style: b.style, onPress: b.onPress})),
  );
};

const {width} = Dimensions.get('window');

function ScreenWrapper({children}: {children: React.ReactNode}): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}>
      {children}
    </Animated.View>
  );
}

export default function App(): React.JSX.Element {
  const [navStack, setNavStack] = useState<AppScreenName[]>(['Home']);
  const currentScreen = navStack[navStack.length - 1];
  const [isHydrated, setIsHydrated] = useState(false);
  const {themeMode, hasCompletedOnboarding} = useVpnStore();
  const theme = useResolvedTheme(themeMode);

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const mainScreens = ['Home', 'SplitTunneling', 'Settings'];
  const isMainScreen = mainScreens.includes(currentScreen);

  useEffect(() => {
    if (!isHydrated) return;
    if (currentScreen === 'Home') {
      scrollViewRef.current?.scrollTo({x: 0, animated: true});
    } else if (currentScreen === 'SplitTunneling') {
      scrollViewRef.current?.scrollTo({x: width, animated: true});
    } else if (currentScreen === 'Settings') {
      scrollViewRef.current?.scrollTo({x: width * 2, animated: true});
    }
  }, [currentScreen, isHydrated]);

  const handleScroll = useCallback((event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / width);
    const screens: AppScreenName[] = ['Home', 'SplitTunneling', 'Settings'];
    const nextScreen = screens[index];
    if (nextScreen && nextScreen !== currentScreen) {
      setNavStack([nextScreen]);
    }
  }, [currentScreen]);

  useEffect(() => {
    let cancelled = false;
    let stopPersisting: (() => void) | null = null;

    hydrateVpnStore()
      .then(() => {
        setIsHydrated(true);
      })
      .catch(error => {
        console.warn('[App] Failed to hydrate persisted state', error);
        setIsHydrated(true); // Still show app on error
      })
      .finally(() => {
        if (!cancelled) {
          stopPersisting = startPersistingVpnStore();
        }
      });

    return () => {
      cancelled = true;
      stopPersisting?.();
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (navStack.length > 1) {
          setNavStack(prev => prev.slice(0, -1));
          return true;
        }
        if (currentScreen !== 'Home') {
          setNavStack(['Home']);
          return true;
        }
        return false;
      },
    );

    return () => subscription.remove();
  }, [navStack, currentScreen]);

  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback(
    (screen: string) => {
      if (navTimeoutRef.current) return;
      
      const nextScreen = screen as AppScreenName;
      setNavStack(prev => {
        if (['Home', 'SplitTunneling', 'Settings'].includes(nextScreen)) {
          return [nextScreen];
        }
        return [...prev, nextScreen];
      });
      
      navTimeoutRef.current = setTimeout(() => {
        navTimeoutRef.current = null;
      }, 300); // 300ms debounce
    },
    [],
  );

  const goBack = useCallback(() => {
    setNavStack(prev => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      return ['Home'];
    });
  }, []);

  const handleImportProfile = useCallback((link: string) => {
    const result = parseProfileLink(link);
    if (result.success && result.profile) {
      addProfile(result.profile);
      Alert.alert('Success', `Imported profile: ${result.profile.name}`);
    } else {
      Alert.alert('Error', result.error || 'Failed to parse profile');
    }
  }, [addProfile]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        const text = await Clipboard.getString();
        if (text && (text.startsWith('vless://') || text.startsWith('vmess://') || text.startsWith('trojan://') || text.startsWith('ss://'))) {
          // Verify we haven't already prompted or added this
          const existing = profiles.find(p => p.rawLink === text);
          if (!existing) {
            Alert.alert(
              'Profile Found in Clipboard',
              'Would you like to import it?',
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Import',
                  onPress: () => {
                    handleImportProfile(text);
                    Clipboard.setString(''); // clear to avoid re-prompting
                  }
                }
              ]
            );
          }
        }
      }
    };
    
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [profiles, handleImportProfile]);

  const onBackPress = useCallback(() => {
    if (navStack.length > 1) {
      goBack();
      return true;
    }
    if (currentScreen !== 'Home') {
      setNavStack(['Home']);
      return true;
    }
    return false;
  }, [navStack, currentScreen, goBack]);

  if (!isHydrated) {
    return (
      <View style={{flex: 1, backgroundColor: theme.colors.background}} />
    );
  }



  return (
    <ErrorBoundary>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      {currentScreen === 'ImportProfile' && (
        <ScreenWrapper key="ImportProfile">
          <ImportProfileScreen onBack={goBack} />
        </ScreenWrapper>
      )}
      {currentScreen === 'Diagnostics' && (
        <ScreenWrapper key="Diagnostics">
          <DiagnosticsScreen onBack={goBack} />
        </ScreenWrapper>
      )}
      {currentScreen === 'Panel' && (
        <ScreenWrapper key="Panel">
          <PanelScreen onBack={goBack} />
        </ScreenWrapper>
      )}
      {currentScreen === 'Servers' && (
        <ScreenWrapper key="Servers">
          <ServerListScreen onBack={goBack} onNavigate={navigate} />
        </ScreenWrapper>
      )}
      {currentScreen === 'EventLog' && (
        <ScreenWrapper key="EventLog">
          <EventLogScreen onBack={goBack} />
        </ScreenWrapper>
      )}
      {currentScreen === 'QRScanner' && (
        <ScreenWrapper key="QRScanner">
          <QRScannerScreen 
            onBack={goBack} 
            onCodeScanned={(code) => {
              goBack();
              setTimeout(() => {
                handleImportProfile(code);
              }, 500);
            }} 
          />
        </ScreenWrapper>
      )}

      {isMainScreen && (
        <View style={{flex: 1, backgroundColor: theme.colors.background}}>
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{nativeEvent: {contentOffset: {x: scrollX}}}],
              {useNativeDriver: true}
            )}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={{flex: 1}}>
            <View style={{width, height: '100%'}}>
              <HomeScreen onNavigate={navigate} />
            </View>
            <View style={{width, height: '100%'}}>
              <SplitTunnelingScreen onBack={goBack} />
            </View>
            <View style={{width, height: '100%'}}>
              <SettingsScreen onNavigate={navigate} />
            </View>
          </Animated.ScrollView>
          <BottomTabBar
            currentScreen={currentScreen}
            onNavigate={navigate}
            theme={theme}
            scrollX={scrollX}
          />
        </View>
      )}
      <CustomAlertModal isDark={theme.isDark} />
    </ErrorBoundary>
  );
}

