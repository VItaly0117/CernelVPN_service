/**
 * StatusCard — Displays the current VPN status prominently with animated indicator.
 */
import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import type {VpnStatus} from '../types/vpn';
import type {AppTheme} from '../theme/theme';
import {getStatusColors} from '../theme/theme';

interface Props {
  status: VpnStatus;
  theme: AppTheme;
  lastError?: string | null;
}

const STATUS_DISPLAY: Record<
  VpnStatus,
  {label: string; description: string; icon: string}
> = {
  disconnected: {
    label: 'Disconnected',
    description: 'KernelVPN is ready to connect',
    icon: '○',
  },
  permission_required: {
    label: 'Permission Required',
    description: 'Grant Android VPN permission to continue',
    icon: '⚠',
  },
  connecting: {
    label: 'Connecting',
    description: 'Establishing secure tunnel…',
    icon: '◌',
  },
  connected: {
    label: 'Protected',
    description: 'All traffic is encrypted',
    icon: '●',
  },
  disconnecting: {
    label: 'Disconnecting',
    description: 'Shutting down tunnel…',
    icon: '◌',
  },
  error: {
    label: 'Error',
    description: 'Connection needs attention',
    icon: '✕',
  },
};

export function StatusCard({
  status,
  theme,
  lastError,
}: Props): React.JSX.Element {
  const display = STATUS_DISPLAY[status];
  const colors = getStatusColors(status, theme);

  // Animated pulsing dot for connecting/disconnecting states
  const dotScale = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const isTransitioning = status === 'connecting' || status === 'disconnecting';

    if (isTransitioning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(dotScale, {
              toValue: 1.6,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity, {
              toValue: 0.3,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(dotScale, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      dotScale.setValue(1);
      dotOpacity.setValue(1);
    }
  }, [status, dotScale, dotOpacity]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.isDark
            ? 'rgba(255,255,255,0.03)'
            : theme.colors.surface,
          borderColor: theme.colors.separator,
          shadowColor: theme.colors.shadow,
        },
      ]}>
      {/* Accent left border */}
      <View
        style={[styles.accentBar, {backgroundColor: colors.accent}]}
      />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: colors.accent,
                transform: [{scale: dotScale}],
                opacity: dotOpacity,
              },
            ]}
          />
          <Text
            style={[
              styles.statusLabel,
              {color: theme.colors.text, fontFamily: theme.fonts.bold},
            ]}>
            {display.label}
          </Text>
        </View>
        <Text
          style={[
            styles.description,
            {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium},
          ]}>
          {display.description}
        </Text>
        {lastError && status === 'error' && (
          <Text
            style={[
              styles.errorText,
              {color: theme.colors.danger, fontFamily: theme.fonts.medium},
            ]}
            numberOfLines={3}>
            {lastError}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.06,
    shadowRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    flex: 1,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    marginLeft: 20,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 20,
    lineHeight: 16,
  },
});
