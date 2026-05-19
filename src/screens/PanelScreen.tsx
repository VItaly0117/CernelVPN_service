/**
 * PanelScreen — 3X-UI panel connection and server controls.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type {PanelSettings} from '../types/vpn';
import {useVpnStore, vpnStore} from '../store/vpnStore';
import {useResolvedTheme, type AppTheme} from '../theme/theme';
import {
  createXuiPanelClient,
  extractVlessProfilesFromInbounds,
  normalizePanelSettings,
  summarizeServerStatus,
  type PanelServerStatus,
} from '../services/xuiPanelService';

interface Props {
  onBack: () => void;
}

type LoadingAction = 'test' | 'import' | 'restart' | 'stop' | null;

export function PanelScreen({onBack}: Props): React.JSX.Element {
  const state = useVpnStore();
  const theme = useResolvedTheme(state.themeMode);
  const [panelUrl, setPanelUrl] = useState(
    state.panelSettings?.panelUrl ?? '',
  );
  const [username, setUsername] = useState(
    state.panelSettings?.username ?? '',
  );
  const [password, setPassword] = useState(
    state.panelSettings?.password ?? '',
  );
  const [sessionCookie, setSessionCookie] = useState(
    state.panelSettings?.sessionCookie ?? '',
  );
  const [serverStatus, setServerStatus] =
    useState<PanelServerStatus | null>(null);
  const [inboundCount, setInboundCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);

  const buildSettings = useCallback((): PanelSettings => {
    const settings: PanelSettings = {
      panelUrl: panelUrl.trim(),
      username: username.trim() || undefined,
      password: password || undefined,
      sessionCookie: sessionCookie.trim() || undefined,
      lastStatusAt: state.panelSettings?.lastStatusAt ?? null,
    };
    normalizePanelSettings(settings);
    return settings;
  }, [
    panelUrl,
    password,
    sessionCookie,
    state.panelSettings?.lastStatusAt,
    username,
  ]);

  const runPanelAction = useCallback(
    async (
      action: LoadingAction,
      task: () => Promise<void>,
    ): Promise<void> => {
      setLoadingAction(action);
      setError(null);
      setMessage(null);
      try {
        await task();
      } catch (err: unknown) {
        setError(errorMessage(err));
      } finally {
        setLoadingAction(null);
      }
    },
    [],
  );

  const normalizedPreview = useMemo(() => {
    if (!panelUrl.trim()) {
      return null;
    }
    try {
      return normalizePanelSettings(buildSettings());
    } catch {
      return null;
    }
  }, [buildSettings, panelUrl]);

  const summary = serverStatus ? summarizeServerStatus(serverStatus) : null;

  const saveSettings = useCallback(
    (overrides: Partial<PanelSettings> = {}) => {
      const nextSettings = {
        ...buildSettings(),
        ...overrides,
      };
      vpnStore.setPanelSettings(nextSettings);
      if (nextSettings.sessionCookie) {
        setSessionCookie(nextSettings.sessionCookie);
      }
      return nextSettings;
    },
    [buildSettings],
  );

  const handleSave = useCallback(() => {
    try {
      saveSettings();
      setError(null);
      setMessage('Panel settings saved');
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  }, [saveSettings]);

  const handleTestConnection = useCallback(async () => {
    await runPanelAction('test', async () => {
      const settings = saveSettings();
      const client = createXuiPanelClient(settings);
      const cookie = await refreshSession(client, settings);
      const status = await client.getServerStatus();
      setServerStatus(status);
      await refreshInboundCount(client, setInboundCount);
      saveSettings({
        sessionCookie: cookie ?? client.getSessionCookie(),
        lastStatusAt: Date.now(),
      });
      setMessage('Panel connection is active');
    });
  }, [runPanelAction, saveSettings]);

  const handleImportProfiles = useCallback(async () => {
    await runPanelAction('import', async () => {
      const settings = saveSettings();
      const normalized = normalizePanelSettings(settings);
      const client = createXuiPanelClient(settings);
      const cookie = await refreshSession(client, settings);
      const inbounds = await client.getInbounds();
      const profiles = extractVlessProfilesFromInbounds(
        inbounds,
        normalized.hostname,
      );
      setInboundCount(inbounds.length);
      saveSettings({
        sessionCookie: cookie ?? client.getSessionCookie(),
        lastStatusAt: Date.now(),
      });

      if (profiles.length === 0) {
        Alert.alert('No VLESS Profiles', 'No enabled VLESS clients were found.');
        return;
      }

      profiles.forEach(profile => vpnStore.addProfile(profile));
      vpnStore.setActiveProfile(profiles[0]);
      Alert.alert(
        'Profiles Imported',
        `Imported ${profiles.length} VLESS profile${
          profiles.length === 1 ? '' : 's'
        } from 3X-UI.`,
      );
      setMessage(`${profiles.length} profile(s) imported`);
    });
  }, [runPanelAction, saveSettings]);

  const handleRestartXray = useCallback(() => {
    Alert.alert('Restart Xray?', 'This will restart Xray on the server.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Restart',
        style: 'destructive',
        onPress: () => {
          runPanelAction('restart', async () => {
            const settings = saveSettings();
            const client = createXuiPanelClient(settings);
            const cookie = await refreshSession(client, settings);
            await client.restartXrayService();
            saveSettings({
              sessionCookie: cookie ?? client.getSessionCookie(),
              lastStatusAt: Date.now(),
            });
            setMessage('Xray restart requested');
          });
        },
      },
    ]);
  }, [runPanelAction, saveSettings]);

  const handleStopXray = useCallback(() => {
    Alert.alert('Stop Xray?', 'This will stop Xray on the server.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Stop',
        style: 'destructive',
        onPress: () => {
          runPanelAction('stop', async () => {
            const settings = saveSettings();
            const client = createXuiPanelClient(settings);
            const cookie = await refreshSession(client, settings);
            await client.stopXrayService();
            saveSettings({
              sessionCookie: cookie ?? client.getSessionCookie(),
              lastStatusAt: Date.now(),
            });
            setMessage('Xray stop requested');
          });
        },
      },
    ]);
  }, [runPanelAction, saveSettings]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={[styles.backText, {color: theme.colors.primary}]}>
                Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, {color: theme.colors.text}]}>
              3X-UI Panel
            </Text>
            <View style={styles.backButton} />
          </View>

          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
              },
            ]}>
            <Text style={[styles.heroLabel, {color: theme.colors.tertiaryText}]}>
              Remote dashboard
            </Text>
            <Text style={[styles.heroTitle, {color: theme.colors.text}]}>
              {normalizedPreview?.hostname ?? 'Not configured'}
            </Text>
            <Text
              style={[styles.heroSubtitle, {color: theme.colors.secondaryText}]}
              numberOfLines={1}
              ellipsizeMode="middle">
              {normalizedPreview?.webBasePath ?? '/'}
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
              },
            ]}>
            <InputField
              theme={theme}
              label="Panel URL"
              value={panelUrl}
              onChangeText={setPanelUrl}
              placeholder="http://server:port/base/"
              autoCapitalize="none"
              keyboardType="url"
            />
            <InputField
              theme={theme}
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              autoCapitalize="none"
            />
            <InputField
              theme={theme}
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
            />
            <InputField
              theme={theme}
              label="Session cookie"
              value={sessionCookie}
              onChangeText={setSessionCookie}
              placeholder="session=..."
              autoCapitalize="none"
            />
            <View style={styles.buttonRow}>
              <PanelButton
                theme={theme}
                label="Save"
                onPress={handleSave}
                disabled={!panelUrl.trim() || loadingAction !== null}
                variant="secondary"
              />
              <PanelButton
                theme={theme}
                label="Test"
                onPress={handleTestConnection}
                disabled={!panelUrl.trim() || loadingAction !== null}
                loading={loadingAction === 'test'}
              />
            </View>
          </View>

          {(message || error) && (
            <View
              style={[
                styles.messageCard,
                {
                  backgroundColor: error
                    ? theme.colors.dangerSoft
                    : theme.colors.successSoft,
                  borderColor: error ? theme.colors.danger : theme.colors.success,
                },
              ]}>
              <Text
                style={[
                  styles.messageText,
                  {color: error ? theme.colors.danger : theme.colors.success},
                ]}>
                {error ?? message}
              </Text>
            </View>
          )}

          {summary && (
            <View style={styles.metricsGrid}>
              <MetricCard
                theme={theme}
                label="Xray"
                value={summary.xrayLabel}
                detail={summary.xrayVersion}
              />
              <MetricCard
                theme={theme}
                label="CPU"
                value={summary.cpuLabel}
                detail={`Cores ${serverStatus?.cpuCores ?? 'N/A'}`}
              />
              <MetricCard
                theme={theme}
                label="Memory"
                value={summary.memoryLabel}
              />
              <MetricCard
                theme={theme}
                label="Disk"
                value={summary.diskLabel}
              />
              <MetricCard
                theme={theme}
                label="Traffic"
                value={summary.netIoLabel}
                detail={summary.totalTrafficLabel}
              />
              <MetricCard
                theme={theme}
                label="Connections"
                value={summary.connectionsLabel}
                detail={summary.uptimeLabel}
              />
            </View>
          )}

          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
              },
            ]}>
            <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
              Panel actions
            </Text>
            <StatusLine
              theme={theme}
              label="Inbounds"
              value={inboundCount === null ? 'Unknown' : String(inboundCount)}
            />
            <StatusLine
              theme={theme}
              label="Saved profiles"
              value={String(state.savedProfiles.length)}
            />
            <View style={styles.buttonStack}>
              <PanelButton
                theme={theme}
                label="Import VLESS"
                onPress={handleImportProfiles}
                disabled={!panelUrl.trim() || loadingAction !== null}
                loading={loadingAction === 'import'}
              />
              <View style={styles.buttonRow}>
                <PanelButton
                  theme={theme}
                  label="Restart Xray"
                  onPress={handleRestartXray}
                  disabled={!panelUrl.trim() || loadingAction !== null}
                  loading={loadingAction === 'restart'}
                  variant="secondary"
                />
                <PanelButton
                  theme={theme}
                  label="Stop Xray"
                  onPress={handleStopXray}
                  disabled={!panelUrl.trim() || loadingAction !== null}
                  loading={loadingAction === 'stop'}
                  variant="danger"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

async function refreshSession(
  client: ReturnType<typeof createXuiPanelClient>,
  settings: PanelSettings,
): Promise<string | undefined> {
  if (settings.username && settings.password) {
    return client.login();
  }
  return settings.sessionCookie;
}

async function refreshInboundCount(
  client: ReturnType<typeof createXuiPanelClient>,
  setInboundCount: (count: number | null) => void,
): Promise<void> {
  try {
    const inbounds = await client.getInbounds();
    setInboundCount(inbounds.length);
  } catch {
    setInboundCount(null);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function InputField({
  theme,
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: {
  theme: AppTheme;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'url';
}): React.JSX.Element {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, {color: theme.colors.secondaryText}]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.separator,
            color: theme.colors.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.tertiaryText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function PanelButton({
  theme,
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  theme: AppTheme;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}): React.JSX.Element {
  const background =
    variant === 'danger'
      ? theme.colors.danger
      : variant === 'secondary'
        ? theme.colors.primarySoft
        : theme.colors.primary;
  const textColor = variant === 'secondary' ? theme.colors.primary : '#FFFFFF';
  return (
    <TouchableOpacity
      style={[
        styles.panelButton,
        {backgroundColor: background},
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? theme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <Text style={[styles.panelButtonText, {color: textColor}]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MetricCard({
  theme,
  label,
  value,
  detail,
}: {
  theme: AppTheme;
  label: string;
  value: string;
  detail?: string;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.metricCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.separator,
        },
      ]}>
      <Text style={[styles.metricLabel, {color: theme.colors.tertiaryText}]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, {color: theme.colors.text}]}>
        {value}
      </Text>
      {detail && (
        <Text
          style={[styles.metricDetail, {color: theme.colors.secondaryText}]}
          numberOfLines={2}>
          {detail}
        </Text>
      )}
    </View>
  );
}

function StatusLine({
  theme,
  label,
  value,
}: {
  theme: AppTheme;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={[styles.statusLine, {borderBottomColor: theme.colors.separator}]}>
      <Text style={[styles.statusLabel, {color: theme.colors.secondaryText}]}>
        {label}
      </Text>
      <Text style={[styles.statusValue, {color: theme.colors.text}]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
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
  heroCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 18,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 46,
    paddingHorizontal: 13,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonStack: {
    gap: 10,
    marginTop: 14,
  },
  panelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  panelButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.48,
  },
  messageCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  metricCard: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
  },
  metricDetail: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 4,
  },
  statusLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '800',
  },
});
