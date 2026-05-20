import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, View, Text, Animated, Easing} from 'react-native';
import type {VpnStatus} from '../types/vpn';
import type {AppTheme} from '../theme/theme';
import {getTrafficStats} from '../native/NativeVpn';
import {
  buildTrafficBars,
  calculateTrafficRates,
  formatMbps,
  type NativeTrafficStatsSnapshot,
  type TrafficRates,
} from '../services/trafficStatsService';

interface TrafficGraphProps {
  status: VpnStatus;
  theme: AppTheme;
}

export const TrafficGraph: React.FC<TrafficGraphProps> = ({status, theme}) => {
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const [rates, setRates] = useState<TrafficRates>({
    downloadMbps: 0,
    uploadMbps: 0,
  });

  // Animated values for 15 equalizer bars
  const barHeights = useRef(
    Array.from({length: 15}).map(() => new Animated.Value(2)),
  ).current;

  // Timers and loops
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeAnims = useRef<Animated.CompositeAnimation[]>([]);
  const previousStats = useRef<NativeTrafficStatsSnapshot | null>(null);

  const stopAnimations = useCallback(() => {
    activeAnims.current.forEach(a => a.stop());
    activeAnims.current = [];
  }, []);

  const animateBars = useCallback((values: number[], duration = 280) => {
    stopAnimations();
    const animations = barHeights.map((bh, idx) =>
      Animated.timing(bh, {
        toValue: values[idx] ?? 3,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    );
    activeAnims.current = animations;
    Animated.parallel(animations).start(() => {
      activeAnims.current = [];
    });
  }, [barHeights, stopAnimations]);

  useEffect(() => {
    const clearPoll = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (isConnected) {
      clearPoll();

      const pollTraffic = async () => {
        try {
          const nextStats = await getTrafficStats();
          if (previousStats.current) {
            const nextRates = calculateTrafficRates(
              previousStats.current,
              nextStats,
            );
            setRates(nextRates);
            animateBars(buildTrafficBars(nextRates));
          }
          previousStats.current = nextStats;
        } catch {
          const zeroRates = {downloadMbps: 0, uploadMbps: 0};
          setRates(zeroRates);
          animateBars(buildTrafficBars(zeroRates));
        }
      };

      pollTraffic();
      intervalRef.current = setInterval(pollTraffic, 1000);
    } else if (isConnecting) {
      clearPoll();
      previousStats.current = null;
      setRates({downloadMbps: 0, uploadMbps: 0});

      const animations = barHeights.map((bh) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(bh, {
              toValue: 12,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            Animated.timing(bh, {
              toValue: 3,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        );
      });

      activeAnims.current = animations;
      animations.forEach(a => a.start());
    } else {
      clearPoll();
      previousStats.current = null;
      setRates({downloadMbps: 0, uploadMbps: 0});

      stopAnimations();

      barHeights.forEach((bh) => {
        Animated.timing(bh, {
          toValue: 3,
          duration: 350,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      clearPoll();
      stopAnimations();
    };
  }, [isConnected, isConnecting, barHeights, animateBars, stopAnimations]);

  const downloadSpeed = isConnecting ? '---' : formatMbps(rates.downloadMbps);
  const uploadSpeed = isConnecting ? '---' : formatMbps(rates.uploadMbps);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.isDark ? 'rgba(13, 14, 18, 0.6)' : '#FFFFFF',
          borderColor: theme.colors.separator,
        },
      ]}>
      {/* Download Speed */}
      <View style={styles.speedBlock}>
        <View style={[styles.arrowCircle, {backgroundColor: theme.colors.primarySoft}]}>
          <Text style={[styles.arrowText, {color: theme.colors.primary}]}>↓</Text>
        </View>
        <Text style={[styles.speedValue, {color: theme.colors.text}]}>
          {downloadSpeed}
        </Text>
        <Text style={[styles.speedLabel, {color: theme.colors.secondaryText}]}>
          Mbps DL
        </Text>
      </View>

      {/* Center Equalizer Bars */}
      <View style={styles.equalizer}>
        {barHeights.map((bh, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.bar,
              {
                height: bh,
                backgroundColor: isConnected
                  ? theme.colors.secondary
                  : isConnecting
                  ? theme.colors.primary
                  : theme.colors.tertiaryText,
                shadowColor: isConnected
                  ? theme.colors.secondary
                  : theme.colors.primary,
              },
              isConnected && styles.glow,
            ]}
          />
        ))}
      </View>

      {/* Upload Speed */}
      <View style={styles.speedBlock}>
        <View style={[styles.arrowCircle, {backgroundColor: theme.colors.secondarySoft}]}>
          <Text style={[styles.arrowText, {color: theme.colors.secondary}]}>↑</Text>
        </View>
        <Text style={[styles.speedValue, {color: theme.colors.text}]}>
          {uploadSpeed}
        </Text>
        <Text style={[styles.speedLabel, {color: theme.colors.secondaryText}]}>
          Mbps UL
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    width: '90%',
    alignSelf: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  speedBlock: {
    alignItems: 'center',
    width: '28%',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  arrowText: {
    fontSize: 14,
    fontWeight: '800',
  },
  speedValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  speedLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  equalizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 52,
    width: '40%',
    gap: 3,
  },
  bar: {
    width: 4.2,
    borderRadius: 2.1,
  },
  glow: {
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
});
