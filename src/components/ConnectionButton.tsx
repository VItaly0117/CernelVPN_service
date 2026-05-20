/**
 * ConnectionButton — Premium animated power button with status-aware animations.
 *
 * Layout: Outer pulsing ring (190×190) → Inner button circle (160×160) → Icon + status text.
 *
 * Animations per status:
 * - disconnected: Subtle breathing scale (1.0→1.02→1.0, 3s loop)
 * - connecting: Ring rotates 360° in 2s + inner circle scale pulse (0.97→1.03)
 * - connected: Green glow, bounce on transition (0.9→1.05→1.0, 400ms)
 * - disconnecting: Same as connecting but with warning color
 * - error: Quick shake (translateX -5→5→-3→3→0, 300ms)
 * - permission_required: Same breathing as disconnected with warning tint
 */
import React, {useRef, useEffect, useCallback} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Animated,
} from 'react-native';
import type {VpnStatus} from '../types/vpn';
import type {AppTheme} from '../theme/theme';
import {getStatusColors} from '../theme/theme';

/** Props for the ConnectionButton component. */
interface Props {
  status: VpnStatus;
  theme: AppTheme;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
}

/** Status label configuration. */
const STATUS_LABELS: Record<VpnStatus, string> = {
  disconnected: 'Connect',
  permission_required: 'Grant Permission',
  connecting: 'Connecting…',
  connected: 'Protected',
  disconnecting: 'Disconnecting…',
  error: 'Retry',
};

/** Size constants for the button layout. */
const OUTER_SIZE = 190;
const INNER_SIZE = 160;
const OUTER_RADIUS = OUTER_SIZE / 2;
const INNER_RADIUS = INNER_SIZE / 2;
const BORDER_WIDTH = 3;

/**
 * ConnectionButton — Large animated power button for VPN connect/disconnect.
 *
 * Displays an outer ring with status-colored border and an inner circle
 * containing a power icon and status label. Animations react to VPN status changes.
 */
export function ConnectionButton({
  status,
  theme,
  onConnect,
  onDisconnect,
  disabled,
}: Props): React.JSX.Element {
  const colors = getStatusColors(status, theme);
  const isConnectedState = status === 'connected';
  const isTransitioning = status === 'connecting' || status === 'disconnecting';

  // ── Animated values ──────────────────────────────────────────────────────

  /** Outer ring scale for breathing animation (disconnected / permission_required). */
  const ringScale = useRef(new Animated.Value(1)).current;

  /** Outer ring rotation for connecting/disconnecting spinner. */
  const ringRotation = useRef(new Animated.Value(0)).current;

  /** Inner circle scale for pulse (connecting/disconnecting) and bounce (connected). */
  const innerScale = useRef(new Animated.Value(1)).current;

  /** Horizontal translation for error shake. */
  const shakeX = useRef(new Animated.Value(0)).current;

  /** Opacity for glow fade-in on connected state. */
  const glowOpacity = useRef(new Animated.Value(0)).current;

  /** Store running animation refs so we can stop them in cleanup. */
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);

  // ── Animation helpers ────────────────────────────────────────────────────

  /** Stop all currently running animations and reset them. */
  const stopAllAnimations = useCallback(() => {
    activeAnimations.current.forEach(a => a.stop());
    activeAnimations.current = [];
  }, []);

  /** Start the subtle breathing animation for idle states. */
  const startBreathing = useCallback(() => {
    ringScale.setValue(1);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1.0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    activeAnimations.current.push(anim);
    anim.start();
  }, [ringScale]);

  /** Start the rotating ring + pulsing inner circle for transitioning states. */
  const startSpinner = useCallback(() => {
    ringRotation.setValue(0);
    innerScale.setValue(1);

    const rotateAnim = Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    );

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(innerScale, {
          toValue: 1.03,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(innerScale, {
          toValue: 0.97,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    activeAnimations.current.push(rotateAnim, pulseAnim);
    rotateAnim.start();
    pulseAnim.start();
  }, [ringRotation, innerScale]);

  /** Play the connected bounce-in animation once. */
  const startBounce = useCallback(() => {
    innerScale.setValue(0.9);
    glowOpacity.setValue(0);

    const bounceAnim = Animated.sequence([
      Animated.spring(innerScale, {
        toValue: 1.05,
        speed: 28,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.timing(innerScale, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]);

    const fadeGlowAnim = Animated.timing(glowOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });

    activeAnimations.current.push(bounceAnim, fadeGlowAnim);
    bounceAnim.start();
    fadeGlowAnim.start();
  }, [innerScale, glowOpacity]);

  /** Play the error shake animation once. */
  const startShake = useCallback(() => {
    shakeX.setValue(0);

    const shakeAnim = Animated.sequence([
      Animated.timing(shakeX, {
        toValue: -5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -3,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 3,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    activeAnimations.current.push(shakeAnim);
    shakeAnim.start();
  }, [shakeX]);

  // ── Effect: drive animations based on status ─────────────────────────────

  useEffect(() => {
    stopAllAnimations();

    // Reset values to defaults before starting new animation
    ringScale.setValue(1);
    ringRotation.setValue(0);
    innerScale.setValue(1);
    shakeX.setValue(0);
    glowOpacity.setValue(0);

    switch (status) {
      case 'disconnected':
      case 'permission_required':
        startBreathing();
        break;
      case 'connecting':
      case 'disconnecting':
        startSpinner();
        break;
      case 'connected':
        startBounce();
        break;
      case 'error':
        startShake();
        break;
    }

    return () => {
      stopAllAnimations();
    };
  }, [
    status,
    stopAllAnimations,
    startBreathing,
    startSpinner,
    startBounce,
    startShake,
    ringScale,
    ringRotation,
    innerScale,
    shakeX,
    glowOpacity,
  ]);

  // ── Press handler ────────────────────────────────────────────────────────

  const handlePress = () => {
    if (isTransitioning || disabled) {
      return;
    }
    if (isConnectedState) {
      onDisconnect();
    } else {
      onConnect();
    }
  };

  // ── Interpolations ───────────────────────────────────────────────────────

  /** Map ringRotation 0→1 to '0deg'→'360deg'. */
  const rotateInterpolation = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ── Determine ring border color ──────────────────────────────────────────

  const ringBorderColor =
    status === 'disconnecting' ? theme.colors.warning : colors.accent;

  // ── Determine icon and label ─────────────────────────────────────────────

  const centerIcon = '⏻';
  const statusLabel = STATUS_LABELS[status];

  // ── Shadow glow color matching status accent ─────────────────────────────

  const shadowAccent =
    status === 'disconnecting' ? theme.colors.warning : colors.accent;

  return (
    <View style={styles.container}>
      {/* Outer animated ring */}
      <Animated.View
        style={[
          styles.outerRing,
          {
            borderColor: ringBorderColor,
            transform: [
              {scale: ringScale},
              {rotate: rotateInterpolation},
            ],
          },
        ]}>
        {/* Glow layer for connected state */}
        <Animated.View
          style={[
            styles.glowLayer,
            {
              backgroundColor: colors.accent,
              opacity: isConnectedState
                ? Animated.multiply(glowOpacity, new Animated.Value(0.08))
                : 0,
            },
          ]}
        />

        {/* Inner button circle */}
        <Animated.View
          style={[
            styles.innerCircle,
            {
              backgroundColor: theme.colors.surface,
              shadowColor: shadowAccent,
              transform: [
                {scale: innerScale},
                {translateX: shakeX},
              ],
            },
          ]}>
          <TouchableOpacity
            style={styles.touchArea}
            onPress={handlePress}
            activeOpacity={0.8}
            disabled={isTransitioning || disabled}>
            <View
              style={[
                styles.content,
                (isTransitioning || disabled) && styles.disabledContent,
              ]}>
              <Text style={[styles.icon, {color: colors.accent}]}>
                {centerIcon}
              </Text>
              <Text
                style={[
                  styles.statusText,
                  {
                    color: colors.accent,
                    fontFamily: theme.fonts.semiBold,
                  },
                ]}>
                {statusLabel}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /** Root container centers the button. */
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Outer pulsing/rotating ring. */
  outerRing: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_RADIUS,
    borderWidth: BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Transparent glow layer behind the inner circle. */
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: OUTER_RADIUS,
  },
  /** Inner solid circle containing icon + text. */
  innerCircle: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  /** Touchable area fills the inner circle. */
  touchArea: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Content layout (icon + label). */
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Reduced opacity when disabled or transitioning. */
  disabledContent: {
    opacity: 0.7,
  },
  /** Power symbol / shield icon. */
  icon: {
    fontSize: 36,
    marginBottom: 6,
  },
  /** Status label text below icon. */
  statusText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
