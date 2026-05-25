/**
 * Routing & Filters Screen (formerly SplitTunnelingScreen)
 * Contains Apps split tunneling, Custom Domain routing, and AdBlocker/Rule Settings.
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
  ScrollView,
  Platform,
  StatusBar as NativeStatusBar,
  Image,
} from 'react-native';
import * as NativeVpn from '../native/NativeVpn';
import {vpnStore, useVpnStore} from '../store/vpnStore';
import type {SplitTunnelRule, SplitTunnelMode} from '../types/vpn';
import {useResolvedTheme, type AppTheme} from '../theme/theme';
import {androidHeaderTopPadding} from '../services/layoutService';
import {ThreeDotsLoader} from '../components/ThreeDotsLoader';
import {useTranslation} from 'react-i18next';

interface Props {
  onBack: () => void;
}

const HEADER_TOP_PADDING = androidHeaderTopPadding(
  Platform.OS,
  NativeStatusBar.currentHeight,
  12,
);

export function SplitTunnelingScreen({onBack}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const storeState = useVpnStore();
  const theme = useResolvedTheme(storeState.themeMode);
  
  // Tabs & Network Sub-tabs
  const [activeTab, setActiveTab] = useState<'apps' | 'appblock' | 'domains' | 'settings'>('apps');
  const [activeNetworkTab, setActiveNetworkTab] = useState<'wifi' | 'cellular'>('wifi');
  
  // Custom Domain Routing State
  const [newDomainText, setNewDomainText] = useState('');
  const [newDomainType, setNewDomainType] = useState<'bypass' | 'proxy'>('bypass');

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const blockRules = useMemo(() => {
    return storeState.splitTunnelRules.map(app => ({
      packageName: app.packageName,
      appName: app.appName,
      iconBase64: app.iconBase64,
      enabled: (storeState.blockedApps || []).includes(app.packageName),
    }));
  }, [storeState.splitTunnelRules, storeState.blockedApps]);

  const filteredBlockRules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return blockRules;
    }
    return blockRules.filter(
      rule =>
        rule.appName.toLowerCase().includes(needle) ||
        rule.packageName.toLowerCase().includes(needle),
    );
  }, [query, blockRules]);

  const toggleBlockedApp = useCallback(
    (packageName: string) => {
      const current = storeState.blockedApps || [];
      const updated = current.includes(packageName)
        ? current.filter(p => p !== packageName)
        : [...current, packageName];
      vpnStore.setBlockedApps(updated);
    },
    [storeState.blockedApps],
  );

  const renderBlockApp = useCallback(
    ({item}: {item: {packageName: string; appName: string; iconBase64?: string; enabled: boolean}}) => (
      <AppRuleRow
        rule={{
          packageName: item.packageName,
          appName: item.appName,
          iconBase64: item.iconBase64,
          routing: 'proxy',
          enabled: item.enabled,
        }}
        theme={theme}
        onToggle={toggleBlockedApp}
      />
    ),
    [theme, toggleBlockedApp],
  );

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
          const existingPkgsWifi = new Set(
            storeState.splitTunnelRulesWifi.map(r => r.packageName),
          );
          const existingPkgsCellular = new Set(
            storeState.splitTunnelRulesCellular.map(r => r.packageName),
          );

          // Update standard rules
          const newRules: SplitTunnelRule[] = installed
            .filter(app => !existingPkgs.has(app.packageName))
            .map(app => ({
              packageName: app.packageName,
              appName: app.appName,
              iconBase64: app.iconBase64,
              routing: 'proxy',
              enabled: false,
            }));
          if (newRules.length > 0) {
            vpnStore.setSplitTunnelRules([
              ...storeState.splitTunnelRules,
              ...newRules,
            ]);
          }

          // Update Wi-Fi rules
          const newRulesWifi: SplitTunnelRule[] = installed
            .filter(app => !existingPkgsWifi.has(app.packageName))
            .map(app => ({
              packageName: app.packageName,
              appName: app.appName,
              iconBase64: app.iconBase64,
              routing: 'proxy',
              enabled: false,
            }));
          if (newRulesWifi.length > 0 || storeState.splitTunnelRulesWifi.length === 0) {
            vpnStore.setSplitTunnelRulesWifi([
              ...storeState.splitTunnelRulesWifi,
              ...newRulesWifi,
            ]);
          }

          // Update Cellular rules
          const newRulesCellular: SplitTunnelRule[] = installed
            .filter(app => !existingPkgsCellular.has(app.packageName))
            .map(app => ({
              packageName: app.packageName,
              appName: app.appName,
              iconBase64: app.iconBase64,
              routing: 'proxy',
              enabled: false,
            }));
          if (newRulesCellular.length > 0 || storeState.splitTunnelRulesCellular.length === 0) {
            vpnStore.setSplitTunnelRulesCellular([
              ...storeState.splitTunnelRulesCellular,
              ...newRulesCellular,
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = useCallback((mode: SplitTunnelMode) => {
    vpnStore.setSplitTunnelMode(mode);
  }, []);

  const rules = useMemo(() => {
    if (storeState.differentiateNetworkRules) {
      return activeNetworkTab === 'wifi'
        ? storeState.splitTunnelRulesWifi
        : storeState.splitTunnelRulesCellular;
    }
    return storeState.splitTunnelRules;
  }, [
    storeState.differentiateNetworkRules,
    activeNetworkTab,
    storeState.splitTunnelRules,
    storeState.splitTunnelRulesWifi,
    storeState.splitTunnelRulesCellular,
  ]);

  const toggleApp = useCallback(
    (packageName: string) => {
      if (storeState.differentiateNetworkRules) {
        if (activeNetworkTab === 'wifi') {
          const rule = storeState.splitTunnelRulesWifi.find(
            item => item.packageName === packageName,
          );
          if (rule) {
            vpnStore.updateSplitTunnelRuleWifi(packageName, {enabled: !rule.enabled});
          }
        } else {
          const rule = storeState.splitTunnelRulesCellular.find(
            item => item.packageName === packageName,
          );
          if (rule) {
            vpnStore.updateSplitTunnelRuleCellular(packageName, {enabled: !rule.enabled});
          }
        }
      } else {
        const rule = storeState.splitTunnelRules.find(
          item => item.packageName === packageName,
        );
        if (rule) {
          vpnStore.updateSplitTunnelRule(packageName, {enabled: !rule.enabled});
        }
      }
    },
    [
      storeState.differentiateNetworkRules,
      activeNetworkTab,
      storeState.splitTunnelRules,
      storeState.splitTunnelRulesWifi,
      storeState.splitTunnelRulesCellular,
    ],
  );

  const filteredRules = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rules;
    }
    return rules.filter(
      rule =>
        rule.appName.toLowerCase().includes(needle) ||
        rule.packageName.toLowerCase().includes(needle),
    );
  }, [query, rules]);

  const selectedCount = useMemo(() => {
    return rules.filter(rule => rule.enabled).length;
  }, [rules]);

  const renderApp = useCallback(
    ({item}: {item: SplitTunnelRule}) => (
      <AppRuleRow rule={item} theme={theme} onToggle={toggleApp} />
    ),
    [theme, toggleApp],
  );

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, {color: theme.colors.primary}]}>
            {t('common.back', 'Back')}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.text}]}>
          {t('security.title', 'Routing & Filters')}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* Top Segmented Navigation Tabs */}
      <View style={[styles.tabBar, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'apps' && {borderBottomColor: theme.colors.primary}]}
          onPress={() => setActiveTab('apps')}>
          <Text style={[styles.tabText, {color: activeTab === 'apps' ? theme.colors.primary : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {t('security.apps', 'Apps')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'appblock' && {borderBottomColor: theme.colors.primary}]}
          onPress={() => setActiveTab('appblock')}>
          <Text style={[styles.tabText, {color: activeTab === 'appblock' ? theme.colors.primary : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {t('security.app_block', 'App Block')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'domains' && {borderBottomColor: theme.colors.primary}]}
          onPress={() => setActiveTab('domains')}>
          <Text style={[styles.tabText, {color: activeTab === 'domains' ? theme.colors.primary : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {t('security.domains', 'Domains')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && {borderBottomColor: theme.colors.primary}]}
          onPress={() => setActiveTab('settings')}>
          <Text style={[styles.tabText, {color: activeTab === 'settings' ? theme.colors.primary : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {t('security.settings_tab', 'Settings')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* -------------------- SETTINGS TAB -------------------- */}
      {activeTab === 'settings' && (
        <ScrollView contentContainerStyle={styles.settingsContent}>
          {/* AdBlocker Switch Card */}
          <View style={[styles.card, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderInfo}>
                <Text style={[styles.cardTitle, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
                  {t('security.adblocker_title', 'AdBlocker (DNS DoH)')}
                </Text>
                <Text style={[styles.cardDesc, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
                  {t('security.adblocker_desc', 'Block advertisements, banners, and malicious tracking domains globally using secure AdGuard DoH resolvers detour through your VPN. Reduces page load time.')}
                </Text>
              </View>
              <Switch
                value={storeState.adBlockEnabled}
                onValueChange={(val) => vpnStore.setAdBlockEnabled(val)}
                trackColor={{
                  false: theme.isDark ? '#30343D' : '#D7DCE3',
                  true: theme.colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Network-Aware Rules Switch Card */}
          <View style={[styles.card, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderInfo}>
                <Text style={[styles.cardTitle, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
                  {t('security.netaware_title', 'Network-Aware Routing')}
                </Text>
                <Text style={[styles.cardDesc, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
                  {t('security.netaware_desc', 'Define different app routing rules when on Wi-Fi versus Mobile Data (Cellular). The VPN client automatically reconstructs the tunnel and applies correct rules when switching network connections.')}
                </Text>
              </View>
              <Switch
                value={storeState.differentiateNetworkRules}
                onValueChange={(val) => vpnStore.setDifferentiateNetworkRules(val)}
                trackColor={{
                  false: theme.isDark ? '#30343D' : '#D7DCE3',
                  true: theme.colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </ScrollView>
      )}

      {/* -------------------- DOMAINS TAB -------------------- */}
      {activeTab === 'domains' && (
        <View style={styles.tabContent}>
          {/* Add custom domain card */}
          <View style={[styles.card, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator, marginHorizontal: 16, marginTop: 8, padding: 14}]}>
            <Text style={[styles.cardTitle, {color: theme.colors.text, fontFamily: theme.fonts.bold, marginBottom: 8, fontSize: 14}]}>
              {t('security.add_domain_title', 'Add Custom Domain Rule')}
            </Text>
            <View style={styles.addDomainRow}>
              <TextInput
                style={[
                  styles.domainInput,
                  {
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.separator,
                    color: theme.colors.text,
                    fontFamily: theme.fonts.medium,
                  },
                ]}
                value={newDomainText}
                onChangeText={setNewDomainText}
                placeholder="e.g. yandex.ru"
                placeholderTextColor={theme.colors.tertiaryText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.addButton, {backgroundColor: theme.colors.primary}]}
                onPress={() => {
                  const cleaned = newDomainText.trim().toLowerCase();
                  if (!cleaned) {
                    return;
                  }
                  if (newDomainType === 'bypass') {
                    if (storeState.bypassDomains.includes(cleaned)) {
                      return;
                    }
                    vpnStore.setBypassDomains([...storeState.bypassDomains, cleaned]);
                  } else {
                    if (storeState.proxyDomains.includes(cleaned)) {
                      return;
                    }
                    vpnStore.setProxyDomains([...storeState.proxyDomains, cleaned]);
                  }
                  setNewDomainText('');
                }}>
                <Text style={styles.addButtonText}>{t('security.btn_add', 'Add')}</Text>
              </TouchableOpacity>
            </View>
            {/* Choose rule category */}
            <View style={styles.domainTypeRow}>
              <TouchableOpacity
                style={[
                  styles.domainTypeBtn,
                  {borderColor: theme.colors.separator},
                  newDomainType === 'bypass' && {backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary},
                ]}
                activeOpacity={0.78}
                onPress={() => setNewDomainType('bypass')}>
                <Text style={[styles.domainTypeBtnText, {color: newDomainType === 'bypass' ? theme.colors.primary : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
                  {t('security.bypass_vpn_direct', 'Bypass VPN (Direct)')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.domainTypeBtn,
                  {borderColor: theme.colors.separator},
                  newDomainType === 'proxy' && {backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary},
                ]}
                activeOpacity={0.78}
                onPress={() => setNewDomainType('proxy')}>
                <Text style={[styles.domainTypeBtnText, {color: newDomainType === 'proxy' ? theme.colors.primary : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
                  {t('security.route_vpn_proxy', 'Route VPN (Proxy)')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scrolled lists of Bypass/Proxy domains */}
          <ScrollView style={styles.domainsListsScroll} contentContainerStyle={{paddingBottom: 40}}>
            <Text style={[styles.sectionHeading, {color: theme.colors.tertiaryText, fontFamily: theme.fonts.bold}]}>
              Bypass List (Local Services / Fast Direct Link)
            </Text>
            {storeState.bypassDomains.length === 0 ? (
              <Text style={[styles.domainEmptyText, {color: theme.colors.tertiaryText}]}>No domains in bypass list</Text>
            ) : (
              storeState.bypassDomains.map((dom) => (
                <View key={dom} style={[styles.domainRow, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
                  <Text style={[styles.domainName, {color: theme.colors.text, fontFamily: theme.fonts.semiBold}]}>{dom}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      vpnStore.setBypassDomains(storeState.bypassDomains.filter(d => d !== dom));
                    }}
                    style={styles.deleteBtn}>
                    <Text style={{color: theme.colors.danger, fontWeight: 'bold', fontSize: 13}}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <Text style={[styles.sectionHeading, {color: theme.colors.tertiaryText, fontFamily: theme.fonts.bold, marginTop: 18}]}>
              Proxy List (Force Encrypted / Locked Services)
            </Text>
            {storeState.proxyDomains.length === 0 ? (
              <Text style={[styles.domainEmptyText, {color: theme.colors.tertiaryText}]}>No domains in proxy list</Text>
            ) : (
              storeState.proxyDomains.map((dom) => (
                <View key={dom} style={[styles.domainRow, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
                  <Text style={[styles.domainName, {color: theme.colors.text, fontFamily: theme.fonts.semiBold}]}>{dom}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      vpnStore.setProxyDomains(storeState.proxyDomains.filter(d => d !== dom));
                    }}
                    style={styles.deleteBtn}>
                    <Text style={{color: theme.colors.danger, fontWeight: 'bold', fontSize: 13}}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* -------------------- APP BLOCK TAB -------------------- */}
      {activeTab === 'appblock' && (
        <View style={styles.tabContent}>
          {/* Firewall Switch Card */}
          <View style={[styles.modeCard, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator, marginBottom: 8}]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderInfo}>
                <Text style={[styles.cardTitle, {color: theme.colors.text, fontFamily: theme.fonts.bold, fontSize: 15}]}>
                  🚫 App Firewall
                </Text>
                <Text style={[styles.cardDesc, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium, marginTop: 4}]}>
                  Prevent selected apps from accessing the network entirely when the VPN is active. Blocked apps will have no internet.
                </Text>
              </View>
              <Switch
                value={storeState.blockAppsEnabled || false}
                onValueChange={(val) => vpnStore.setBlockAppsEnabled(val)}
                trackColor={{
                  false: theme.isDark ? '#30343D' : '#D7DCE3',
                  true: theme.colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text style={[styles.modeHint, {color: theme.colors.secondaryText, marginTop: 8}]}>
              {(storeState.blockedApps || []).length} app{(storeState.blockedApps || []).length === 1 ? '' : 's'} blacklisted
            </Text>
          </View>

          {/* Search Blocked Apps */}
          <TextInput
            style={[
              styles.search,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
                color: theme.colors.text,
                marginBottom: 8,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('security.search_apps_block')}
            placeholderTextColor={theme.colors.tertiaryText}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {loading && (
            <View style={styles.centerBox}>
              <ThreeDotsLoader color={theme.colors.primary} />
              <Text style={[styles.loadingText, {color: theme.colors.secondaryText}]}>
                {t('security.loading_apps')}
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
              data={filteredBlockRules}
              keyExtractor={item => item.packageName}
              renderItem={renderBlockApp}
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
        </View>
      )}

      {/* -------------------- APPS TAB -------------------- */}
      {activeTab === 'apps' && (
        <View style={styles.tabContent}>
          {/* Mode Card */}
          <View
            style={[
              styles.modeCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
                marginBottom: 8,
              },
            ]}>
            <Text style={[styles.modeLabel, {color: theme.colors.tertiaryText}]}>
              Routing mode
            </Text>
            <View style={[styles.segment, {backgroundColor: theme.colors.background}]}>
              <ModeButton
                label="All apps"
                selected={storeState.splitTunnelMode === 'vpn_all'}
                theme={theme}
                onPress={() => setMode('vpn_all')}
              />
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

            {/* Network Rule Switcher (only displays if differentiateNetworkRules is active) */}
            {storeState.differentiateNetworkRules && (
              <View style={[styles.networkSegment, {backgroundColor: theme.colors.background, marginTop: 12}]}>
                <TouchableOpacity
                  style={[styles.networkSegmentBtn, activeNetworkTab === 'wifi' && {backgroundColor: theme.colors.primary}]}
                  onPress={() => setActiveNetworkTab('wifi')}
                  activeOpacity={0.78}>
                  <Text style={[styles.networkSegmentText, {color: activeNetworkTab === 'wifi' ? '#FFFFFF' : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
                    {t('security.wifi_rules')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.networkSegmentBtn, activeNetworkTab === 'cellular' && {backgroundColor: theme.colors.primary}]}
                  onPress={() => setActiveNetworkTab('cellular')}
                  activeOpacity={0.78}>
                  <Text style={[styles.networkSegmentText, {color: activeNetworkTab === 'cellular' ? '#FFFFFF' : theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
                    {t('security.mobile_rules')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.modeHint, {color: theme.colors.secondaryText}]}>
              {selectedCount} selected app{selectedCount === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Search Apps */}
          <TextInput
            style={[
              styles.search,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.separator,
                color: theme.colors.text,
                marginBottom: 8,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('security.search_apps')}
            placeholderTextColor={theme.colors.tertiaryText}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {loading && (
            <View style={styles.centerBox}>
              <ThreeDotsLoader color={theme.colors.primary} />
              <Text style={[styles.loadingText, {color: theme.colors.secondaryText}]}>
                {t('security.loading_apps')}
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
        </View>
      )}

    </SafeAreaView>
  );
}

function AppIconBadge({appName, theme}: {appName: string; theme: AppTheme}): React.JSX.Element {
  const firstLetter = appName.trim().substring(0, 1).toUpperCase() || '?';
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.success,
    '#00E5FF',
    '#FF1744',
    '#FFD600',
    '#AA00FF',
  ];
  const colorIndex = appName.length % colors.length;
  const badgeColor = colors[colorIndex];

  return (
    <View style={[
      styles.avatarBadge,
      {
        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        borderColor: badgeColor,
        borderWidth: 1.5,
      }
    ]}>
      <Text style={[
        styles.avatarText,
        {
          color: badgeColor,
          fontFamily: theme.fonts.bold,
        }
      ]}>
        {firstLetter}
      </Text>
    </View>
  );
}

const AppRuleRow = memo(function AppRuleRow({
  rule,
  theme,
  onToggle,
}: {
  rule: SplitTunnelRule & { iconBase64?: string };
  theme: AppTheme;
  onToggle: (packageName: string) => void;
}) {
  return (
    <View
      style={[
        styles.appRow,
        {
          backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          borderWidth: 1,
        },
      ]}>
      {rule.iconBase64 ? (
        <Image
          source={{ uri: rule.iconBase64 }}
          style={styles.appIconImage}
        />
      ) : (
        <AppIconBadge appName={rule.appName} theme={theme} />
      )}
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  settingsContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  modeCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
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
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  networkSegment: {
    flexDirection: 'row',
    borderRadius: 13,
    padding: 3,
    gap: 4,
  },
  networkSegmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  networkSegmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  search: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
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
  addDomainRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  domainInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    minHeight: 40,
    fontSize: 14,
  },
  addButton: {
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  domainTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  domainTypeBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  domainTypeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  domainsListsScroll: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  domainName: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 6,
  },
  domainEmptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 4,
    paddingLeft: 4,
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appIconImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
});
