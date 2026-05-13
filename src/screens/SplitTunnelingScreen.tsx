/**
 * SplitTunnelingScreen — Choose which apps go through VPN.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as NativeVpn from '../native/NativeVpn';
import {vpnStore, useVpnStore} from '../store/vpnStore';
import type {InstalledAppInfo, SplitTunnelRule, SplitTunnelMode} from '../types/vpn';

interface Props {
  onBack: () => void;
}

export function SplitTunnelingScreen({onBack}: Props): React.JSX.Element {
  const storeState = useVpnStore();
  const [apps, setApps] = useState<InstalledAppInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load installed apps
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const installed = await NativeVpn.getInstalledApps();
        if (!cancelled) {
          setApps(installed);
          // Initialize rules for new apps
          const existingPkgs = new Set(
            storeState.splitTunnelRules.map(r => r.packageName),
          );
          const newRules: SplitTunnelRule[] = installed
            .filter(app => !existingPkgs.has(app.packageName))
            .map(app => ({
              packageName: app.packageName,
              appName: app.appName,
              routing: 'proxy' as const,
              enabled: false,
            }));
          if (newRules.length > 0) {
            vpnStore.setSplitTunnelRules([
              ...storeState.splitTunnelRules,
              ...newRules,
            ]);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load installed apps',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMode = useCallback(() => {
    const newMode: SplitTunnelMode =
      storeState.splitTunnelMode === 'vpn_all_except_selected'
        ? 'vpn_selected_only'
        : 'vpn_all_except_selected';
    vpnStore.setSplitTunnelMode(newMode);
  }, [storeState.splitTunnelMode]);

  const toggleApp = useCallback(
    (packageName: string) => {
      const rule = storeState.splitTunnelRules.find(
        r => r.packageName === packageName,
      );
      if (rule) {
        vpnStore.updateSplitTunnelRule(packageName, {enabled: !rule.enabled});
      }
    },
    [storeState.splitTunnelRules],
  );

  const modeLabel =
    storeState.splitTunnelMode === 'vpn_all_except_selected'
      ? 'All traffic via VPN, selected apps go direct'
      : 'Only selected apps go through VPN';

  const renderApp = ({item}: {item: SplitTunnelRule}) => (
    <View style={styles.appRow}>
      <View style={styles.appInfo}>
        <Text style={styles.appName} numberOfLines={1}>
          {item.appName}
        </Text>
        <Text style={styles.packageName} numberOfLines={1}>
          {item.packageName}
        </Text>
      </View>
      <Switch
        value={item.enabled}
        onValueChange={() => toggleApp(item.packageName)}
        trackColor={{false: '#334155', true: '#3B82F6'}}
        thumbColor={item.enabled ? '#FFFFFF' : '#94A3B8'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Split Tunneling</Text>
        <View style={styles.backButton} />
      </View>

      {/* Mode toggle */}
      <TouchableOpacity style={styles.modeCard} onPress={toggleMode}>
        <Text style={styles.modeLabel}>Mode</Text>
        <Text style={styles.modeValue}>{modeLabel}</Text>
        <Text style={styles.modeTap}>Tap to switch</Text>
      </TouchableOpacity>

      {/* Content */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading installed apps…</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={storeState.splitTunnelRules}
          keyExtractor={item => item.packageName}
          renderItem={renderApp}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No apps found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 70,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  modeCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modeValue: {
    fontSize: 15,
    color: '#F1F5F9',
    fontWeight: '600',
  },
  modeTap: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 6,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#2D1B1B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E2E',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 3,
  },
  appInfo: {
    flex: 1,
    marginRight: 12,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  packageName: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
