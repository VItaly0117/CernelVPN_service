import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Easing } from 'react-native';
import type { VpnStatus } from '../types/vpn';

interface AnimatedShieldProps {
  status: VpnStatus;
}

export const AnimatedShield: React.FC<AnimatedShieldProps> = ({ status }) => {
  // Pulse animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Particle animations
  const particles = useRef(
    Array.from({ length: 8 }).map(() => ({
      y: new Animated.Value(0),
      x: Math.random() * 120 - 60, // random offset
      scale: Math.random() * 0.5 + 0.5,
      delay: Math.random() * 2000,
    }))
  ).current;

  // Status-based parameters
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting' || status === 'disconnecting';
  const isError = status === 'error';
  const isWarning = status === 'permission_required';

  // Get status color
  const getThemeColor = () => {
    if (isConnected) return '#D946EF'; // Electric Violet
    if (isConnecting) return '#8B5CF6'; // Midnight Indigo
    if (isError) return '#FF1744'; // Hot Pink / Red
    if (isWarning) return '#FFAB00'; // Warm Amber
    return '#5C6370'; // Deep Slate Grey
  };

  const getGlowColor = () => {
    if (isConnected) return 'rgba(217, 70, 239, 0.25)';
    if (isConnecting) return 'rgba(139, 92, 246, 0.25)';
    if (isError) return 'rgba(255, 23, 68, 0.25)';
    if (isWarning) return 'rgba(255, 171, 0, 0.25)';
    return 'rgba(92, 99, 112, 0.15)';
  };

  const color = getThemeColor();
  const glowColor = getGlowColor();

  // Handle continuous rotation and pulsing
  useEffect(() => {
    // Pulse animation loop
    let duration = 2000;
    if (isConnecting) duration = 1000;
    if (isConnected) duration = 1600;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Rotation loop
    const rotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: isConnecting ? 3000 : 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotation.start();

    return () => {
      pulse.stop();
      rotation.stop();
    };
  }, [status, isConnecting, isConnected, pulseAnim, rotateAnim]);

  // Particle flow loop
  useEffect(() => {
    const particleAnims = particles.map((p) => {
      p.y.setValue(0);
      let duration = 2500 + Math.random() * 1000;
      if (isConnecting) duration = 1200 + Math.random() * 400;
      if (isConnected) duration = 1800 + Math.random() * 600;

      const triggerAnimation = () => {
        p.y.setValue(0);
        Animated.timing(p.y, {
          toValue: 1,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && status !== 'disconnected') {
            triggerAnimation();
          }
        });
      };

      // Initial start with delay
      const timeout = setTimeout(() => {
        if (status !== 'disconnected') {
          triggerAnimation();
        }
      }, p.delay);

      return {
        stop: () => {
          clearTimeout(timeout);
          p.y.stopAnimation();
        },
      };
    });

    return () => {
      particleAnims.forEach(anim => anim.stop());
    };
  }, [status, isConnecting, isConnected, particles]);

  // Rotate interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Dynamic Background Particle Flow */}
      <View style={styles.particleContainer}>
        {status !== 'disconnected' &&
          particles.map((p, index) => {
            const translateY = p.y.interpolate({
              inputRange: [0, 1],
              outputRange: [120, -120], // Flow upwards
            });
            const opacity = p.y.interpolate({
              inputRange: [0, 0.2, 0.8, 1],
              outputRange: [0, 0.7, 0.7, 0],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    left: 70 + p.x,
                    backgroundColor: color,
                    shadowColor: color,
                    transform: [
                      { translateY },
                      { scale: p.scale },
                    ],
                    opacity,
                  },
                ]}
              />
            );
          })}
      </View>

      {/* Pulse Glow Layer */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            borderColor: glowColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Outer Rotating Shield Rings */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            borderColor: color,
            transform: [{ rotate }],
          },
        ]}>
        <View style={[styles.ringNotch, { backgroundColor: color }]} />
        <View style={[styles.ringNotchBottom, { backgroundColor: color }]} />
      </Animated.View>

      {/* Main Shield Shape */}
      <View style={[styles.shieldOuter, { borderColor: color, shadowColor: color }]}>
        <View style={[styles.shieldCore, { backgroundColor: color }]}>
          {/* Inner Lock Icon */}
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
  particleContainer: {
    position: 'absolute',
    width: 140,
    height: 240,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#0F121B', // Deep Slate
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
