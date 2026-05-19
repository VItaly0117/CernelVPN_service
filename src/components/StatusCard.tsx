/**
 * StatusCard — Displays the current VPN status prominently.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
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
  {label: string; description: string}
> = {
  disconnected: {
    label: 'Disconnected',
    description: 'KernelVPN is ready',
  },
  permission_required: {
    label: 'Permission Required',
    description: 'Grant Android VPN permission to continue',
  },
  connecting: {
    label: 'Connecting',
    description: 'Establishing VPN tunnel…',
  },
  connected: {
    label: 'Connected',
    description: 'Android VPN service is active',
  },
  disconnecting: {
    label: 'Disconnecting',
    description: 'Shutting down VPN tunnel…',
  },
  error: {
    label: 'Error',
    description: 'KernelVPN needs attention',
  },
};

export function StatusCard({
  status,
  theme,
  lastError,
}: Props): React.JSX.Element {
  const display = STATUS_DISPLAY[status];
  const colors = getStatusColors(status, theme);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.separator,
          shadowColor: theme.colors.shadow,
        },
      ]}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, {backgroundColor: colors.accent}]} />
        <Text style={[styles.statusLabel, {color: theme.colors.text}]}>
          {display.label}
        </Text>
      </View>
      <Text style={[styles.description, {color: theme.colors.secondaryText}]}>
        {display.description}
      </Text>
      {lastError && status === 'error' && (
        <Text style={[styles.errorText, {color: theme.colors.danger}]}>
          {lastError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    marginLeft: 22,
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 22,
  },
});
