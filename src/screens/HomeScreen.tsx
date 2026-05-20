import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Animated,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Modal,
  StatusBar as NativeStatusBar,
} from 'react-native';
import {AnimatedShield} from '../components/AnimatedShield';
import {CustomNotification} from '../components/CustomNotification';
import {TrafficGraph} from '../components/TrafficGraph';
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
import type {VpnStatus} from '../types/vpn';
import {getNetworkType, onNetworkTypeChanged} from '../native/NativeVpn';

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

const MENU_ICONS: Record<string, string> = {
  'Import Profile': '↓',
  '3X-UI Panel': '⚙',
  'Split Tunneling': '⇄',
  Diagnostics: '⚿',
  'Update Rules': '↻',
  'Technical Guide': '📖',
};

// ---------------------------------------------------------------------------
// Concentric Wi-Fi Arcs Custom Icon
// ---------------------------------------------------------------------------
function MiniWifiIcon({color}: {color: string}): React.JSX.Element {
  return (
    <View style={styles.miniWifiContainer}>
      <View style={[styles.miniWifiDot, {backgroundColor: color}]} />
      <View
        style={[
          styles.miniWifiArc,
          {
            width: 10,
            height: 10,
            borderRadius: 5,
            borderTopColor: color,
            bottom: 4,
          },
        ]}
      />
      <View
        style={[
          styles.miniWifiArc,
          {
            width: 16,
            height: 16,
            borderRadius: 8,
            borderTopColor: color,
            bottom: 7,
          },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Standard Signal Bars Custom Icon
// ---------------------------------------------------------------------------
function MiniCellularIcon({color}: {color: string}): React.JSX.Element {
  return (
    <View style={styles.miniCellContainer}>
      <View style={[styles.miniCellBar, {height: 4, backgroundColor: color}]} />
      <View style={[styles.miniCellBar, {height: 7, backgroundColor: color}]} />
      <View style={[styles.miniCellBar, {height: 10, backgroundColor: color}]} />
      <View style={[styles.miniCellBar, {height: 13, backgroundColor: color}]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Premium Tech Glyph Network Badge
// ---------------------------------------------------------------------------
function NetworkBadge({
  type,
  theme,
}: {
  type: 'wifi' | 'cellular' | 'other' | 'none';
  theme: AppTheme;
}): React.JSX.Element {
  const isWifi = type === 'wifi';
  const isCellular = type === 'cellular';
  const isOffline = type === 'none';

  let color = theme.colors.secondaryText;
  let bg = theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
  let label = 'OFFLINE';

  if (isWifi) {
    color = theme.colors.primary;
    bg = theme.colors.primarySoft;
    label = 'WI-FI';
  } else if (isCellular) {
    color = theme.colors.secondary;
    bg = theme.colors.secondarySoft;
    label = 'CELLULAR';
  } else if (type === 'other') {
    color = theme.colors.success;
    bg = theme.colors.successSoft;
    label = 'CONNECTED';
  }

  return (
    <View style={[styles.networkBadge, {backgroundColor: bg, borderColor: theme.colors.separator}]}>
      {isWifi ? (
        <MiniWifiIcon color={color} />
      ) : isCellular ? (
        <MiniCellularIcon color={color} />
      ) : (
        <View
          style={[
            styles.miniOfflineDot,
            {backgroundColor: isOffline ? theme.colors.danger : color},
          ]}
        />
      )}
      <Text style={[styles.networkBadgeText, {color, fontFamily: theme.fonts.bold}]}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Interactive Custom Security Toggle Widget
// ---------------------------------------------------------------------------
function SecurityToggleRow({
  label,
  sublabel,
  value,
  onToggle,
  theme,
}: {
  label: string;
  sublabel: string;
  value: boolean;
  onToggle: () => void;
  theme: AppTheme;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.toggleRow,
        {
          backgroundColor: theme.isDark ? 'rgba(13, 14, 18, 0.6)' : '#FFFFFF',
          borderColor: value ? theme.colors.primary : theme.colors.separator,
        },
        value && styles.activeToggleRowGlow,
      ]}
      activeOpacity={0.78}
      onPress={onToggle}>
      <View style={{flex: 1, paddingRight: 10}}>
        <Text style={[styles.toggleRowLabel, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
          {label}
        </Text>
        <Text style={[styles.toggleRowSublabel, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
          {sublabel}
        </Text>
      </View>
      <View
        style={[
          styles.toggleSwitchOuter,
          {
            backgroundColor: value ? theme.colors.primary : 'rgba(92, 99, 112, 0.25)',
          },
        ]}>
        <View
          style={[
            styles.toggleSwitchInner,
            {
              backgroundColor: '#FFFFFF',
              transform: [{translateX: value ? 14 : 0}],
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

function ConnectionHealthStrip({
  theme,
  status,
  networkType,
  adBlockEnabled,
  networkAwareRules,
}: {
  theme: AppTheme;
  status: VpnStatus;
  networkType: 'wifi' | 'cellular' | 'other' | 'none';
  adBlockEnabled: boolean;
  networkAwareRules: boolean;
}): React.JSX.Element {
  const connected = status === 'connected';
  const items = [
    {
      label: connected ? 'Tunnel' : 'Core',
      value: connected ? 'Protected' : status.replace('_', ' '),
      active: connected,
    },
    {
      label: 'Network',
      value:
        networkType === 'wifi'
          ? 'Wi-Fi'
          : networkType === 'cellular'
          ? 'Cellular'
          : networkType === 'none'
          ? 'Offline'
          : 'Online',
      active: networkType !== 'none',
    },
    {
      label: 'DNS',
      value: adBlockEnabled ? 'AdGuard DoH' : 'Google DoH',
      active: adBlockEnabled,
    },
    {
      label: 'Rules',
      value: networkAwareRules ? 'Adaptive' : 'Unified',
      active: networkAwareRules,
    },
  ];

  return (
    <View
      style={[
        styles.healthStrip,
        {
          backgroundColor: theme.isDark
            ? 'rgba(13, 14, 18, 0.62)'
            : '#FFFFFF',
          borderColor: theme.colors.separator,
        },
      ]}>
      {items.map(item => (
        <View key={item.label} style={styles.healthItem}>
          <View
            style={[
              styles.healthDot,
              {
                backgroundColor: item.active
                  ? theme.colors.success
                  : theme.colors.tertiaryText,
              },
            ]}
          />
          <Text
            style={[
              styles.healthLabel,
              {color: theme.colors.tertiaryText, fontFamily: theme.fonts.bold},
            ]}
            numberOfLines={1}>
            {item.label}
          </Text>
          <Text
            style={[
              styles.healthValue,
              {color: theme.colors.text, fontFamily: theme.fonts.bold},
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide-up Blueprints Modal
// ---------------------------------------------------------------------------
function DocumentationModal({
  visible,
  onClose,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  theme: AppTheme;
}): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}}>
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: theme.colors.separator,
              backgroundColor: theme.colors.surface,
              paddingTop: Platform.OS === 'android' ? 24 : 10,
            },
          ]}>
          <Text style={[styles.modalTitle, {color: theme.colors.text, fontFamily: theme.fonts.extraBold}]}>
            🛡️ SYSTEM BLUEPRINTS
          </Text>
          <TouchableOpacity
            style={[
              styles.menuCloseButton,
              {
                borderColor: theme.colors.separator,
                width: 32,
                height: 32,
                borderRadius: 16,
              },
            ]}
            onPress={onClose}>
            <Text style={[styles.menuCloseText, {color: theme.colors.text, fontSize: 20, lineHeight: 22}]}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={true}>
          <Text style={[styles.docsH1, {color: theme.colors.primary, fontFamily: theme.fonts.extraBold}]}>
            KernelVPN Core Architecture
          </Text>
          <Text style={[styles.docsPara, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
            KernelVPN bridges a native Android VPN Service wrapping the ultra-fast Sing-box routing engine. All network policies, routing rules, DNS parameters, and blocked application namespaces are compiled locally into a secure binary execution config.
          </Text>

          <Text style={[styles.docsH2, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
            📶 Native Samsung Handover Fix
          </Text>
          <Text style={[styles.docsPara, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
            Samsung devices strictly enforce target socket bindings inside their active interface drivers. When transitioning between Wi-Fi and Mobile Networks, standard Android VPN handles this poorly, resulting in data blackholes.
            {"\n\n"}
            KernelVPN fixes this by tracking network capabilities dynamically. When default interfaces switch, we dynamically notify the active VpnService, re-binding underlying network handlers in real-time without tearing down the cryptographic tunnel.
          </Text>

          <Text style={[styles.docsH2, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
            🚫 DNS-Level Ad Blocking (DNS DoH)
          </Text>
          <Text style={[styles.docsPara, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
            When DNS AdBlocker is active, the Sing-box config detours all DNS packets to a highly secure DNS-over-HTTPS (DoH) tunnel connected to AdGuard resolvers. Trackers, ads, and telemetry queries are black-listed and blocked locally on your device, preventing bandwidth loss and tracking.
          </Text>

          <Text style={[styles.docsH2, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
            ⇄ Split Tunneling Rule-Set
          </Text>
          <Text style={[styles.docsPara, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
            Split tunneling allows detouring specific applications through the secure proxy node while keeping banking apps or domestic sites on direct local routing. Network-Aware mode loads dedicated rulesets tailored automatically for your active Wi-Fi or cellular networks.
          </Text>

          <View style={{height: 40}} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ConnectionTimer — Elapsed time since VPN connection
// ---------------------------------------------------------------------------
function ConnectionTimer({
  status,
  theme,
}: {
  status: VpnStatus;
  theme: AppTheme;
}): React.JSX.Element {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'connected') {
      if (connectedAtRef.current === null) {
        connectedAtRef.current = Date.now();
      }
      setElapsed(0);
      intervalRef.current = setInterval(() => {
        if (connectedAtRef.current !== null) {
          const seconds = Math.floor(
            (Date.now() - connectedAtRef.current) / 1000,
          );
          setElapsed(seconds);
        }
      }, 1000);
    } else if (status === 'disconnected' || status === 'error') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      connectedAtRef.current = null;
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const formatted = [hours, minutes, seconds]
    .map(v => String(v).padStart(2, '0'))
    .join(':');

  return (
    <Text
      style={[
        styles.timerText,
        {
          color: theme.colors.primary,
          fontFamily: theme.fonts.mono,
        },
      ]}>
      {formatted}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------
export function HomeScreen({onNavigate}: Props): React.JSX.Element {
  const state = useVpnStore();
  const theme = useResolvedTheme(state.themeMode);
  const effectiveStatus = state.lastError ? 'error' : state.status;
  const statusColors = getStatusColors(effectiveStatus, theme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [docsVisible, setDocsVisible] = useState(false);
  const [networkType, setNetworkType] = useState<'wifi' | 'cellular' | 'other' | 'none'>('none');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState<{message: string; type: 'success' | 'info' | 'warning' | 'error'} | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 650,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const lastStatus = useRef(state.status);
  const lastErrorVal = useRef(state.lastError);

  useEffect(() => {
    if (state.status !== lastStatus.current) {
      if (state.status === 'connected') {
        const protocolLabel = state.activeProfile?.protocol?.toUpperCase() || 'VPN';
        setToast({
          message: `🛡️ Tunnel secure via ${protocolLabel}`,
          type: 'success',
        });
      } else if (state.status === 'connecting') {
        setToast({
          message: '⚡ Establishing secure channel…',
          type: 'info',
        });
      } else if (state.status === 'disconnected' && lastStatus.current !== 'disconnected') {
        setToast({
          message: '🔌 Connection closed safely',
          type: 'info',
        });
      }
      lastStatus.current = state.status;
    }

    if (state.lastError && state.lastError !== lastErrorVal.current) {
      setToast({
        message: `⚠️ Connection error: ${state.lastError}`,
        type: 'error',
      });
      lastErrorVal.current = state.lastError;
    } else if (!state.lastError) {
      lastErrorVal.current = null;
    }
  }, [state.status, state.lastError, state.activeProfile]);

  const lastNetworkTypeToast = useRef(networkType);
  useEffect(() => {
    if (networkType !== lastNetworkTypeToast.current) {
      if (networkType !== 'none') {
        const netName = networkType === 'wifi' ? 'Wi-Fi' : 'Cellular';
        setToast({
          message: `📶 Active connection: ${netName}`,
          type: 'info',
        });
      } else {
        setToast({
          message: '📶 Device went offline',
          type: 'warning',
        });
      }
      lastNetworkTypeToast.current = networkType;
    }
  }, [networkType]);

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

      try {
        const initialNet = await getNetworkType();
        setNetworkType(initialNet);
      } catch (err) {
        console.warn('Failed to get initial network type', err);
      }
    }
    setup();

    vpnService.startListening();
    vpnService.refreshStatus();

    const unsubscribeNetwork = onNetworkTypeChanged((newType) => {
      setNetworkType(newType);
    });

    return () => {
      vpnService.stopListening();
      unsubscribeNetwork();
    };
  }, []);

  const lastNetworkType = useRef(networkType);
  useEffect(() => {
    if (
      state.status === 'connected' &&
      state.differentiateNetworkRules &&
      state.activeProfile &&
      networkType !== 'none' &&
      lastNetworkType.current !== 'none' &&
      networkType !== lastNetworkType.current
    ) {
      console.log(`[HomeScreen] Auto-reconnecting VPN to apply split tunnel rules for network: ${networkType}`);
      vpnService.connect(state.activeProfile).catch(err => {
        console.warn('[HomeScreen] Auto-reconnection failed:', err);
      });
    }
    lastNetworkType.current = networkType;
  }, [networkType, state.status, state.differentiateNetworkRules, state.activeProfile]);

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

  const reconnectActiveTunnel = useCallback(
    async (reason: string) => {
      if (state.status !== 'connected' || !state.activeProfile) {
        return;
      }

      setToast({
        message: `${reason}. Applying to active tunnel…`,
        type: 'info',
      });
      try {
        await vpnService.connect(state.activeProfile);
      } catch {
        // Error is handled by vpnService and stored in vpnStore.
      }
    },
    [state.status, state.activeProfile],
  );

  const handleToggleAdBlock = useCallback(async () => {
    const nextValue = !state.adBlockEnabled;
    vpnStore.setAdBlockEnabled(nextValue);
    await reconnectActiveTunnel(
      nextValue ? 'DNS AdBlock enabled' : 'DNS AdBlock disabled',
    );
  }, [state.adBlockEnabled, reconnectActiveTunnel]);

  const handleToggleNetworkAwareRules = useCallback(async () => {
    const nextValue = !state.differentiateNetworkRules;
    vpnStore.setDifferentiateNetworkRules(nextValue);
    await reconnectActiveTunnel(
      nextValue
        ? 'Network-aware rules enabled'
        : 'Network-aware rules disabled',
    );
  }, [state.differentiateNetworkRules, reconnectActiveTunnel]);

  const handleUpdateRules = useCallback(async () => {
    try {
      const manifest = await fetchRulesManifest(
        'kernelvpn://bundled-rules',
      );
      if (validateRulesManifest(manifest)) {
        await applyRulesManifest(manifest);
        setDocsVisible(true);
        setToast({
          message: `Rules updated to v${manifest.version}. Routing config refreshed.`,
          type: 'success',
        });
        await reconnectActiveTunnel('Rules updated');
      } else {
        Alert.alert('Error', 'Invalid rules manifest received.');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Update Failed', msg);
    }
  }, [reconnectActiveTunnel]);

  const navigateFromMenu = useCallback(
    (screen: string) => {
      setMenuOpen(false);
      onNavigate(screen);
    },
    [onNavigate],
  );

  const activeProfile = state.activeProfile;

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <CustomNotification
        message={toast?.message ?? null}
        type={toast?.type ?? 'info'}
        onDismiss={() => setToast(null)}
      />
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
        onOpenBlueprints={() => {
          setMenuOpen(false);
          setDocsVisible(true);
        }}
      />
      <Animated.View style={{flex: 1, opacity: fadeAnim}}>
        {/* Fixed Header */}
        <View style={[styles.header, {borderBottomColor: theme.colors.separator, backgroundColor: theme.colors.background}]}>
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
            <View style={styles.hamburgerWrap}>
              <View
                style={[
                  styles.hamburgerBar,
                  {backgroundColor: theme.colors.text},
                ]}
              />
              <View
                style={[
                  styles.hamburgerBar,
                  {backgroundColor: theme.colors.text},
                ]}
              />
              <View
                style={[
                  styles.hamburgerBar,
                  {backgroundColor: theme.colors.text},
                ]}
              />
            </View>
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text
              style={[
                styles.brand,
                {
                  color: theme.colors.text,
                  fontFamily: theme.fonts.extraBold,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}>
              KernelVPN
            </Text>
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.secondaryText,
                  fontFamily: theme.fonts.medium,
                },
              ]}
              numberOfLines={1}>
              Crypto Shield Active
            </Text>
          </View>
          
          <NetworkBadge type={networkType} theme={theme} />

          <View style={[styles.statusPill, {backgroundColor: statusColors.soft}]}>
            <View style={[styles.statusDot, {backgroundColor: statusColors.accent}]} />
            <Text
              style={[
                styles.statusPillText,
                {
                  color: statusColors.accent,
                  fontFamily: theme.fonts.bold,
                },
              ]}
              numberOfLines={1}>
              {effectiveStatus.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Scrollable Viewport */}
        <ScrollView
          contentContainerStyle={[styles.scrollContent, {paddingBottom: 190}]}
          showsVerticalScrollIndicator={false}>
          
          {/* Animated Shield */}
          <View style={styles.shieldWrapper}>
            <AnimatedShield status={effectiveStatus} />
          </View>

          {/* Traffic Graph (Equalizer) */}
          <TrafficGraph status={effectiveStatus} theme={theme} />

          <ConnectionHealthStrip
            theme={theme}
            status={effectiveStatus}
            networkType={networkType}
            adBlockEnabled={state.adBlockEnabled}
            networkAwareRules={state.differentiateNetworkRules}
          />

          {/* Security widgets */}
          <View style={styles.securityWidgetsContainer}>
            <Text style={[styles.sectionTitle, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
              🔐 Security Controls
            </Text>
            <SecurityToggleRow
              label="DNS AdBlocker"
              sublabel="Detour traffic over secure AdGuard DNS (DoH) to block ads"
              value={state.adBlockEnabled}
              onToggle={handleToggleAdBlock}
              theme={theme}
            />
            <SecurityToggleRow
              label="Network-Aware Separate Rules"
              sublabel="Apply separate routing tables for Cellular & Wi-Fi interfaces"
              value={state.differentiateNetworkRules}
              onToggle={handleToggleNetworkAwareRules}
              theme={theme}
            />
          </View>

          {/* Blueprints Banner */}
          <TouchableOpacity
            style={[
              styles.infoBanner,
              {
                backgroundColor: theme.isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(124, 58, 237, 0.04)',
                borderColor: theme.colors.primarySoft,
              },
            ]}
            activeOpacity={0.78}
            onPress={() => setDocsVisible(true)}>
            <Text style={{fontSize: 18, color: theme.colors.primary}}>📖</Text>
            <View style={{flex: 1, marginLeft: 10}}>
              <Text style={[styles.infoBannerTitle, {color: theme.colors.text, fontFamily: theme.fonts.bold}]}>
                Technical Blueprints Guide
              </Text>
              <Text style={[styles.infoBannerSub, {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium}]}>
                View how Sing-box, AdBlock, and Samsung handover protocols protect your device.
              </Text>
            </View>
            <Text style={{fontSize: 18, color: theme.colors.primary}}>›</Text>
          </TouchableOpacity>

          {state.lastError ? (
            <Text
              style={[
                styles.heroError,
                {
                  color: theme.colors.danger,
                  fontFamily: theme.fonts.bold,
                },
              ]}
              numberOfLines={3}>
              {state.lastError}
            </Text>
          ) : null}
        </ScrollView>

        {/* Floating Bottom Panel */}
        <View
          style={[
            styles.stickyBottomPanel,
            {
              backgroundColor: theme.isDark ? 'rgba(13, 14, 18, 0.94)' : 'rgba(255, 255, 255, 0.96)',
              borderColor: theme.colors.separator,
            },
          ]}>
          <View style={{flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', marginBottom: 12}}>
            <View style={{flex: 1, paddingRight: 10}}>
              {activeProfile ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <View style={[styles.protocolBadge, {backgroundColor: theme.colors.primarySoft, paddingVertical: 1, paddingHorizontal: 6}]}>
                    <Text style={[styles.protocolBadgeText, {color: theme.colors.primary, fontSize: 9}]}>
                      {activeProfile.protocol.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.profileName, {color: theme.colors.text, fontSize: 13, fontWeight: '700'}]} numberOfLines={1}>
                    {activeProfile.name}
                  </Text>
                </View>
              ) : (
                <Text style={{color: theme.colors.secondaryText, fontSize: 13, fontWeight: '600'}}>
                  No connection profile selected
                </Text>
              )}
            </View>
            <ConnectionTimer status={effectiveStatus} theme={theme} />
          </View>

          <TouchableOpacity
            style={[
              styles.actionPillButton,
              {
                backgroundColor: effectiveStatus === 'connected'
                  ? 'rgba(255, 23, 68, 0.12)'
                  : 'rgba(139, 92, 246, 0.15)',
                borderColor: effectiveStatus === 'connected'
                  ? '#FF1744'
                  : theme.colors.primary,
                width: '100%',
                marginTop: 0,
              }
            ]}
            onPress={effectiveStatus === 'connected' ? handleDisconnect : handleConnect}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.actionPillButtonText,
                {
                  color: effectiveStatus === 'connected' ? '#FF1744' : theme.colors.primary,
                  fontFamily: theme.fonts.bold,
                }
              ]}
            >
              {effectiveStatus === 'connected' ? 'DISCONNECT SECURE TUNNEL' : 'PROTECT DEVICE TRAFFIC'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <DocumentationModal
        visible={docsVisible}
        onClose={() => setDocsVisible(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// SideMenu — Animated slide-in panel
// ---------------------------------------------------------------------------
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
  onOpenBlueprints,
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
  onOpenBlueprints: () => void;
}): React.JSX.Element {
  const slideAnim = useRef(new Animated.Value(-340)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -340,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.menuOverlay}>
        <Animated.View
          style={[styles.menuBackdrop, {opacity: backdropAnim}]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.menuPanel,
            {
              backgroundColor: theme.isDark
                ? 'rgba(13, 14, 18, 0.94)'
                : 'rgba(255, 255, 255, 0.96)',
              borderColor: theme.colors.separator,
              transform: [{translateX: slideAnim}],
              paddingTop: Platform.OS === 'android' ? 32 : 22,
            },
          ]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.menuHeader}>
              <View>
                <Text
                  style={[
                    styles.menuTitle,
                    {
                      color: theme.colors.text,
                      fontFamily: theme.fonts.extraBold,
                    },
                  ]}>
                  KernelVPN
                </Text>
                <Text
                  style={[
                    styles.menuSubtitle,
                    {
                      color: theme.colors.secondaryText,
                      fontFamily: theme.fonts.medium,
                    },
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
                <Text
                  style={[styles.menuCloseText, {color: theme.colors.text}]}>
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
                {
                  color: theme.colors.tertiaryText,
                  fontFamily: theme.fonts.semiBold,
                },
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
                          fontFamily: theme.fonts.bold,
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
                {
                  color: theme.colors.tertiaryText,
                  fontFamily: theme.fonts.semiBold,
                },
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
            <MenuItem
              label="Technical Guide"
              value="View system blueprints and docs"
              theme={theme}
              onPress={onOpenBlueprints}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// MenuStat — Stat card inside the side menu
// ---------------------------------------------------------------------------
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
      <Text
        style={[
          styles.menuStatValue,
          {
            color: theme.colors.text,
            fontFamily: theme.fonts.bold,
          },
        ]}>
        {value}
      </Text>
      <Text
        style={[
          styles.menuStatLabel,
          {
            color: theme.colors.tertiaryText,
            fontFamily: theme.fonts.bold,
          },
        ]}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MenuItem — Action row inside the side menu
// ---------------------------------------------------------------------------
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
  const icon = MENU_ICONS[label] ?? '';

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
      {icon ? <Text style={styles.menuItemIcon}>{icon}</Text> : null}
      <View style={styles.menuItemTextWrap}>
        <Text
          style={[
            styles.menuItemLabel,
            {
              color: theme.colors.text,
              fontFamily: theme.fonts.bold,
            },
          ]}>
          {label}
        </Text>
        <Text
          style={[
            styles.menuItemValue,
            {
              color: theme.colors.secondaryText,
              fontFamily: theme.fonts.medium,
            },
          ]}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerWrap: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hamburgerBar: {
    width: 18,
    height: 2.5,
    borderRadius: 1.5,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statusPill: {
    minHeight: 34,
    maxWidth: 95,
    borderRadius: 17,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  statusPillText: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  // Custom Wifi/Cellular icons
  miniWifiContainer: {
    width: 16,
    height: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 1,
  },
  miniWifiDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
  },
  miniWifiArc: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  miniCellContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 12,
    gap: 1.5,
  },
  miniCellBar: {
    width: 2,
    borderRadius: 0.5,
  },
  miniOfflineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    gap: 6,
  },
  networkBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  shieldWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  timerText: {
    fontSize: 20,
    letterSpacing: 1,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  heroError: {
    maxWidth: 300,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'center',
  },
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  menuPanel: {
    width: '82%',
    maxWidth: 340,
    minWidth: 284,
    height: '100%',
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
  menuItemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  menuItemTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '800',
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
  actionPillButton: {
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionPillButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Overhauled styles
  stickyBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: {width: 0, height: -4},
    elevation: 8,
  },
  protocolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  protocolBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthStrip: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 7,
  },
  healthItem: {
    flex: 1,
    minWidth: 0,
  },
  healthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 5,
  },
  healthLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  healthValue: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  securityWidgetsContainer: {
    width: '90%',
    alignSelf: 'center',
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  activeToggleRowGlow: {
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  toggleRowLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRowSublabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
  },
  toggleSwitchOuter: {
    width: 38,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: '90%',
    alignSelf: 'center',
    marginVertical: 8,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoBannerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalCloseText: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    padding: 20,
  },
  docsH1: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 8,
  },
  docsH2: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 8,
  },
  docsPara: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
});
