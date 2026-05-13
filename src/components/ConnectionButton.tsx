/**
 * ConnectionButton — Large connect/disconnect button with animated states.
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import type {VpnStatus} from '../types/vpn';

interface Props {
  status: VpnStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<
  VpnStatus,
  {label: string; color: string; bgColor: string; showSpinner: boolean}
> = {
  disconnected: {
    label: 'Connect',
    color: '#FFFFFF',
    bgColor: '#3B82F6',
    showSpinner: false,
  },
  permission_required: {
    label: 'Grant Permission',
    color: '#FFFFFF',
    bgColor: '#F59E0B',
    showSpinner: false,
  },
  connecting: {
    label: 'Connecting…',
    color: '#FFFFFF',
    bgColor: '#6366F1',
    showSpinner: true,
  },
  connected: {
    label: 'Disconnect',
    color: '#FFFFFF',
    bgColor: '#10B981',
    showSpinner: false,
  },
  disconnecting: {
    label: 'Disconnecting…',
    color: '#FFFFFF',
    bgColor: '#8B5CF6',
    showSpinner: true,
  },
  error: {
    label: 'Retry',
    color: '#FFFFFF',
    bgColor: '#EF4444',
    showSpinner: false,
  },
};

export function ConnectionButton({
  status,
  onConnect,
  onDisconnect,
  disabled,
}: Props): React.JSX.Element {
  const config = STATUS_CONFIG[status];
  const isConnectedState = status === 'connected';
  const isTransitioning = status === 'connecting' || status === 'disconnecting';

  const handlePress = () => {
    if (isTransitioning || disabled) return;
    if (isConnectedState) {
      onDisconnect();
    } else {
      onConnect();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {backgroundColor: config.bgColor},
        (isTransitioning || disabled) && styles.disabled,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isTransitioning || disabled}>
      <View style={styles.content}>
        {config.showSpinner && (
          <ActivityIndicator
            size="small"
            color={config.color}
            style={styles.spinner}
          />
        )}
        <Text style={[styles.label, {color: config.color}]}>
          {config.label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabled: {
    opacity: 0.7,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
