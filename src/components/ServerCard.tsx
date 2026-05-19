/**
 * ServerCard — Displays the active VPN profile / server info.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {VpnProfile} from '../types/vpn';
import type {AppTheme} from '../theme/theme';

interface Props {
  profile: VpnProfile | null;
  theme: AppTheme;
}

export function ServerCard({profile, theme}: Props): React.JSX.Element {
  if (!profile) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.separator,
          },
        ]}>
        <Text style={[styles.noProfile, {color: theme.colors.secondaryText}]}>
          No profile selected
        </Text>
        <Text style={[styles.hint, {color: theme.colors.tertiaryText}]}>
          Import a VPN profile to get started
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.separator,
        },
      ]}>
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.protocolBadge,
            {
              backgroundColor: theme.colors.primarySoft,
              color: theme.colors.primary,
            },
          ]}>
          {profile.protocol.toUpperCase()}
        </Text>
        <Text style={[styles.name, {color: theme.colors.text}]} numberOfLines={1}>
          {profile.name}
        </Text>
      </View>
      <View style={styles.detailsRow}>
        <Text style={[styles.detail, {color: theme.colors.secondaryText}]}>
          {profile.host}:{profile.port}
        </Text>
        {profile.security && (
          <Text style={[styles.securityBadge, {color: theme.colors.success}]}>
            {profile.security}
          </Text>
        )}
      </View>
      {profile.sni && (
        <Text style={[styles.sniText, {color: theme.colors.tertiaryText}]}>
          SNI: {profile.sni}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noProfile: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  protocolBadge: {
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
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detail: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  securityBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 10,
    textTransform: 'uppercase',
  },
  sniText: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'monospace',
  },
});
