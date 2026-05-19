/**
 * HomeScreen — Main KernelVPN control screen.
 */
import React, {useCallback, useEffect, useState} from 'react';
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
  Modal,
  StatusBar as NativeStatusBar,
} from 'react-native';
import {ConnectionButton} from '../components/ConnectionButton';
import {useVpnStore, vpnStore} from '../store/vpnStore';
import * as vpnService from '../services/vpnService';
import {
  fetchRulesManifest,
  validateRulesManifest,
  applyRulesManifest,
} from '../services/rulesService';
import type {AppTheme, ThemeMode} from '../theme/theme';
import {getStatusColors, useResolvedTheme} from '../theme/theme';
import {androidHeaderTopPadding} from '../services/layoutService';

interface Props {
  onNavigate: (screen: string) => void;
}

const THEME_OPTIONS: Array<{mode: ThemeMode; label: string}> = [
  {mode: 'system', label: 'Auto'},
  {mode: 'light', label: 'Light'},
  {mode: 'dark', label: 'Dark'},
];
const HEADER_TOP_PADDING = androidHeaderTopPadding(
  Platform.OS,
  NativeStatusBar.currentHeight,
  14,
);

export function HomeScreen({onNavigate}: Props): React.JSX.Element {
  const state = useVpnStore();
  const theme = useResolvedTheme(state.themeMode);
  const statusColors = getStatusColors(state.status, theme);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const navigateFromMenu = useCallback(
    (screen: string) => {
      setMenuOpen(false);
      onNavigate(screen);
    },
    [onNavigate],
  );

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <SideMenu
        visible={menuOpen}
        theme={theme}
        themeMode={state.themeMode}
        savedProfilesCount={state.savedProfiles.length}
        enabledSplitRulesCount={
          state.splitTunnelRules.filter(rule => rule.enabled).length
        }
        panelConfigured={Boolean(state.panelSettings)}
        onClose={() => setMenuOpen(false)}
        onNavigate={navigateFromMenu}
        onUpdateRules={handleUpdateRules}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.menuButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
              },
            ]}
            activeOpacity={0.78}
            onPress={() => setMenuOpen(true)}>
            <Text style={[styles.menuButtonText, {color: theme.colors.text}]}>
              ≡
            </Text>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text
              style={[styles.brand, {color: theme.colors.text}]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}>
              KernelVPN
            </Text>
            <Text
              style={[styles.subtitle, {color: theme.colors.secondaryText}]}
              numberOfLines={1}>
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
            <Text
              style={[styles.statusPillText, {color: statusColors.accent}]}
              numberOfLines={1}>
              {state.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <ConnectionButton
            status={state.status}
            theme={theme}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <Text
            style={[styles.heroStatus, {color: theme.colors.secondaryText}]}
            numberOfLines={1}>
            {state.activeProfile?.name ?? 'No active profile'}
          </Text>
          {state.lastError ? (
            <Text
              style={[styles.heroError, {color: theme.colors.danger}]}
              numberOfLines={3}>
              {state.lastError}
            </Text>
          ) : (
            <Text
              style={[styles.heroHint, {color: theme.colors.tertiaryText}]}
              numberOfLines={2}>
              Open the menu for profiles, panel, split tunneling, and diagnostics.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SideMenu({
  visible,
  theme,
  themeMode,
  savedProfilesCount,
  enabledSplitRulesCount,
  panelConfigured,
  onClose,
  onNavigate,
  onUpdateRules,
}: {
  visible: boolean;
  theme: AppTheme;
  themeMode: ThemeMode;
  savedProfilesCount: number;
  enabledSplitRulesCount: number;
  panelConfigured: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onUpdateRules: () => void;
}): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.menuOverlay}>
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.menuPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.separator,
            },
          ]}>
          <View style={styles.menuHeader}>
            <View>
              <Text style={[styles.menuTitle, {color: theme.colors.text}]}>
                KernelVPN
              </Text>
              <Text
                style={[
                  styles.menuSubtitle,
                  {color: theme.colors.secondaryText},
                ]}>
                Control center
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.menuCloseButton,
                {borderColor: theme.colors.separator},
              ]}
              onPress={onClose}
              activeOpacity={0.78}>
              <Text style={[styles.menuCloseText, {color: theme.colors.text}]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuStats}>
            <MenuStat
              label="Profiles"
              value={String(savedProfilesCount)}
              theme={theme}
            />
            <MenuStat
              label="Rules"
              value={String(enabledSplitRulesCount)}
              theme={theme}
            />
            <MenuStat
              label="Panel"
              value={panelConfigured ? 'On' : 'Off'}
              theme={theme}
            />
          </View>

          <Text
            style={[
              styles.menuSectionLabel,
              {color: theme.colors.tertiaryText},
            ]}>
            Theme
          </Text>
          <View
            style={[
              styles.menuThemeGroup,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.separator,
              },
            ]}>
            {THEME_OPTIONS.map(option => {
              const selected = themeMode === option.mode;
              return (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.menuThemeOption,
                    selected && {backgroundColor: theme.colors.primary},
                  ]}
                  activeOpacity={0.78}
                  onPress={() => vpnStore.setThemeMode(option.mode)}>
                  <Text
                    style={[
                      styles.menuThemeText,
                      {
                        color: selected
                          ? '#FFFFFF'
                          : theme.colors.secondaryText,
                      },
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={[
              styles.menuSectionLabel,
              {color: theme.colors.tertiaryText},
            ]}>
            Menu
          </Text>
          <MenuItem
            label="Import Profile"
            value="VLESS, VMess, Trojan, Shadowsocks"
            theme={theme}
            onPress={() => onNavigate('ImportProfile')}
          />
          <MenuItem
            label="3X-UI Panel"
            value="Server status and VLESS import"
            theme={theme}
            onPress={() => onNavigate('Panel')}
          />
          <MenuItem
            label="Split Tunneling"
            value="All apps, selected only, exceptions"
            theme={theme}
            onPress={() => onNavigate('SplitTunneling')}
          />
          <MenuItem
            label="Diagnostics"
            value="Core, VPN, panel and battery state"
            theme={theme}
            onPress={() => onNavigate('Diagnostics')}
          />
          <MenuItem
            label="Update Rules"
            value="Refresh trusted routing rules"
            theme={theme}
            onPress={() => {
              onClose();
              onUpdateRules();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function MenuStat({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: AppTheme;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.menuStat,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.separator,
        },
      ]}>
      <Text style={[styles.menuStatValue, {color: theme.colors.text}]}>
        {value}
      </Text>
      <Text style={[styles.menuStatLabel, {color: theme.colors.tertiaryText}]}>
        {label}
      </Text>
    </View>
  );
}

function MenuItem({
  label,
  value,
  theme,
  onPress,
}: {
  label: string;
  value: string;
  theme: AppTheme;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.separator,
        },
      ]}
      activeOpacity={0.78}
      onPress={onPress}>
      <View style={styles.menuItemTextWrap}>
        <Text style={[styles.menuItemLabel, {color: theme.colors.text}]}>
          {label}
        </Text>
        <Text
          style={[styles.menuItemValue, {color: theme.colors.secondaryText}]}
          numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={[styles.menuItemArrow, {color: theme.colors.tertiaryText}]}>
        ›
      </Text>
    </TouchableOpacity>
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
    paddingHorizontal: 14,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonText: {
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 29,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 27,
    fontWeight: '800',
    fontFamily: 'sans-serif-condensed',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  statusPill: {
    minHeight: 34,
    maxWidth: 118,
    borderRadius: 17,
    paddingHorizontal: 10,
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
    flexShrink: 1,
    fontSize: 11,
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
  hero: {
    minHeight: 520,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  heroStatus: {
    maxWidth: 280,
    marginTop: 24,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'sans-serif-condensed',
  },
  heroHint: {
    maxWidth: 280,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroError: {
    maxWidth: 300,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuPanel: {
    width: '82%',
    maxWidth: 340,
    minWidth: 284,
    height: '100%',
    paddingTop: 22,
    paddingHorizontal: 16,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {width: 6, height: 0},
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  menuTitle: {
    fontSize: 25,
    fontWeight: '800',
    fontFamily: 'sans-serif-condensed',
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  menuCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCloseText: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  menuStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  menuStat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 9,
  },
  menuStatValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  menuStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  menuSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  menuThemeGroup: {
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    flexDirection: 'row',
    marginBottom: 20,
  },
  menuThemeOption: {
    flex: 1,
    minHeight: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  menuThemeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  menuItem: {
    minHeight: 58,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'sans-serif-condensed',
  },
  menuItemValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  menuItemArrow: {
    fontSize: 23,
    fontWeight: '700',
    marginLeft: 8,
  },
});
