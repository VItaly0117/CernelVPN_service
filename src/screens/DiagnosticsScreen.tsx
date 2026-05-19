/**
 * DiagnosticsScreen — KernelVPN service health check.
 */
import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import {
  fetchDiagnostics,
  formatDiagnostics,
} from '../services/diagnosticsService';
import * as NativeVpn from '../native/NativeVpn';
import type {VpnDiagnosticResult} from '../types/vpn';
import {useVpnStore} from '../store/vpnStore';
import {useResolvedTheme, type AppTheme} from '../theme/theme';

interface Props {
  onBack: () => void;
}

export function DiagnosticsScreen({onBack}: Props): React.JSX.Element {
  const {themeMode} = useVpnStore();
  const theme = useResolvedTheme(themeMode);
  const [diagnostics, setDiagnostics] = useState<VpnDiagnosticResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDiagnostics();
      setDiagnostics(result);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBatterySettings = useCallback(async () => {
    try {
      await NativeVpn.openBatteryOptimizationSettings();
    } catch (error: unknown) {
      console.warn('[Diagnostics] Failed to open battery settings', error);
    }
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const formatted = diagnostics ? formatDiagnostics(diagnostics) : [];

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backText, {color: theme.colors.primary}]}>
              Back
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, {color: theme.colors.text}]}>
            Diagnostics
          </Text>
          <View style={styles.backButton} />
        </View>

        <TouchableOpacity
          style={[styles.refreshButton, {backgroundColor: theme.colors.primary}]}
          onPress={handleRefresh}
          disabled={loading}
          activeOpacity={0.82}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshText}>Refresh Diagnostics</Text>
          )}
        </TouchableOpacity>

        {diagnostics ? (
          <View
            style={[
              styles.resultsCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
              },
            ]}>
            {formatted.map((item, index) => (
              <DiagnosticRow
                key={item.label}
                theme={theme}
                label={item.label}
                value={item.value}
                isWarning={item.isWarning}
                withBorder={index < formatted.length - 1}
              />
            ))}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
              },
            ]}>
            <Text style={[styles.emptyText, {color: theme.colors.tertiaryText}]}>
              Diagnostics will appear after the first refresh.
            </Text>
          </View>
        )}

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.primarySoft,
              borderColor: theme.colors.separator,
            },
          ]}>
          <Text style={[styles.infoTitle, {color: theme.colors.primary}]}>
            Device notes
          </Text>
          <Text style={[styles.infoText, {color: theme.colors.secondaryText}]}>
            Samsung and OnePlus may restrict foreground VPN services when battery
            optimization is enabled. Keep KernelVPN unrestricted during device
            testing.
          </Text>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {borderColor: theme.colors.primary},
            ]}
            onPress={handleBatterySettings}
            activeOpacity={0.82}>
            <Text
              style={[
                styles.secondaryButtonText,
                {color: theme.colors.primary},
              ]}>
              Open Battery Settings
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DiagnosticRow({
  label,
  value,
  isWarning,
  withBorder,
  theme,
}: {
  label: string;
  value: string;
  isWarning?: boolean;
  withBorder: boolean;
  theme: AppTheme;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.resultRow,
        withBorder && {borderBottomColor: theme.colors.separator},
        withBorder && styles.resultRowBorder,
      ]}>
      <View
        style={[
          styles.checkDot,
          {
            backgroundColor: isWarning
              ? theme.colors.warning
              : theme.colors.success,
          },
        ]}
      />
      <View style={styles.resultTextWrap}>
        <Text style={[styles.resultLabel, {color: theme.colors.secondaryText}]}>
          {label}
        </Text>
        <Text
          style={[
            styles.resultValue,
            {color: isWarning ? theme.colors.warning : theme.colors.text},
          ]}
          numberOfLines={3}>
          {value}
        </Text>
      </View>
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
  refreshButton: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resultsCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
  },
  resultRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
    marginRight: 12,
  },
  resultTextWrap: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
