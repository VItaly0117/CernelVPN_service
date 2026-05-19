/**
 * SplitTunnelingScreen — Choose which apps go through KernelVPN.
 */
import React, {memo, useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as NativeVpn from '../native/NativeVpn';
import {vpnStore, useVpnStore} from '../store/vpnStore';
import type {SplitTunnelRule, SplitTunnelMode} from '../types/vpn';
import {useResolvedTheme, type AppTheme} from '../theme/theme';

interface Props {
  onBack: () => void;
}

export function SplitTunnelingScreen({onBack}: Props): React.JSX.Element {
  const storeState = useVpnStore();
  const theme = useResolvedTheme(storeState.themeMode);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const installed = await NativeVpn.getInstalledApps();
        if (!cancelled) {
          const existingPkgs = new Set(
            storeState.splitTunnelRules.map(r => r.packageName),
          );
          const newRules: SplitTunnelRule[] = installed
            .filter(app => !existingPkgs.has(app.packageName))
            .map(app => ({
              packageName: app.packageName,
              appName: app.appName,
              routing: 'proxy',
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
        if (!cancelled) {setLoading(false);}
      }
    })();
    return () => {
      cancelled = true;
    };
    // Load once when the screen opens; rules update through the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = useCallback((mode: SplitTunnelMode) => {
    vpnStore.setSplitTunnelMode(mode);
  }, []);

  const toggleApp = useCallback(
    (packageName: string) => {
      const rule = storeState.splitTunnelRules.find(
        item => item.packageName === packageName,
      );
      if (rule) {
        vpnStore.updateSplitTunnelRule(packageName, {enabled: !rule.enabled});
      }
    },
    [storeState.splitTunnelRules],
  );

  const filteredRules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {return storeState.splitTunnelRules;}
    return storeState.splitTunnelRules.filter(
      rule =>
        rule.appName.toLowerCase().includes(needle) ||
        rule.packageName.toLowerCase().includes(needle),
    );
  }, [query, storeState.splitTunnelRules]);

  const selectedCount = storeState.splitTunnelRules.filter(
    rule => rule.enabled,
  ).length;

  const renderApp = useCallback(
    ({item}: {item: SplitTunnelRule}) => (
      <AppRuleRow rule={item} theme={theme} onToggle={toggleApp} />
    ),
    [theme, toggleApp],
  );

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, {color: theme.colors.primary}]}>
            Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Split Tunneling
        </Text>
        <View style={styles.backButton} />
      </View>

      <View
        style={[
          styles.modeCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.separator,
          },
        ]}>
        <Text style={[styles.modeLabel, {color: theme.colors.tertiaryText}]}>
          Routing mode
        </Text>
        <View style={[styles.segment, {backgroundColor: theme.colors.background}]}>
          <ModeButton
            label="All except"
            selected={storeState.splitTunnelMode === 'vpn_all_except_selected'}
            theme={theme}
            onPress={() => setMode('vpn_all_except_selected')}
          />
          <ModeButton
            label="Selected only"
            selected={storeState.splitTunnelMode === 'vpn_selected_only'}
            theme={theme}
            onPress={() => setMode('vpn_selected_only')}
          />
        </View>
        <Text style={[styles.modeHint, {color: theme.colors.secondaryText}]}>
          {selectedCount} selected app{selectedCount === 1 ? '' : 's'}
        </Text>
      </View>

      <TextInput
        style={[
          styles.search,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.separator,
            color: theme.colors.text,
          },
        ]}
        value={query}
        onChangeText={setQuery}
        placeholder="Search apps"
        placeholderTextColor={theme.colors.tertiaryText}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, {color: theme.colors.secondaryText}]}>
            Loading installed apps…
          </Text>
        </View>
      )}

      {error && (
        <View
          style={[
            styles.errorCard,
            {
              backgroundColor: theme.colors.dangerSoft,
              borderColor: theme.colors.danger,
            },
          ]}>
          <Text style={[styles.errorText, {color: theme.colors.danger}]}>
            {error}
          </Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={filteredRules}
          keyExtractor={item => item.packageName}
          renderItem={renderApp}
          contentContainerStyle={styles.listContent}
          initialNumToRender={18}
          maxToRenderPerBatch={18}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <Text style={[styles.emptyText, {color: theme.colors.tertiaryText}]}>
              No apps found
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const AppRuleRow = memo(function AppRuleRow({
  rule,
  theme,
  onToggle,
}: {
  rule: SplitTunnelRule;
  theme: AppTheme;
  onToggle: (packageName: string) => void;
}) {
  return (
    <View
      style={[
        styles.appRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.separator,
        },
      ]}>
      <View style={styles.appInfo}>
        <Text style={[styles.appName, {color: theme.colors.text}]} numberOfLines={1}>
          {rule.appName}
        </Text>
        <Text
          style={[styles.packageName, {color: theme.colors.tertiaryText}]}
          numberOfLines={1}>
          {rule.packageName}
        </Text>
      </View>
      <Switch
        value={rule.enabled}
        onValueChange={() => onToggle(rule.packageName)}
        trackColor={{
          false: theme.isDark ? '#30343D' : '#D7DCE3',
          true: theme.colors.primary,
        }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
});

function ModeButton({
  label,
  selected,
  theme,
  onPress,
}: {
  label: string;
  selected: boolean;
  theme: AppTheme;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.modeButton, selected && {backgroundColor: theme.colors.primary}]}
      onPress={onPress}
      activeOpacity={0.78}>
      <Text
        style={[
          styles.modeButtonText,
          {color: selected ? '#FFFFFF' : theme.colors.secondaryText},
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modeCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 13,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modeHint: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  search: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    fontSize: 15,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorCard: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  appInfo: {
    flex: 1,
    marginRight: 12,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
  },
  packageName: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
