import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface SpeedTestModalProps {
  visible: boolean;
  onClose: () => void;
}

type TestPhase = 'idle' | 'pinging' | 'downloading' | 'done' | 'error';

export const SpeedTestModal: React.FC<SpeedTestModalProps> = ({visible, onClose}) => {
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [ping, setPing] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const [label, setLabel] = useState('Нажмите для старта');

  // Rotation for the neon ring
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startSpin = useCallback(() => {
    loopRef.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loopRef.current.start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.12, duration: 500, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 0.92, duration: 500, useNativeDriver: true}),
      ]),
    ).start();
  }, [rotateAnim, pulseAnim]);

  const stopSpin = useCallback(
    (finalProgress: number) => {
      loopRef.current?.stop();
      Animated.timing(rotateAnim, {toValue: 0, duration: 300, useNativeDriver: true}).start();
      Animated.spring(pulseAnim, {toValue: 1, useNativeDriver: true}).start();
      Animated.timing(progressAnim, {
        toValue: finalProgress,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [rotateAnim, pulseAnim, progressAnim],
  );

  const runTest = useCallback(async () => {
    setPhase('pinging');
    setLabel('Измерение пинга…');
    setPing(null);
    setSpeed(null);
    progressAnim.setValue(0);
    startSpin();

    try {
      // Ping
      const t0 = Date.now();
      await fetch('https://www.google.com', {method: 'HEAD', cache: 'no-store'});
      const measuredPing = Date.now() - t0;
      setPing(measuredPing);

      // Download 10MB for a somewhat realistic test without destroying data plan
      setPhase('downloading');
      setLabel('Измерение скорости…');
      const dlT0 = Date.now();
      const dlRes = await fetch('https://speed.cloudflare.com/__down?bytes=10485760', {
        cache: 'no-store',
      });
      const blob = await dlRes.blob();
      const dlMs = Date.now() - dlT0;
      const mbps = (blob.size * 8) / 1_000_000 / (dlMs / 1000);
      const finalSpeed = parseFloat(mbps.toFixed(1));
      setSpeed(finalSpeed);

      const finalProgress = Math.min(mbps / 100, 1);
      stopSpin(finalProgress);
      setPhase('done');
      setLabel('Тест завершён');
    } catch {
      stopSpin(0);
      setPhase('error');
      setLabel('Ошибка соединения');
    }
  }, [startSpin, stopSpin, progressAnim]);

  useEffect(() => {
    if (!visible) {
      loopRef.current?.stop();
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
      progressAnim.setValue(0);
      setPhase('idle');
      setLabel('Нажмите для старта');
      setPing(null);
      setSpeed(null);
    }
  }, [visible, rotateAnim, pulseAnim, progressAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isRunning = phase === 'pinging' || phase === 'downloading';
  const arcColor = phase === 'error' ? '#FF1744' : phase === 'done' ? '#00E676' : '#00E5FF';
  const pingColor = ping !== null && ping < 100 ? '#00E676' : '#FFAB00';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#00E5FF" />
              <Text style={styles.title}> SPEED TEST</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Main gauge — animated neon ring */}
          <TouchableOpacity
            style={styles.gaugeWrap}
            activeOpacity={0.8}
            onPress={() => !isRunning && runTest()}>
            {/* Outer spinning ring (visible only while running) */}
            {isRunning && (
              <Animated.View
                style={[
                  styles.spinRing,
                  {borderTopColor: arcColor, transform: [{rotate: spin}]},
                ]}
              />
            )}

            {/* Static background ring */}
            <View style={[styles.staticRing, {borderColor: 'rgba(255,255,255,0.08)'}]} />

            {/* Connected glow ring */}
            <Animated.View
              style={[
                styles.glowRing,
                {
                  borderColor: arcColor,
                  transform: [{scale: pulseAnim}],
                  opacity: isRunning || phase === 'done' ? 0.7 : 0.3,
                },
              ]}
            />

            {/* Center */}
            <View style={styles.gaugeCenter}>
              {phase === 'idle' && (
                <>
                  <MaterialCommunityIcons name="speedometer" size={40} color="#00E5FF" />
                  <Text style={styles.startHint}>СТАРТ</Text>
                </>
              )}
              {isRunning && (
                <>
                  <MaterialCommunityIcons 
                    name={phase === 'pinging' ? 'satellite-uplink' : 'download'} 
                    size={36} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.measureLabel}>{label}</Text>
                </>
              )}
              {phase === 'done' && speed !== null && (
                <>
                  <Text style={[styles.speedValue, {color: arcColor}]}>{speed}</Text>
                  <Text style={styles.speedUnit}>Mbps</Text>
                </>
              )}
              {phase === 'error' && (
                <>
                  <MaterialCommunityIcons name="wifi-off" size={40} color="#FF1744" />
                  <Text style={[styles.measureLabel, {color: '#FF1744'}]}>Ошибка</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, {width: progressWidth, backgroundColor: arcColor}]}
            />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="satellite-uplink" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={styles.statLabel}>ПИНГ</Text>
              <Text style={[styles.statValue, {color: pingColor}]}>
                {ping !== null ? `${ping} мс` : '—'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="download" size={20} color="rgba(255,255,255,0.6)" />
              <Text style={styles.statLabel}>СКАЧИВАНИЕ</Text>
              <Text style={[styles.statValue, {color: '#00E5FF'}]}>
                {speed !== null ? `${speed} Mbps` : '—'}
              </Text>
            </View>
          </View>

          {/* Retry */}
          {(phase === 'done' || phase === 'error') && (
            <TouchableOpacity style={styles.retryBtn} onPress={runTest} activeOpacity={0.8}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons name="refresh" size={18} color="#00E5FF" />
                <Text style={styles.retryText}> ПОВТОРИТЬ</Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={styles.footerNote}>{label}</Text>
        </View>
      </View>
    </Modal>
  );
};

const RING_SIZE = 180;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D0E12',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,229,255,0.25)',
    paddingBottom: Platform.OS === 'android' ? 30 : 40,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontFamily: 'Play-Bold',
    fontSize: 20,
    color: '#00E5FF',
    letterSpacing: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {color: '#FFFFFF', fontSize: 22, lineHeight: 26},
  gaugeWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  spinRing: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 4,
    borderColor: 'transparent',
    borderTopWidth: 4,
  },
  staticRing: {
    position: 'absolute',
    width: RING_SIZE - 8,
    height: RING_SIZE - 8,
    borderRadius: (RING_SIZE - 8) / 2,
    borderWidth: 8,
  },
  glowRing: {
    position: 'absolute',
    width: RING_SIZE - 20,
    height: RING_SIZE - 20,
    borderRadius: (RING_SIZE - 20) / 2,
    borderWidth: 3,
  },
  gaugeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  startHint: {
    fontFamily: 'Play-Bold',
    fontSize: 11,
    color: '#00E5FF',
    letterSpacing: 3,
    marginTop: 6,
  },
  phaseEmoji: {fontSize: 36},
  measureLabel: {
    fontFamily: 'Play-Regular',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  speedValue: {
    fontFamily: 'Play-Bold',
    fontSize: 36,
    lineHeight: 40,
  },
  speedUnit: {
    fontFamily: 'Play-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 16,
    marginBottom: 20,
  },
  statCard: {flex: 1, alignItems: 'center', gap: 4},
  statDivider: {width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 6},
  statEmoji: {fontSize: 18},
  statLabel: {
    fontFamily: 'Play-Bold',
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
  },
  statValue: {fontFamily: 'Play-Bold', fontSize: 16},
  retryBtn: {
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.35)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  retryText: {
    fontFamily: 'Play-Bold',
    fontSize: 13,
    color: '#00E5FF',
    letterSpacing: 2,
  },
  footerNote: {
    fontFamily: 'Play-Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
