import React, {useEffect, useState, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SectionList,
  Platform,
  StatusBar as NativeStatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useVpnStore, vpnStore} from '../store/vpnStore';
import {useResolvedTheme, type AppTheme} from '../theme/theme';
import {androidHeaderTopPadding} from '../services/layoutService';
import type {VpnProfile} from '../types/vpn';
import {pingAllProfiles, connectToBestProfile} from '../services/pingService';
import {connect} from '../services/vpnService';
import {ShareProfileModal} from '../components/ShareProfileModal';

interface Props {
  onBack: () => void;
  onNavigate?: (screen: any) => void;
}

const HEADER_TOP_PADDING = androidHeaderTopPadding(
  Platform.OS,
  NativeStatusBar.currentHeight,
  12,
);

function getPingColor(ping: number | undefined, theme: AppTheme): string {
  if (ping === undefined || ping < 0) return theme.colors.tertiaryText;
  if (ping < 100) return theme.colors.success;
  if (ping < 250) return theme.colors.warning;
  return theme.colors.danger;
}

function getPingText(ping: number | undefined): string {
  if (ping === undefined) return 'Untested';
  if (ping < 0) return 'Timeout';
  return `${ping} ms`;
}

export function ServerListScreen({onBack, onNavigate}: Props): React.JSX.Element {
  const state = useVpnStore();
  const theme = useResolvedTheme(state.themeMode);
  const [isPinging, setIsPinging] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sharingProfile, setSharingProfile] = useState<VpnProfile | null>(null);

  const profiles = state.savedProfiles;
  const activeProfileId = state.activeProfile?.id;

  const recentProfiles = state.serverHistory
    .map(id => profiles.find(p => p.id === id))
    .filter((p): p is VpnProfile => p !== undefined);

  const sections = [];
  if (recentProfiles.length > 0) {
    sections.push({title: 'Recent Servers', data: recentProfiles});
  }
  if (profiles.length > 0) {
    sections.push({title: 'All Servers', data: profiles});
  }

  const handlePingAll = async () => {
    setIsPinging(true);
    await pingAllProfiles();
    setIsPinging(false);
  };

  const handleConnectToBest = async () => {
    setIsConnecting(true);
    try {
      const best = await connectToBestProfile();
      if (best) {
        vpnStore.setActiveProfile(best);
        await connect(best);
        Alert.alert('Smart Connect', `Connected to the fastest server: ${best.name}`);
        onBack();
      } else {
        Alert.alert('Smart Connect', 'No valid servers found. Try testing ping first.');
      }
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSelectProfile = async (profile: VpnProfile) => {
    vpnStore.setActiveProfile(profile);
    Alert.alert(
      'Profile Selected',
      `"${profile.name}" is now the active profile.`,
      [
        {
          text: 'Connect Now',
          onPress: async () => {
            try {
              await connect(profile);
              onBack();
            } catch (e) {}
          },
        },
        {text: 'OK', style: 'cancel', onPress: onBack},
      ],
    );
  };

  const renderItem = useCallback(
    ({item}: {item: VpnProfile}) => {
      const isActive = item.id === activeProfileId;
      const pingColor = getPingColor(item.lastPingMs, theme);

      return (
        <TouchableOpacity
          style={[
            styles.serverCard,
            {
              backgroundColor: isActive
                ? theme.colors.primarySoft
                : theme.colors.surface,
              borderColor: isActive ? theme.colors.primary : theme.colors.separator,
            },
          ]}
          activeOpacity={0.7}
          onPress={() => handleSelectProfile(item)}
          onLongPress={() => setSharingProfile(item)}>
          <View style={{flex: 1}}>
            <Text style={[styles.serverName, {color: theme.colors.text}]}>
              {item.name}
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8}}>
              <Text style={[styles.serverProtocol, {color: theme.colors.secondaryText}]}>
                {item.protocol.toUpperCase()}
              </Text>
              <Text style={[styles.serverAddress, {color: theme.colors.tertiaryText}]} numberOfLines={1}>
                {item.host}:{item.port}
              </Text>
            </View>
          </View>

          <View style={styles.pingContainer}>
            <View
              style={[
                styles.pingIndicator,
                {backgroundColor: pingColor},
              ]}
            />
            <Text
              style={[
                styles.pingText,
                {color: pingColor},
              ]}>
              {getPingText(item.lastPingMs)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [activeProfileId, theme],
  );

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, {color: theme.colors.primary}]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.text}]}>Servers</Text>
        <TouchableOpacity onPress={() => onNavigate && onNavigate('QRScanner')} style={styles.backButton}>
          <Text style={[styles.backText, {color: theme.colors.primary, textAlign: 'right'}]}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator},
          ]}
          onPress={handlePingAll}
          disabled={isPinging}>
          {isPinging ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.actionButtonText, {color: theme.colors.primary}]}>
              Test All Pings
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            {backgroundColor: theme.colors.primary, borderColor: theme.colors.primary},
          ]}
          onPress={handleConnectToBest}
          disabled={isConnecting}>
          {isConnecting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.actionButtonText, {color: '#FFF'}]}>
              Smart Connect
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={({section: {title}}) => (
          <Text style={[styles.sectionTitle, {color: theme.colors.secondaryText, fontFamily: theme.fonts.bold}]}>
            {title}
          </Text>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: theme.colors.secondaryText}]}>
              No server profiles available.
            </Text>
            <Text style={[styles.emptySubText, {color: theme.colors.tertiaryText}]}>
              Import a profile or subscription first.
            </Text>
          </View>
        }
      />
      
      <ShareProfileModal 
        visible={sharingProfile !== null} 
        profile={sharingProfile} 
        onClose={() => setSharingProfile(null)} 
        themeMode={state.themeMode} 
      />
    </SafeAreaView>
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
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '700',
  },
  serverProtocol: {
    fontSize: 12,
    fontWeight: '800',
  },
  serverAddress: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  pingContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
  },
  pingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  pingText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
