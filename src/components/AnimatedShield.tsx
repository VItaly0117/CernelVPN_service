import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { VpnStatus } from '../types/vpn';

interface AnimatedShieldProps {
  status: VpnStatus;
}

export const AnimatedShield: React.FC<AnimatedShieldProps> = ({ status }) => {
  const pulseScale = useSharedValue(1);
  const ringRotation = useSharedValue(0);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || status === 'disconnecting';
  const isError = status === 'error';
  const isWarning = status === 'permission_required';

  const getThemeColor = () => {
    if (isConnected) return '#00E676';
    if (isConnecting) return '#8B5CF6';
    if (isError) return '#FF1744';
    if (isWarning) return '#FFAB00';
    return '#8B5CF6';
  };

  const getGlowColor = () => {
    if (isConnected) return 'rgba(0, 230, 118, 0.4)';
    if (isConnecting) return 'rgba(139, 92, 246, 0.25)';
    if (isError) return 'rgba(255, 23, 68, 0.25)';
    if (isWarning) return 'rgba(255, 171, 0, 0.25)';
    return 'rgba(139, 92, 246, 0.2)';
  };

  const color = getThemeColor();
  const glowColor = getGlowColor();

  useEffect(() => {
    // 1. Breathing pulse
    if (status === 'disconnected') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (isConnecting) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.28, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else if (isConnected) {
      // Stable strong green glow — no pulsing
      pulseScale.value = withTiming(1.15, { duration: 600 });
    } else {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }

    // 2. Outer ring rotation
    if (isConnecting) {
      ringRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      ringRotation.value = withTiming(0, { duration: 600 });
    }
  }, [status, isConnecting, isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => {
    const scale = status === 'disconnected' || isConnecting ? pulseScale.value : 1;
    return {
      transform: [
        { rotate: `${ringRotation.value}deg` },
        { scale },
      ],
    };
  });

  return (
    <View style={styles.container}>
      {/* Pulse Glow Layer */}
      <Animated.View
        style={[
          styles.glowRing,
          { borderColor: glowColor },
          pulseStyle,
        ]}
      />

      {/* Outer Rotating Shield Ring */}
      <Animated.View
        style={[
          styles.outerRing,
          { borderColor: color },
          ringStyle,
        ]}>
        <View style={[styles.ringNotch, { backgroundColor: color }]} />
        <View style={[styles.ringNotchBottom, { backgroundColor: color }]} />
      </Animated.View>

      {/* Main Shield Shape */}
      <View style={[styles.shieldOuter, { borderColor: color, shadowColor: color }]}>
        <View style={[styles.shieldCore, { backgroundColor: color }]}>
          <View style={styles.lockContainer}>
            <View
              style={[
                styles.lockShackle,
                {
                  borderColor: isConnected ? '#050507' : '#FFFFFF',
                  borderBottomWidth: 0,
                  height: 18,
                  width: 22,
                  marginTop: -6,
                },
                isConnected && styles.lockShackleSecure,
              ]}
            />
            <View
              style={[
                styles.lockBody,
                { backgroundColor: isConnected ? '#050507' : '#FFFFFF' },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
  },
  outerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  ringNotch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ringNotchBottom: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  shieldOuter: {
    width: 80,
    height: 90,
    borderWidth: 3.5,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F121B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  shieldCore: {
    width: 60,
    height: 70,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  lockShackle: {
    width: 16,
    height: 14,
    borderWidth: 2.5,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  lockShackleSecure: {
    transform: [{ translateY: 1.5 }],
  },
  lockBody: {
    width: 20,
    height: 14,
    borderRadius: 3,
    marginTop: -2,
    zIndex: 2,
  },
});
