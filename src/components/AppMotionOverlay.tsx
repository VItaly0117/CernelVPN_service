import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';
import type {AppTheme} from '../theme/theme';

export type AppMotionMode = 'launch' | 'transition' | null;

interface AppMotionOverlayProps {
  mode: AppMotionMode;
  theme: AppTheme;
  onDone: () => void;
}

export function AppMotionOverlay({
  mode,
  theme,
  onDone,
}: AppMotionOverlayProps): React.JSX.Element | null {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!mode) {
      return;
    }

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: mode === 'launch' ? 1450 : 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) {
        onDone();
      }
    });
  }, [mode, onDone, progress]);

  if (!mode) {
    return null;
  }

  const overlayOpacity = progress.interpolate({
    inputRange: [0, 0.12, 0.78, 1],
    outputRange: [0, 1, 1, 0],
  });
  const packetIn = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [-190, -8, 18],
  });
  const packetOut = progress.interpolate({
    inputRange: [0, 0.46, 1],
    outputRange: [-26, 0, 190],
  });
  const shieldScale = progress.interpolate({
    inputRange: [0, 0.42, 0.72, 1],
    outputRange: [0.82, 1.04, 1, 0.96],
  });
  const beamScale = progress.interpolate({
    inputRange: [0, 0.2, 0.72, 1],
    outputRange: [0, 0.42, 1, 1],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          opacity: overlayOpacity,
          backgroundColor:
            mode === 'launch'
              ? theme.colors.background
              : 'rgba(5, 5, 7, 0.22)',
        },
      ]}>
      {mode === 'launch' ? (
        <View style={styles.launchStage}>
          <Animated.View
            style={[
              styles.packetCluster,
              {
                transform: [{translateX: packetIn}],
              },
            ]}>
            {[0, 1, 2, 3].map(index => (
              <View
                key={index}
                style={[
                  styles.packetLine,
                  {
                    width: 42 - index * 6,
                    opacity: 0.94 - index * 0.16,
                    backgroundColor:
                      index % 2 === 0
                        ? theme.colors.secondary
                        : theme.colors.primary,
                  },
                ]}
              />
            ))}
          </Animated.View>

          <Animated.View
            style={[
              styles.launchShield,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.surface,
                shadowColor: theme.colors.primary,
                transform: [{scale: shieldScale}],
              },
            ]}>
            <View
              style={[
                styles.shieldCore,
                {
                  borderColor: theme.colors.secondary,
                  backgroundColor: theme.colors.elevated,
                },
              ]}>
              <View
                style={[
                  styles.lockShackle,
                  {borderColor: theme.colors.primary},
                ]}
              />
              <View
                style={[
                  styles.lockBody,
                  {backgroundColor: theme.colors.secondary},
                ]}>
                <View style={styles.lockDot} />
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.protectedBeam,
              {
                backgroundColor: theme.colors.success,
                shadowColor: theme.colors.success,
                transform: [{translateX: packetOut}, {scaleX: beamScale}],
              },
            ]}
          />
          <Text
            style={[
              styles.launchLabel,
              {color: theme.colors.secondaryText, fontFamily: theme.fonts.bold},
            ]}>
            KernelVPN
          </Text>
        </View>
      ) : (
        <View style={styles.transitionStage}>
          <Animated.View
            style={[
              styles.transitionBeam,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.secondary,
                transform: [{scaleX: beamScale}],
              },
            ]}
          />
          <View
            style={[
              styles.transitionNode,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.surface,
              },
            ]}>
            <View
              style={[
                styles.transitionNodeCore,
                {backgroundColor: theme.colors.secondary},
              ]}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchStage: {
    width: 310,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packetCluster: {
    position: 'absolute',
    left: 20,
    gap: 8,
  },
  packetLine: {
    height: 6,
    borderRadius: 3,
  },
  launchShield: {
    width: 104,
    height: 112,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 0},
    elevation: 12,
  },
  shieldCore: {
    width: 76,
    height: 82,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockShackle: {
    width: 28,
    height: 24,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    marginBottom: -4,
  },
  lockBody: {
    width: 42,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  protectedBeam: {
    position: 'absolute',
    right: 26,
    width: 82,
    height: 7,
    borderRadius: 4,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  launchLabel: {
    position: 'absolute',
    bottom: 0,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  transitionStage: {
    width: 260,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionBeam: {
    width: 230,
    height: 5,
    borderRadius: 3,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 0},
  },
  transitionNode: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionNodeCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
