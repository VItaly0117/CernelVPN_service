/**
 * DiagnosticsScreen — VPN service health check.
 */
import React, {useState, useCallback} from 'react';
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
import type {VpnDiagnosticResult} from '../types/vpn';

interface Props {
  onBack: () => void;
}

export function DiagnosticsScreen({onBack}: Props): React.JSX.Element {
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

  const formatted = diagnostics ? formatDiagnostics(diagnostics) : [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Diagnostics</Text>
          <View style={styles.backButton} />
        </View>

        {/* Refresh button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.refreshText}>Refresh Diagnostics</Text>
          )}
        </TouchableOpacity>

        {/* Results */}
        {diagnostics ? (
          <View style={styles.resultsCard}>
            {formatted.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.resultRow,
                  index < formatted.length - 1 && styles.resultRowBorder,
                ]}>
                <Text style={styles.resultLabel}>{item.label}</Text>
                <Text
                  style={[
                    styles.resultValue,
                    item.isWarning && styles.warningValue,
                  ]}
                  numberOfLines={2}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Tap "Refresh Diagnostics" to check VPN service health.
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Diagnostics</Text>
          <Text style={styles.infoText}>
            This screen checks the current state of the VPN service,
            permissions, and the proxy core. Use it to troubleshoot
            connection issues.
          </Text>
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
  refreshButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  resultRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2D2D3F',
  },
  resultLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 1,
  },
  resultValue: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  warningValue: {
    color: '#FCA5A5',
  },
  emptyCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
});
