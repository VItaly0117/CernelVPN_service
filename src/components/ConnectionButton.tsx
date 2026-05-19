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
import type {AppTheme} from '../theme/theme';
import {getStatusColors} from '../theme/theme';

interface Props {
  status: VpnStatus;
  theme: AppTheme;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<
  VpnStatus,
  {label: string; showSpinner: boolean}
> = {
  disconnected: {
    label: 'Connect',
    showSpinner: false,
  },
  permission_required: {
    label: 'Grant Permission',
    showSpinner: false,
  },
  connecting: {
    label: 'Connecting…',
    showSpinner: true,
  },
  connected: {
    label: 'Disconnect',
    showSpinner: false,
  },
  disconnecting: {
    label: 'Disconnecting…',
    showSpinner: true,
  },
  error: {
    label: 'Retry',
    showSpinner: false,
  },
};

export function ConnectionButton({
  status,
  theme,
  onConnect,
  onDisconnect,
  disabled,
}: Props): React.JSX.Element {
  const config = STATUS_CONFIG[status];
  const colors = getStatusColors(status, theme);
  const isConnectedState = status === 'connected';
  const isTransitioning = status === 'connecting' || status === 'disconnecting';

  const handlePress = () => {
    if (isTransitioning || disabled) {return;}
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
        {
          backgroundColor:
            status === 'disconnected'
              ? theme.colors.primary
              : colors.accent,
          shadowColor: colors.accent,
        },
        (isTransitioning || disabled) && styles.disabled,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isTransitioning || disabled}>
      <View style={styles.content}>
        {config.showSpinner && (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            style={styles.spinner}
          />
        )}
        <Text style={styles.label}>{config.label}</Text>
        <Text style={styles.subLabel}>
          {isConnectedState ? 'Secure session' : 'KernelVPN'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 184,
    height: 184,
    borderRadius: 92,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 7,
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.22,
    shadowRadius: 24,
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
    color: '#FFFFFF',
  },
  subLabel: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
