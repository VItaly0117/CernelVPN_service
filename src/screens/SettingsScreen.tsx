import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Switch,
  Alert,
  NativeModules,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useVpnStore, vpnStore} from '../store/vpnStore';
import {useResolvedTheme} from '../theme/theme';
import {androidHeaderTopPadding} from '../services/layoutService';
import type {AppScreenName} from '../services/navigationService';
import {LANG_OPTIONS} from '../locales/i18n';
import {useTranslation} from 'react-i18next';
import {DocumentationModal} from '../components/DocumentationModal';
import {SpeedTestModal} from '../components/SpeedTestModal';

interface SettingsScreenProps {
  onNavigate: (screen: AppScreenName) => void;
}

export function SettingsScreen({onNavigate}: SettingsScreenProps) {
  const {t} = useTranslation();
  const {themeMode, language, panelSettings, autoConnect, killSwitchEnabled, bypassLan} = useVpnStore();
  const theme = useResolvedTheme(themeMode);
  const [showDocs, setShowDocs] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [stealthMode, setStealthMode] = useState(false);

  const panelConfigured = Boolean(panelSettings?.panelUrl && panelSettings?.username);

  // Device info
  const osName = Platform.OS === 'android' ? 'Android' : 'iOS';
  const osVersion = Platform.Version;

  const cardStyle = {
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={[styles.header, {borderColor: theme.colors.separator}]}>
        <Text style={[styles.title, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
          {t('settings.title', 'Settings')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── DEVICE PARAMETERS ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {t('settings.device_parameters', 'DEVICE PARAMETERS')}
          </Text>
          <View style={[styles.card, cardStyle]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, {color: theme.colors.secondaryText}]}>
                {t('settings.operating_system', 'Operating System')}
              </Text>
              <Text style={[styles.infoValue, {color: theme.colors.text}]}>{osName} {osVersion}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, {color: theme.colors.secondaryText}]}>
                {t('settings.app_version', 'App Version')}
              </Text>
              <Text style={[styles.infoValue, {color: theme.colors.text}]}>KernelVPN 2.6-PRO</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, {color: theme.colors.secondaryText}]}>
                {t('settings.device_status', 'Device Status')}
              </Text>
              <Text style={[styles.infoValue, {color: theme.colors.primary}]}>
                {t('settings.optimized', 'Optimized')}
              </Text>
            </View>
          </View>
        </View>

        {/* ── GENERAL ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {t('settings.general', 'GENERAL')}
          </Text>
          <View style={[styles.card, cardStyle]}>
            {/* Diagnostics */}
            <TouchableOpacity style={styles.settingRow} onPress={() => onNavigate('Diagnostics')} activeOpacity={0.7}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="stethoscope" size={24} color={theme.colors.primary} />
                <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                  {t('settings.diagnostics', 'Diagnostics')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.secondaryText} />
            </TouchableOpacity>

            {/* Event Log */}
            <TouchableOpacity style={styles.settingRow} onPress={() => onNavigate('EventLog')} activeOpacity={0.7}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="format-list-text" size={24} color={theme.colors.primary} />
                <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                  {t('settings.event_log', 'Event Log')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.secondaryText} />
            </TouchableOpacity>

            {/* System Blueprints */}
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowDocs(true)} activeOpacity={0.7}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                  {t('settings.system_blueprints', 'System Blueprints')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.secondaryText} />
            </TouchableOpacity>

            {/* Speed Test */}
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowSpeed(true)} activeOpacity={0.7}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="speedometer" size={24} color={theme.colors.primary} />
                <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                  {t('settings.speed_test', 'Speed Test')}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PREFERENCES ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {t('settings.preferences', 'PREFERENCES')}
          </Text>
          <View style={[styles.card, cardStyle]}>

            {/* Language */}
            <View style={styles.inlineOptionRow}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="translate" size={24} color={theme.colors.primary} />
                <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                  {t('settings.language', 'Language')}
                </Text>
              </View>
              <View style={styles.segmentedControl}>
                {LANG_OPTIONS.map(option => {
                  const isActive = language === option.code;
                  return (
                    <TouchableOpacity
                      key={option.code}
                      style={[styles.segmentButton, isActive && {backgroundColor: theme.colors.primary}]}
                      onPress={() => vpnStore.setLanguage(option.code)}
                      activeOpacity={0.8}>
                      <Text style={[styles.segmentText, {color: isActive ? '#FFFFFF' : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Theme */}
            <View style={styles.inlineOptionRow}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="theme-light-dark" size={24} color={theme.colors.primary} />
                <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                  {t('settings.theme', 'Theme')}
                </Text>
              </View>
              <View style={styles.segmentedControl}>
                {(['system', 'light', 'dark', 'amoled'] as const).map(mode => {
                  const isActive = themeMode === mode;
                  const label =
                    mode === 'system' ? t('settings.auto', 'Auto') :
                    mode === 'light' ? t('settings.light', 'Light') :
                    mode === 'dark' ? t('settings.dark', 'Dark') :
                    t('settings.amoled', 'Amoled');
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.segmentButton, isActive && {backgroundColor: theme.colors.primary}]}
                      onPress={() => vpnStore.setThemeMode(mode)}
                      activeOpacity={0.8}>
                      <Text style={[styles.segmentText, {color: isActive ? '#FFFFFF' : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Auto-connect */}
            <View style={[styles.settingRow, {justifyContent: 'space-between'}]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="play-circle-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                  {t('settings.auto_connect', 'Auto-connect')}
                </Text>
              </View>
              <Switch
                value={autoConnect ?? false}
                onValueChange={val => vpnStore.setAutoConnect(val)}
                trackColor={{false: theme.colors.separator, true: theme.colors.primary}}
                thumbColor={autoConnect ? '#FFFFFF' : theme.colors.secondaryText}
              />
            </View>

            {/* Kill Switch */}
            <View style={[styles.settingRow, {justifyContent: 'space-between', marginTop: 10}]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="shield-lock-outline" size={24} color={theme.colors.danger} />
                <View>
                  <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                    {t('settings.kill_switch', 'Kill Switch')}
                  </Text>
                  <Text style={{color: theme.colors.secondaryText, fontSize: 12, fontFamily: theme.fonts.regular}}>
                    {t('settings.kill_switch_desc', 'Block network when VPN disconnects')}
                  </Text>
                </View>
              </View>
              <Switch
                value={killSwitchEnabled ?? false}
                onValueChange={val => vpnStore.setKillSwitchEnabled(val)}
                trackColor={{false: theme.colors.separator, true: theme.colors.danger}}
                thumbColor={killSwitchEnabled ? '#FFFFFF' : theme.colors.secondaryText}
              />
            </View>

            {/* Stealth Mode */}
            <View style={[styles.settingRow, {justifyContent: 'space-between', marginTop: 10}]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="incognito" size={24} color={theme.colors.primary} />
                <View>
                  <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                    {t('settings.stealth_mode', 'Stealth Mode')}
                  </Text>
                  <Text style={{color: theme.colors.secondaryText, fontSize: 12, fontFamily: theme.fonts.regular}}>
                    {t('settings.stealth_mode_desc', 'Mask app icon as a Calculator')}
                  </Text>
                </View>
              </View>
              <Switch
                value={stealthMode}
                onValueChange={async (val) => {
                  setStealthMode(val);
                  try {
                    const AppIconManager = NativeModules.AppIconManager;
                    if (AppIconManager) {
                      await AppIconManager.changeIcon(val ? 'Calculator' : 'Default');
                      Alert.alert('App Icon Changed', 'The app icon will change shortly. The app might momentarily close during this process.');
                    }
                  } catch (e: any) {
                    Alert.alert('Error', e.message);
                    setStealthMode(!val);
                  }
                }}
                trackColor={{false: theme.colors.separator, true: theme.colors.primary}}
                thumbColor={stealthMode ? '#FFFFFF' : theme.colors.secondaryText}
              />
            </View>

            {/* Bypass LAN */}
            <View style={[styles.settingRow, {justifyContent: 'space-between', marginTop: 10}]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="lan" size={24} color={theme.colors.success} />
                <View>
                  <Text style={[styles.settingText, {color: theme.colors.text, fontFamily: theme.fonts.medium}]}>
                    {t('settings.bypass_lan', 'Bypass LAN')}
                  </Text>
                  <Text style={{color: theme.colors.secondaryText, fontSize: 12, fontFamily: theme.fonts.regular}}>
                    {t('settings.bypass_lan_desc', 'Allow local network access')}
                  </Text>
                </View>
              </View>
              <Switch
                value={bypassLan ?? false}
                onValueChange={val => vpnStore.setBypassLan(val)}
                trackColor={{false: theme.colors.separator, true: theme.colors.success}}
                thumbColor={bypassLan ? '#FFFFFF' : theme.colors.secondaryText}
              />
            </View>

          </View>
        </View>

      </ScrollView>

      {/* Modals */}
      <DocumentationModal visible={showDocs} onClose={() => setShowDocs(false)} theme={theme} />
      <SpeedTestModal visible={showSpeed} onClose={() => setShowSpeed(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    paddingHorizontal: 20,
    paddingTop: androidHeaderTopPadding(Platform.OS, StatusBar.currentHeight, 0) + 10,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {fontSize: 28},
  scrollContent: {padding: 20, paddingBottom: 100},
  section: {marginBottom: 24},
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  settingRowLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  settingRowRight: {flexDirection: 'row', alignItems: 'center', gap: 6},
  settingText: {fontSize: 16},
  statusText: {fontSize: 14, fontWeight: '600'},
  inlineOptionRow: {
    flexDirection: 'column',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 10,
    padding: 4,
  },
  segmentButton: {flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8},
  segmentText: {fontSize: 13},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  infoLabel: {fontSize: 14},
  infoValue: {fontSize: 14, fontWeight: '700'},
});
