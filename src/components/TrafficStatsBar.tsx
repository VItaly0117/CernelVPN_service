import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';
import {formatSpeed, formatBytes} from '../hooks/useTrafficStats';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface TrafficStatsBarProps {
  rxBytesPerSec: number;
  txBytesPerSec: number;
  totalRxBytes: number;
  totalTxBytes: number;
  active: boolean;
}

export const TrafficStatsBar: React.FC<TrafficStatsBarProps> = ({
  rxBytesPerSec,
  txBytesPerSec,
  totalRxBytes,
  totalTxBytes,
  active,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rxFlash = useRef(new Animated.Value(1)).current;
  const txFlash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: active ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [active, fadeAnim]);

  useEffect(() => {
    if (!active || rxBytesPerSec === 0) {return;}
    Animated.sequence([
      Animated.timing(rxFlash, {toValue: 1.4, duration: 80, useNativeDriver: true}),
      Animated.timing(rxFlash, {toValue: 1, duration: 160, useNativeDriver: true}),
    ]).start();
  }, [rxBytesPerSec]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active || txBytesPerSec === 0) {return;}
    Animated.sequence([
      Animated.timing(txFlash, {toValue: 1.4, duration: 80, useNativeDriver: true}),
      Animated.timing(txFlash, {toValue: 1, duration: 160, useNativeDriver: true}),
    ]).start();
  }, [txBytesPerSec]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      {/* Live speeds row */}
      <View style={styles.speedRow}>
        {/* Download */}
        <View style={styles.speedCard}>
          <View style={styles.speedLabelRow}>
            <Text style={[styles.arrow, {color: '#00E5FF'}]}>↓</Text>
            <Text style={styles.dirLabel}>DL</Text>
          </View>
          <Animated.Text
            style={[styles.speedValue, {color: '#00E5FF', transform: [{scale: rxFlash}]}]}>
            {formatSpeed(rxBytesPerSec)}
          </Animated.Text>
        </View>

        <View style={styles.divider} />

        {/* Upload */}
        <View style={styles.speedCard}>
          <View style={styles.speedLabelRow}>
            <Text style={[styles.arrow, {color: '#8B5CF6'}]}>↑</Text>
            <Text style={styles.dirLabel}>UL</Text>
          </View>
          <Animated.Text
            style={[styles.speedValue, {color: '#8B5CF6', transform: [{scale: txFlash}]}]}>
            {formatSpeed(txBytesPerSec)}
          </Animated.Text>
        </View>
      </View>

      {/* Session totals */}
      {(totalRxBytes > 0 || totalTxBytes > 0) && (
        <View style={styles.totalsRow}>
          <MaterialCommunityIcons name="chart-bar" size={12} color="rgba(255,255,255,0.4)" />
          <Text style={styles.totals}>
            {formatBytes(totalRxBytes)} ↓  /  {formatBytes(totalTxBytes)} ↑
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  speedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrow: {
    fontSize: 14,
    fontFamily: 'Play-Bold',
  },
  dirLabel: {
    fontSize: 8,
    fontFamily: 'Play-Bold',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
  },
  speedValue: {
    fontFamily: 'Play-Bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  totals: {
    fontFamily: 'Play-Regular',
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
});
