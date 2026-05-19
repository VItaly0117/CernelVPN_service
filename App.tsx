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

export default function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<AppScreenName>('Home');
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
        setCurrentScreen(result.nextScreen);
        return result.handled;
      },
    );

    return () => subscription.remove();
  }, [currentScreen]);

  const navigate = useCallback((screen: string) => {
    setCurrentScreen(screen as AppScreenName);
  }, []);

  const goHome = useCallback(() => {
    setCurrentScreen('Home');
  }, []);

  return (
    <>
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
    </>
  );
}
