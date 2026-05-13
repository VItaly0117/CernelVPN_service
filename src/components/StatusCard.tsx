/**
 * StatusCard — Displays the current VPN status prominently.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {VpnStatus} from '../types/vpn';

interface Props {
  status: VpnStatus;
  lastError?: string | null;
}

const STATUS_DISPLAY: Record<
  VpnStatus,
  {label: string; description: string; dotColor: string}
> = {
  disconnected: {
    label: 'Disconnected',
    description: 'VPN is not active',
    dotColor: '#9CA3AF',
  },
  permission_required: {
    label: 'Permission Required',
    description: 'Tap Connect to grant VPN permission',
    dotColor: '#F59E0B',
  },
  connecting: {
    label: 'Connecting',
    description: 'Establishing VPN tunnel…',
    dotColor: '#6366F1',
  },
  connected: {
    label: 'Connected',
    description: 'Traffic is routed through VPN',
    dotColor: '#10B981',
  },
  disconnecting: {
    label: 'Disconnecting',
    description: 'Shutting down VPN tunnel…',
    dotColor: '#8B5CF6',
  },
  error: {
    label: 'Error',
    description: 'Something went wrong',
    dotColor: '#EF4444',
  },
};

export function StatusCard({status, lastError}: Props): React.JSX.Element {
  const display = STATUS_DISPLAY[status];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, {backgroundColor: display.dotColor}]} />
        <Text style={styles.statusLabel}>{display.label}</Text>
      </View>
      <Text style={styles.description}>{display.description}</Text>
      {lastError && status === 'error' && (
        <Text style={styles.errorText}>{lastError}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
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
    color: '#F1F5F9',
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 22,
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
    marginTop: 8,
    marginLeft: 22,
  },
});
