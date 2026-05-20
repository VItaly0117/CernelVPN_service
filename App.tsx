/**
 * App.tsx — Root component with simple screen navigation.
 *
 * Uses a minimal stack-based navigation without react-navigation dependency.
 * Screens: Home, ImportProfile, SplitTunneling, Diagnostics, Panel.
 */
import React, {useState, useCallback, useEffect} from 'react';
import {BackHandler, StatusBar} from 'react-native';
import {HomeScreen} from './src/screens/HomeScreen';
import {ImportProfileScreen} from './src/screens/ImportProfileScreen';
import {SplitTunnelingScreen} from './src/screens/SplitTunnelingScreen';
import {DiagnosticsScreen} from './src/screens/DiagnosticsScreen';
import {PanelScreen} from './src/screens/PanelScreen';
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
import {
  AppMotionOverlay,
  type AppMotionMode,
} from './src/components/AppMotionOverlay';
import {appLogger} from './src/services/appLogger';

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

export default function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<AppScreenName>('Home');
  const [motionMode, setMotionMode] = useState<AppMotionMode>('launch');
  const {themeMode} = useVpnStore();
  const theme = useResolvedTheme(themeMode);

  useEffect(() => {
    let cancelled = false;
    let stopPersisting: (() => void) | null = null;

    hydrateVpnStore()
      .catch(error => {
        console.warn('[App] Failed to hydrate persisted state', error);
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
        const result = resolveBackNavigation(currentScreen);
        if (result.nextScreen !== currentScreen) {
          setMotionMode('transition');
        }
        setCurrentScreen(result.nextScreen);
        return result.handled;
      },
    );

    return () => subscription.remove();
  }, [currentScreen]);

  const navigate = useCallback(
    (screen: string) => {
      const nextScreen = screen as AppScreenName;
      if (nextScreen !== currentScreen) {
        setMotionMode('transition');
      }
      setCurrentScreen(nextScreen);
    },
    [currentScreen],
  );

  const goHome = useCallback(() => {
    if (currentScreen !== 'Home') {
      setMotionMode('transition');
    }
    setCurrentScreen('Home');
  }, [currentScreen]);

  const dismissMotion = useCallback(() => {
    setMotionMode(null);
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      {currentScreen === 'Home' && <HomeScreen onNavigate={navigate} />}
      {currentScreen === 'ImportProfile' && (
        <ImportProfileScreen onBack={goHome} />
      )}
      {currentScreen === 'SplitTunneling' && (
        <SplitTunnelingScreen onBack={goHome} />
      )}
      {currentScreen === 'Diagnostics' && (
        <DiagnosticsScreen onBack={goHome} />
      )}
      {currentScreen === 'Panel' && <PanelScreen onBack={goHome} />}
      <AppMotionOverlay
        mode={motionMode}
        theme={theme}
        onDone={dismissMotion}
      />
    </ErrorBoundary>
  );
}
