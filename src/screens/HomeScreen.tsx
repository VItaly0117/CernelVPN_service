/**
 * HomeScreen — Main VPN control screen.
 *
 * Displays connection status, active profile, and navigation to other screens.
 */
import React, {useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import {ConnectionButton} from '../components/ConnectionButton';
import {StatusCard} from '../components/StatusCard';
import {ServerCard} from '../components/ServerCard';
import {ActionRow} from '../components/ActionRow';
import {useVpnStore} from '../store/vpnStore';
import * as vpnService from '../services/vpnService';
import {
  fetchRulesManifest,
  validateRulesManifest,
  applyRulesManifest,
} from '../services/rulesService';

interface Props {
  onNavigate: (screen: string) => void;
}

export function HomeScreen({onNavigate}: Props): React.JSX.Element {
  const state = useVpnStore();

  // Start listening for native VPN events
  useEffect(() => {
    vpnService.startListening();
    vpnService.refreshStatus();
    return () => {
      vpnService.stopListening();
    };
  }, []);

  const handleConnect = useCallback(async () => {
    if (!state.activeProfile) {
      Alert.alert(
        'No Profile',
        'Please import a VPN profile first.',
        [
          {text: 'Import', onPress: () => onNavigate('ImportProfile')},
          {text: 'Cancel', style: 'cancel'},
        ],
      );
      return;
    }
    try {
      await vpnService.connect(state.activeProfile);
    } catch {
      // Error is handled by vpnService and stored in vpnStore
    }
  }, [state.activeProfile, onNavigate]);

  const handleDisconnect = useCallback(async () => {
    try {
      await vpnService.disconnect();
    } catch {
      // Error is handled by vpnService
    }
  }, []);

  const handleUpdateRules = useCallback(async () => {
    try {
      const manifest = await fetchRulesManifest(
        'https://example.com/rules.json',
      );
      if (validateRulesManifest(manifest)) {
        await applyRulesManifest(manifest);
        Alert.alert('Rules Updated', `Applied rules v${manifest.version}`);
      } else {
        Alert.alert('Error', 'Invalid rules manifest received.');
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Update Failed', msg);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.header}>Personal VPN</Text>

        {/* Status */}
        <StatusCard status={state.status} lastError={state.lastError} />

        {/* Connect Button */}
        <View style={styles.buttonContainer}>
          <ConnectionButton
            status={state.status}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </View>

        {/* Active Profile */}
        <ServerCard profile={state.activeProfile} />

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <ActionRow
            label="Import Profile"
            subtitle="Add VLESS, VMess, or other links"
            icon="📥"
            onPress={() => onNavigate('ImportProfile')}
          />
          <ActionRow
            label="Split Tunneling"
            subtitle="Choose which apps use VPN"
            icon="🔀"
            onPress={() => onNavigate('SplitTunneling')}
          />
          <ActionRow
            label="Diagnostics"
            subtitle="Check VPN service health"
            icon="🔍"
            onPress={() => onNavigate('Diagnostics')}
          />
          <ActionRow
            label="Update Rules"
            subtitle="Fetch latest routing rules"
            icon="🔄"
            onPress={handleUpdateRules}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  actionsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 20,
    marginBottom: 8,
  },
});
