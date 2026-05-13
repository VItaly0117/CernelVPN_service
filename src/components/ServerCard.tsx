/**
 * ServerCard — Displays the active VPN profile / server info.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {VpnProfile} from '../types/vpn';

interface Props {
  profile: VpnProfile | null;
}

export function ServerCard({profile}: Props): React.JSX.Element {
  if (!profile) {
    return (
      <View style={styles.card}>
        <Text style={styles.noProfile}>No profile selected</Text>
        <Text style={styles.hint}>
          Import a VPN profile to get started
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.protocolBadge}>
          {profile.protocol.toUpperCase()}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {profile.name}
        </Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={styles.detail}>
          {profile.host}:{profile.port}
        </Text>
        {profile.security && (
          <Text style={styles.securityBadge}>{profile.security}</Text>
        )}
      </View>
      {profile.sni && (
        <Text style={styles.sniText}>SNI: {profile.sni}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  noProfile: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  protocolBadge: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
    overflow: 'hidden',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detail: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  securityBadge: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 10,
    textTransform: 'uppercase',
  },
  sniText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'monospace',
  },
});
