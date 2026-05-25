/**
 * DiagnosticsScreen — KernelVPN service health check, diagnostics, and log explorer.
 */
import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
  Clipboard,
  StatusBar as NativeStatusBar,
  Animated,
  AppState,
} from 'react-native';
import {
  fetchDiagnostics,
  formatDiagnostics,
} from '../services/diagnosticsService';
import {
  clearLogs,
  subscribeToLogs,
  type LogEvent,
} from '../services/appLogger';
import {generateDiagnosticReport} from '../services/diagnosticReport';
import {appLogger} from '../services/appLogger';
import * as NativeVpn from '../native/NativeVpn';
import type {VpnDiagnosticResult} from '../types/vpn';
import {useVpnStore} from '../store/vpnStore';
import {useResolvedTheme, type AppTheme} from '../theme/theme';
import {androidHeaderTopPadding} from '../services/layoutService';

interface Props {
  onBack: () => void;
}

const HEADER_TOP_PADDING = androidHeaderTopPadding(
  Platform.OS,
  NativeStatusBar.currentHeight,
  12,
);

const TABS = [
  {id: 'system', label: 'System'},
  {id: 'logs', label: 'Logs'},
  {id: 'network', label: 'Network'},
] as const;

const LEVELS = [
  {id: 'all', label: 'All'},
  {id: 'verbose', label: 'Verbose'},
  {id: 'debug', label: 'Debug'},
  {id: 'info', label: 'Info'},
  {id: 'warn', label: 'Warn'},
  {id: 'error', label: 'Error'},
] as const;

const SOURCES = [
  {id: 'all', label: 'All'},
  {id: 'frontend', label: 'Frontend'},
  {id: 'native-vpn', label: 'Native VPN'},
  {id: 'core', label: 'Core'},
  {id: 'xui-panel', label: '3X-UI Panel'},
  {id: 'profile-import', label: 'Import'},
  {id: 'split-tunnel', label: 'Split Tunnel'},
  {id: 'persistence', label: 'Persistence'},
] as const;

export function DiagnosticsScreen({onBack}: Props): React.JSX.Element {
  const {themeMode} = useVpnStore();
  const theme = useResolvedTheme(themeMode);
  const [activeTab, setActiveTab] = useState<'system' | 'logs' | 'network'>('system');
  const [diagnostics, setDiagnostics] = useState<VpnDiagnosticResult | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [logs, setLogs] = useState<LogEvent[]>([]);

  // Log filters
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [newestFirst, setNewestFirst] = useState<boolean>(true);

  // Subscribe to central logger
  useEffect(() => {
    const unsubscribe = subscribeToLogs(newLogs => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchDiagnostics();
      setDiagnostics(result);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh when returning from background (e.g. from Battery Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        handleRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleRefresh]);

  const handleBatterySettings = useCallback(async () => {
    try {
      await NativeVpn.openBatteryOptimizationSettings();
    } catch (error: unknown) {
      console.warn('[Diagnostics] Failed to open battery settings', error);
      Alert.alert('Settings Error', 'Could not open battery optimization settings.');
    }
  }, []);

  // Shared copy helper
  const handleCopyReport = useCallback(async (errorsOnly = false) => {
    setSharing(true);
    try {
      const result = diagnostics ?? (await fetchDiagnostics());
      setDiagnostics(result);
      const report = generateDiagnosticReport(result, {errorsOnly});

      if (Clipboard && typeof Clipboard.setString === 'function') {
        Clipboard.setString(report);
        Alert.alert(
          errorsOnly ? 'Errors Copied' : 'Report Copied',
          errorsOnly
            ? 'Sanitized error diagnostic report copied to clipboard!'
            : 'Full sanitized diagnostic report copied to clipboard!',
        );
      } else {
        await Share.share({
          message: report,
          title: errorsOnly ? 'KernelVPN Error Report' : 'KernelVPN Diagnostic Report',
        });
      }
    } catch (error: unknown) {
      console.warn('[Diagnostics] Failed to copy report', error);
      Alert.alert('Copy Error', 'Failed to generate diagnostic report.');
    } finally {
      setSharing(false);
    }
  }, [diagnostics]);

  const handleClearLogs = useCallback(() => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all active log entries from the temporary ring buffer?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearLogs();
            Alert.alert('Success', 'Ring buffer cleared successfully.');
          },
        },
      ],
    );
  }, []);

  const handleExportJson = useCallback(() => {
    try {
      const json = appLogger.exportAsJson();
      if (Clipboard && typeof Clipboard.setString === 'function') {
        Clipboard.setString(json);
        Alert.alert(
          'Debug Bundle Exported',
          'Full JSON debug bundle copied to clipboard. Share it with the developer.',
        );
      } else {
        Share.share({
          message: json,
          title: 'KernelVPN Debug Bundle',
        });
      }
    } catch (error: unknown) {
      console.warn('[Diagnostics] Failed to export JSON', error);
      Alert.alert('Export Error', 'Failed to generate debug bundle.');
    }
  }, []);

  const handleCopyLogItem = useCallback((item: LogEvent) => {
    const text = `[${new Date(item.timestamp).toLocaleTimeString()}] [${item.level.toUpperCase()}] [${item.source}] ${item.message}${
      item.details ? `\nDetails: ${JSON.stringify(item.details, null, 2)}` : ''
    }`;
    if (Clipboard && typeof Clipboard.setString === 'function') {
      Clipboard.setString(text);
      Alert.alert('Copied', 'Sanitized log event copied to clipboard!');
    } else {
      Share.share({message: text});
    }
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  const formatted = useMemo(() => {
    return diagnostics ? formatDiagnostics(diagnostics) : [];
  }, [diagnostics]);

  const getSectionItems = useCallback((labels: string[]) => {
    return formatted.filter(item => labels.includes(item.label));
  }, [formatted]);

  // Grouped status elements
  const appSection = getSectionItems(['Device', 'Core Integrated', 'Snapshot Time']);
  const vpnSection = getSectionItems([
    'VPN Permission',
    'VPN Service',
    'VPN Core',
    'Wake Lock',
    'Underlying Networks',
  ]);
  const connectionSection = getSectionItems(['Active Profile', 'Protocol', 'Last Error', 'Last Core Error', 'Last Connection Error']);
  const splitSection = getSectionItems(['Split Tunnel']);
  const panelSection = getSectionItems(['3X-UI Panel', 'Panel Xray', 'Panel Server']);
  const warningsSection = getSectionItems(['Battery Warning']);

  // Filter & sort logs
  const filteredLogs = logs.filter(item => {
    const levelMatch = selectedLevel === 'all' || item.level === selectedLevel;
    const sourceMatch = selectedSource === 'all' || item.source === selectedSource;
    return levelMatch && sourceMatch;
  });

  const sortedLogs = newestFirst ? filteredLogs : [...filteredLogs].reverse();

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={[styles.backText, {color: theme.colors.primary}]}>
            Back
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          Diagnostics
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Premium Segmented Tab Selector */}
      <View style={[styles.tabsContainer, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                isActive && [styles.activeTabButton, {backgroundColor: theme.colors.primarySoft}],
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.82}>
              <Text
                style={[
                  styles.tabText,
                  isActive
                    ? [styles.activeTabText, {color: theme.colors.primary}]
                    : {color: theme.colors.secondaryText},
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'system' ? (
          /* SYSTEM INFO TAB */
          <View>
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
              <View>
                {/* 1. App & Device Section */}
                {appSection.length > 0 && (
                  <DiagnosticSection title="App & Device Info" theme={theme}>
                    {appSection.map((item, index) => (
                      <DiagnosticRow
                        key={item.label}
                        theme={theme}
                        label={item.label}
                        value={item.value}
                        isWarning={item.isWarning}
                        withBorder={index < appSection.length - 1}
                      />
                    ))}
                  </DiagnosticSection>
                )}

                {/* 2. VPN Core Service Section */}
                {vpnSection.length > 0 && (
                  <DiagnosticSection title="VPN Native Service State" theme={theme}>
                    {vpnSection.map((item, index) => (
                      <DiagnosticRow
                        key={item.label}
                        theme={theme}
                        label={item.label}
                        value={item.value}
                        isWarning={item.isWarning}
                        withBorder={index < vpnSection.length - 1}
                      />
                    ))}
                  </DiagnosticSection>
                )}

                {/* 3. Active Connection Profile Section */}
                {connectionSection.length > 0 && (
                  <DiagnosticSection title="Active Connection Details" theme={theme}>
                    {connectionSection.map((item, index) => (
                      <DiagnosticRow
                        key={item.label}
                        theme={theme}
                        label={item.label}
                        value={item.value}
                        isWarning={item.isWarning}
                        withBorder={index < connectionSection.length - 1}
                      />
                    ))}
                  </DiagnosticSection>
                )}

                {/* 4. Split Tunneling Section */}
                {splitSection.length > 0 && (
                  <DiagnosticSection title="Split Tunneling Config" theme={theme}>
                    {splitSection.map((item, index) => (
                      <DiagnosticRow
                        key={item.label}
                        theme={theme}
                        label={item.label}
                        value={item.value}
                        isWarning={item.isWarning}
                        withBorder={index < splitSection.length - 1}
                      />
                    ))}
                  </DiagnosticSection>
                )}

                {/* 5. 3X-UI Panel Integration Section */}
                {panelSection.length > 0 && (
                  <DiagnosticSection title="3X-UI Panel Synced Stats" theme={theme}>
                    {panelSection.map((item, index) => (
                      <DiagnosticRow
                        key={item.label}
                        theme={theme}
                        label={item.label}
                        value={item.value}
                        isWarning={item.isWarning}
                        withBorder={index < panelSection.length - 1}
                      />
                    ))}
                  </DiagnosticSection>
                )}

                {/* 6. Active Device Warnings Section */}
                {warningsSection.length > 0 && (
                  <DiagnosticSection title="Active Device Warnings" theme={theme}>
                    {warningsSection.map((item, index) => (
                      <DiagnosticRow
                        key={item.label}
                        theme={theme}
                        label={item.label}
                        value={item.value}
                        isWarning={item.isWarning}
                        withBorder={index < warningsSection.length - 1}
                      />
                    ))}
                  </DiagnosticSection>
                )}
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

            {/* Battery Warning Settings Notes Card */}
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
          </View>
        ) : activeTab === 'logs' ? (
          /* LOG EXPLORER TAB */
          <View style={styles.logTabContainer}>
            {/* Top Log Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {backgroundColor: theme.colors.primary},
                ]}
                onPress={() => handleCopyReport(false)}
                disabled={sharing}
                activeOpacity={0.82}>
                <Text style={styles.actionButtonText}>Copy Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {backgroundColor: theme.colors.primarySoft, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.primary},
                ]}
                onPress={() => handleCopyReport(true)}
                disabled={sharing}
                activeOpacity={0.82}>
                <Text style={[styles.actionButtonText, {color: theme.colors.primary}]}>Copy Errors</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {backgroundColor: theme.colors.dangerSoft, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.danger},
                ]}
                onPress={handleClearLogs}
                activeOpacity={0.82}>
                <Text style={[styles.actionButtonText, {color: theme.colors.danger}]}>Clear Logs</Text>
              </TouchableOpacity>
            </View>

            {/* Level Filter Horizontal Pills */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, {color: theme.colors.secondaryText}]}>Level Filter:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}>
                {LEVELS.map(level => {
                  const isActive = selectedLevel === level.id;
                  return (
                    <TouchableOpacity
                      key={level.id}
                      style={[
                        styles.filterPill,
                        {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator},
                        isActive && [styles.activeFilterPill, {backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary}],
                      ]}
                      onPress={() => setSelectedLevel(level.id)}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.filterPillText,
                          {color: theme.colors.secondaryText},
                          isActive && [styles.activeFilterPillText, {color: theme.colors.primary}],
                        ]}>
                        {level.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Source Filter Horizontal Pills */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, {color: theme.colors.secondaryText}]}>Source Filter:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}>
                {SOURCES.map(source => {
                  const isActive = selectedSource === source.id;
                  return (
                    <TouchableOpacity
                      key={source.id}
                      style={[
                        styles.filterPill,
                        {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator},
                        isActive && [styles.activeFilterPill, {backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary}],
                      ]}
                      onPress={() => setSelectedSource(source.id)}
                      activeOpacity={0.8}>
                      <Text
                        style={[
                          styles.filterPillText,
                          {color: theme.colors.secondaryText},
                          isActive && [styles.activeFilterPillText, {color: theme.colors.primary}],
                        ]}>
                        {source.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Sort Toggle & Count Info */}
            <View style={styles.sortToggleRow}>
              <Text style={[styles.resultsCountText, {color: theme.colors.tertiaryText}]}>
                Showing {sortedLogs.length} of {logs.length} event(s)
              </Text>
              <TouchableOpacity
                style={[styles.sortToggle, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}
                onPress={() => setNewestFirst(!newestFirst)}
                activeOpacity={0.8}>
                <Text style={[styles.sortToggleText, {color: theme.colors.secondaryText}]}>
                  Sort: {newestFirst ? 'Newest First ▾' : 'Oldest First ▴'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filtered Logs List */}
            <View style={styles.logList}>
              {sortedLogs.length > 0 ? (
                sortedLogs.map(item => {
                  // Style logic based on log level
                  let cardBg = theme.colors.surface;
                  let cardBorder = theme.colors.separator;
                  let badgeBg = theme.colors.background;
                  let badgeText = theme.colors.secondaryText;

                  if (item.level === 'error') {
                    cardBg = theme.colors.dangerSoft;
                    cardBorder = theme.colors.danger;
                    badgeBg = theme.colors.danger;
                    badgeText = '#FFFFFF';
                  } else if (item.level === 'warn') {
                    cardBg = theme.colors.warningSoft;
                    cardBorder = theme.colors.warning;
                    badgeBg = theme.colors.warning;
                    badgeText = '#000000';
                  } else if (item.level === 'info') {
                    cardBg = theme.colors.primarySoft;
                    cardBorder = theme.colors.primary;
                    badgeBg = theme.colors.primary;
                    badgeText = '#FFFFFF';
                  }

                  const timeStr = new Date(item.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.logItem,
                        {
                          backgroundColor: cardBg,
                          borderColor: cardBorder,
                        },
                      ]}
                      onPress={() => handleCopyLogItem(item)}
                      activeOpacity={0.75}>
                      <View style={styles.logHeader}>
                        <View
                          style={[
                            styles.logLevelBadge,
                            {backgroundColor: badgeBg},
                          ]}>
                          <Text style={[styles.logLevelBadgeText, {color: badgeText}]}>
                            {item.level.toUpperCase()}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.logSourceBadge,
                            {backgroundColor: theme.colors.elevated, borderColor: theme.colors.separator},
                          ]}>
                          <Text style={[styles.logSourceBadgeText, {color: theme.colors.secondaryText}]}>
                            {item.source}
                          </Text>
                        </View>
                        <Text style={[styles.logTime, {color: theme.colors.tertiaryText}]}>
                          {timeStr}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.logMessage,
                          {color: item.level === 'debug' ? theme.colors.secondaryText : theme.colors.text},
                        ]}>
                        {item.message}
                      </Text>
                      {item.code && (
                        <Text style={[styles.logCode, {color: theme.colors.primary}]}>
                          Code: {item.code}
                        </Text>
                      )}
                      {item.details && (
                        <Text style={[styles.logDetailsText, {color: theme.colors.tertiaryText}]}>
                          Details: {JSON.stringify(item.details)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
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
                    No logs found matching selected filters.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* NETWORK TAB */
          <View style={styles.logTabContainer}>
            <NetworkTab
              theme={theme}
              diagnostics={diagnostics}
              onExportJson={handleExportJson}
              onRefresh={handleRefresh}
              loading={loading}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DiagnosticSection({
  title,
  theme,
  children,
}: {
  title: string;
  theme: AppTheme;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, {color: theme.colors.secondaryText}]}>
        {title}
      </Text>
      <View
        style={[
          styles.resultsCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.separator,
          },
        ]}>
        {children}
      </View>
    </View>
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
              ? theme.colors.danger
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
            {color: isWarning ? theme.colors.danger : theme.colors.text},
          ]}
          numberOfLines={6}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/**
 * NetworkTab — Shows DNS configuration, connection quality, and export button.
 */
function NetworkTab({
  theme,
  diagnostics,
  onExportJson,
  onRefresh,
  loading,
}: {
  theme: AppTheme;
  diagnostics: VpnDiagnosticResult | null;
  onExportJson: () => void;
  onRefresh: () => void;
  loading: boolean;
}): React.JSX.Element {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isConnected = diagnostics?.serviceRunning && diagnostics?.coreRunning;
  const [leakIp, setLeakIp] = useState<string | null>(null);
  const [leakLoading, setLeakLoading] = useState(false);

  const runLeakTest = async () => {
    setLeakLoading(true);
    setLeakIp(null);
    try {
      const res = await fetch('https://dns.google/resolve?name=whoami.akamai.net&type=A');
      const data = await res.json();
      if (data && data.Answer && data.Answer.length > 0) {
        setLeakIp(data.Answer[0].data);
      } else {
        setLeakIp('Failed to resolve IP');
      }
    } catch (e) {
      setLeakIp('Network error');
    } finally {
      setLeakLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isConnected, pulseAnim]);

  return (
    <View>
      {/* Connection Quality Indicator */}
      <View
        style={[
          styles.networkCard,
          {
            backgroundColor: theme.isDark
              ? 'rgba(255,255,255,0.03)'
              : theme.colors.surface,
            borderColor: theme.colors.separator,
          },
        ]}>
        <View style={styles.networkQualityRow}>
          <Animated.View
            style={[
              styles.qualityDot,
              {
                backgroundColor: isConnected
                  ? theme.colors.success
                  : theme.colors.tertiaryText,
                transform: [{scale: pulseAnim}],
              },
            ]}
          />
          <View style={styles.qualityTextWrap}>
            <Text
              style={[
                styles.qualityTitle,
                {color: theme.colors.text, fontFamily: theme.fonts.bold},
              ]}>
              {isConnected ? 'Tunnel Active' : 'Tunnel Offline'}
            </Text>
            <Text
              style={[
                styles.qualitySubtitle,
                {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium},
              ]}>
              {isConnected
                ? 'All DNS queries routed through proxy'
                : 'Connect to start encrypted routing'}
            </Text>
          </View>
        </View>
      </View>

      {/* DNS Configuration Card */}
      <View
        style={[
          styles.networkCard,
          {
            backgroundColor: theme.isDark
              ? 'rgba(255,255,255,0.03)'
              : theme.colors.surface,
            borderColor: theme.colors.separator,
          },
        ]}>
        <Text
          style={[
            styles.networkSectionTitle,
            {color: theme.colors.secondaryText, fontFamily: theme.fonts.semiBold},
          ]}>
          DNS Configuration
        </Text>
        <View style={styles.dnsRow}>
          <View
            style={[
              styles.dnsBadge,
              {backgroundColor: theme.colors.primarySoft},
            ]}>
            <Text
              style={[
                styles.dnsBadgeText,
                {color: theme.colors.primary, fontFamily: theme.fonts.bold},
              ]}>
              PRIMARY
            </Text>
          </View>
          <Text
            style={[
              styles.dnsServer,
              {color: theme.colors.text, fontFamily: theme.fonts.mono},
            ]}>
            8.8.8.8 (Google DoH)
          </Text>
        </View>
        <View style={styles.dnsRow}>
          <View
            style={[
              styles.dnsBadge,
              {backgroundColor: theme.colors.warningSoft},
            ]}>
            <Text
              style={[
                styles.dnsBadgeText,
                {color: theme.colors.warning, fontFamily: theme.fonts.bold},
              ]}>
              FALLBACK
            </Text>
          </View>
          <Text
            style={[
              styles.dnsServer,
              {color: theme.colors.text, fontFamily: theme.fonts.mono},
            ]}>
            1.1.1.1 (Cloudflare DoH)
          </Text>
        </View>
        <Text
          style={[
            styles.dnsNote,
            {color: theme.colors.tertiaryText, fontFamily: theme.fonts.regular},
          ]}>
          All DNS queries are encrypted and routed through the VPN tunnel (detour: proxy). No DNS leaks possible.
        </Text>
      </View>

      {/* Device Info */}
      {diagnostics && (
        <View
          style={[
            styles.networkCard,
            {
              backgroundColor: theme.isDark
                ? 'rgba(255,255,255,0.03)'
                : theme.colors.surface,
              borderColor: theme.colors.separator,
            },
          ]}>
          <Text
            style={[
              styles.networkSectionTitle,
              {color: theme.colors.secondaryText, fontFamily: theme.fonts.semiBold},
            ]}>
            Device Info
          </Text>
          <Text
            style={[
              styles.deviceInfo,
              {color: theme.colors.text, fontFamily: theme.fonts.mono},
            ]}>
            {diagnostics.androidVersion || 'Unknown Android'}
          </Text>
          <Text
            style={[
              styles.deviceInfo,
              {color: theme.colors.secondaryText, fontFamily: theme.fonts.mono},
            ]}>
            {diagnostics.deviceManufacturer || ''} {diagnostics.deviceModel || ''}
          </Text>
        </View>
      )}

      {/* DNS Leak Test */}
      <View
        style={[
          styles.networkCard,
          {
            backgroundColor: theme.isDark
              ? 'rgba(255,255,255,0.03)'
              : theme.colors.surface,
            borderColor: theme.colors.separator,
          },
        ]}>
        <Text
          style={[
            styles.networkSectionTitle,
            {color: theme.colors.secondaryText, fontFamily: theme.fonts.semiBold},
          ]}>
          DNS Leak Test
        </Text>
        <Text
          style={[
            styles.dnsNote,
            {color: theme.colors.tertiaryText, fontFamily: theme.fonts.regular, marginBottom: 10},
          ]}>
          Find out which IP address your DNS requests are originating from. If it matches your VPN IP, your DNS is secure.
        </Text>
        
        {leakIp && (
          <View style={{marginBottom: 10, padding: 10, backgroundColor: theme.colors.primarySoft, borderRadius: 8}}>
            <Text style={{color: theme.colors.primary, fontFamily: theme.fonts.bold, fontSize: 13}}>
              Detected DNS IP:
            </Text>
            <Text style={{color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: 16, marginTop: 4}}>
              {leakIp}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.exportButton,
            {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={runLeakTest}
          disabled={leakLoading}
          activeOpacity={0.82}>
          <Text
            style={[
              styles.exportButtonText,
              {color: theme.colors.primary, fontFamily: theme.fonts.bold},
            ]}>
            {leakLoading ? '⏳ Testing...' : '🔍 Run DNS Leak Test'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Export Buttons */}
      <View style={styles.networkActions}>
        <TouchableOpacity
          style={[
            styles.exportButton,
            {backgroundColor: theme.colors.primary},
          ]}
          onPress={onExportJson}
          activeOpacity={0.82}>
          <Text style={[styles.exportButtonText, {fontFamily: theme.fonts.bold}]}>
            📋 Export Full Debug Bundle (JSON)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.exportButton,
            {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={onRefresh}
          disabled={loading}
          activeOpacity={0.82}>
          <Text
            style={[
              styles.exportButtonText,
              {color: theme.colors.primary, fontFamily: theme.fonts.bold},
            ]}>
            {loading ? '⏳ Refreshing…' : '🔄 Refresh Network Data'}
          </Text>
        </TouchableOpacity>
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
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
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
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    fontWeight: '800',
  },
  refreshButton: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
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
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 4,
  },
  logTabContainer: {
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 16,
    marginBottom: 6,
  },
  filterScroll: {
    paddingHorizontal: 12,
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  activeFilterPill: {
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterPillText: {
    fontWeight: '800',
  },
  sortToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortToggle: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logList: {
    marginHorizontal: 16,
  },
  logItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logLevelBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  logLevelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logSourceBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: 6,
  },
  logSourceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  logMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  logCode: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  logDetailsText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // Network tab styles
  networkCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  networkQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 14,
  },
  qualityTextWrap: {
    flex: 1,
  },
  qualityTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  qualitySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  networkSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  dnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dnsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  dnsBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dnsServer: {
    fontSize: 13,
    flex: 1,
  },
  dnsNote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  deviceInfo: {
    fontSize: 13,
    marginBottom: 4,
  },
  networkActions: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  exportButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
