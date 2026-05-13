/**
 * App.tsx — Root component with simple screen navigation.
 *
 * Uses a minimal stack-based navigation without react-navigation dependency.
 * Screens: Home, ImportProfile, SplitTunneling, Diagnostics.
 */
import React, {useState, useCallback} from 'react';
import {StatusBar} from 'react-native';
import {HomeScreen} from './src/screens/HomeScreen';
import {ImportProfileScreen} from './src/screens/ImportProfileScreen';
import {SplitTunnelingScreen} from './src/screens/SplitTunnelingScreen';
import {DiagnosticsScreen} from './src/screens/DiagnosticsScreen';

type ScreenName = 'Home' | 'ImportProfile' | 'SplitTunneling' | 'Diagnostics';

export default function App(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Home');

  const navigate = useCallback((screen: string) => {
    setCurrentScreen(screen as ScreenName);
  }, []);

  const goHome = useCallback(() => {
    setCurrentScreen('Home');
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F0F1A"
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
    </>
  );
}
