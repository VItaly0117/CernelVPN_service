/**
 * HomeScreen — Main KernelVPN control screen.
 */
import React, {useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {ConnectionButton} from '../components/ConnectionButton';
import {StatusCard} from '../components/StatusCard';
import {ServerCard} from '../components/ServerCard';
import {ActionRow} from '../components/ActionRow';
import {useVpnStore, vpnStore} from '../store/vpnStore';
import * as vpnService from '../services/vpnService';
import {
  fetchRulesManifest,
  validateRulesManifest,
  applyRulesManifest,
} from '../services/rulesService';
import type {ThemeMode} from '../theme/theme';
import {getStatusColors, useResolvedTheme} from '../theme/theme';

interface Props {
  onNavigate: (screen: string) => void;
}

const THEME_OPTIONS: Array<{mode: ThemeMode; label: string}> = [
  {mode: 'system', label: 'Auto'},
  {mode: 'light', label: 'Light'},
  {mode: 'dark', label: 'Dark'},
];

export function HomeScreen({onNavigate}: Props): React.JSX.Element {
  const state = useVpnStore();
  const theme = useResolvedTheme(state.themeMode);
  const statusColors = getStatusColors(state.status, theme);

  useEffect(() => {
    async function setup() {
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        } catch (e) {
          console.warn('Failed to request POST_NOTIFICATIONS', e);
        }
      }
    }
    setup();

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
        'Import a VPN profile before connecting.',
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
      // Error is handled by vpnService and stored in vpnStore.
    }
  }, [state.activeProfile, onNavigate]);

  const handleDisconnect = useCallback(async () => {
    try {
      await vpnService.disconnect();
    } catch {
      // Error is handled by vpnService.
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
      const msg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Update Failed', msg);
    }
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, {color: theme.colors.text}]}>
              KernelVPN
            </Text>
            <Text
              style={[styles.subtitle, {color: theme.colors.secondaryText}]}>
              Private tunnel control
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {backgroundColor: statusColors.soft},
            ]}>
            <View
              style={[styles.statusDot, {backgroundColor: statusColors.accent}]}
            />
            <Text style={[styles.statusPillText, {color: statusColors.accent}]}>
              {state.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.themeSelector,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.separator,
            },
          ]}>
          {THEME_OPTIONS.map(option => {
            const selected = state.themeMode === option.mode;
            return (
              <TouchableOpacity
                key={option.mode}
                style={[
                  styles.themeOption,
                  selected && {backgroundColor: theme.colors.primary},
                ]}
                activeOpacity={0.78}
                onPress={() => vpnStore.setThemeMode(option.mode)}>
                <Text
                  style={[
                    styles.themeOptionText,
                    {
                      color: selected ? '#FFFFFF' : theme.colors.secondaryText,
                    },
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <StatusCard
          status={state.status}
          lastError={state.lastError}
          theme={theme}
        />

        {(state.status === 'connected' || state.status === 'connecting') && (
          <View
            style={[
              styles.warningContainer,
              {
                backgroundColor: theme.colors.warningSoft,
                borderColor: theme.colors.warning,
              },
            ]}>
            <Text style={[styles.warningTitle, {color: theme.colors.warning}]}>
              Skeleton tunnel mode
            </Text>
            <Text
              style={[
                styles.warningText,
                {color: theme.colors.secondaryText},
              ]}>
              The Android VPN service is active, but real Xray/sing-box traffic
              routing is not integrated yet.
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <ConnectionButton
            status={state.status}
            theme={theme}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </View>

        <ServerCard profile={state.activeProfile} theme={theme} />

        <View style={styles.metricsRow}>
          <Metric
            label="Profiles"
            value={String(state.savedProfiles.length)}
            themeMode={theme.mode}
          />
          <Metric
            label="Split rules"
            value={String(state.splitTunnelRules.filter(rule => rule.enabled).length)}
            themeMode={theme.mode}
          />
          <Metric
            label="Panel"
            value={state.panelSettings ? 'Saved' : 'Setup'}
            themeMode={theme.mode}
          />
        </View>

        <View style={styles.actionsSection}>
          <Text
            style={[
              styles.sectionTitle,
              {color: theme.colors.tertiaryText},
            ]}>
            Controls
          </Text>
          <ActionRow
            label="Import Profile"
            subtitle="VLESS, VMess, Trojan, Shadowsocks"
            icon="+"
            theme={theme}
            onPress={() => onNavigate('ImportProfile')}
          />
          <ActionRow
            label="3X-UI Panel"
            subtitle="Status, Xray controls, and VLESS import"
            icon="~"
            theme={theme}
            onPress={() => onNavigate('Panel')}
          />
          <ActionRow
            label="Split Tunneling"
            subtitle="Choose which apps use KernelVPN"
            icon="/"
            theme={theme}
            onPress={() => onNavigate('SplitTunneling')}
          />
          <ActionRow
            label="Diagnostics"
            subtitle="Check service, core, and battery state"
            icon="i"
            theme={theme}
            onPress={() => onNavigate('Diagnostics')}
          />
          <ActionRow
            label="Update Rules"
            subtitle="Apply trusted routing rules"
            icon="*"
            theme={theme}
            onPress={handleUpdateRules}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
  themeMode,
}: {
  label: string;
  value: string;
  themeMode: 'light' | 'dark';
}): React.JSX.Element {
  const isDark = themeMode === 'dark';
  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: isDark ? '#17191F' : '#FFFFFF',
          borderColor: isDark ? '#30343D' : '#E5E7EB',
        },
      ]}>
      <Text style={[styles.metricValue, {color: isDark ? '#F5F7FA' : '#111317'}]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, {color: isDark ? '#7E8796' : '#8A93A1'}]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 31,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  statusPill: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  themeSelector: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  themeOption: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  buttonContainer: {
    marginVertical: 22,
    alignItems: 'center',
  },
  warningContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  metric: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  actionsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 8,
  },
});
