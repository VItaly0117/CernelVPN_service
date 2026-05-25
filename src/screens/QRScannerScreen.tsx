import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar as NativeStatusBar,
} from 'react-native';
import {CameraScreen} from 'react-native-camera-kit';
import {useVpnStore} from '../store/vpnStore';
import {useResolvedTheme} from '../theme/theme';
import {androidHeaderTopPadding} from '../services/layoutService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const HEADER_TOP_PADDING = androidHeaderTopPadding(
  Platform.OS,
  NativeStatusBar.currentHeight,
  12,
);

export function QRScannerScreen({
  onBack,
  onCodeScanned,
}: {
  onBack: () => void;
  onCodeScanned: (code: string) => void;
}): React.JSX.Element {
  const state = useVpnStore();
  const theme = useResolvedTheme(state.themeMode);
  const [scanned, setScanned] = useState(false);
  
  // Permission handled by CameraScreen natively in many cases, but we can manage state if needed
  // Let's just use the built-in scanner
  const handleReadCode = (event: any) => {
    if (scanned) return;
    const val = event.nativeEvent.codeStringValue;
    if (val) {
      setScanned(true);
      onCodeScanned(val);
    }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, {color: theme.colors.primary}]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.text}]}>Scan QR</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.cameraWrapper}>
          <CameraScreen
            scanBarcode={true}
            onReadCode={handleReadCode}
            showFrame={true}
            laserColor={theme.colors.primary}
            frameColor="#00E5FF"
            colorForScannerFrame="black"
            hideControls={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
  },
  backButton: {width: 60},
  backText: {fontSize: 16, fontWeight: '700'},
  title: {fontSize: 20, fontWeight: '800'},
  content: {flex: 1},
  centerBox: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  message: {fontSize: 16, marginTop: 12, marginBottom: 24, textAlign: 'center'},
  btn: {paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12},
  btnText: {color: '#FFF', fontWeight: 'bold'},
  cameraWrapper: {flex: 1},
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#FFF',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
});
