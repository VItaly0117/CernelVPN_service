/**
 * ServerCard — Displays the active VPN profile / server info with enhanced visuals.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import type {VpnProfile} from '../types/vpn';
import type {AppTheme} from '../theme/theme';

interface Props {
  profile: VpnProfile | null;
  theme: AppTheme;
}

/**
 * Simple IP-to-flag mapping for common VPN server regions.
 * Falls back to 🌐 for unknown ranges.
 */
function getServerFlag(host: string): string {
  // Common VPN server location prefixes
  if (host.startsWith('185.') || host.startsWith('31.')) {return 'NL';}
  if (host.startsWith('34.') || host.startsWith('35.')) {return 'US';}
  if (host.startsWith('51.') || host.startsWith('52.')) {return 'GB';}
  if (host.startsWith('45.')) {return 'DE';}
  if (host.startsWith('103.')) {return 'SG';}
  if (host.startsWith('194.') || host.startsWith('195.')) {return 'FI';}
  return 'GL';
}

export function ServerCard({profile, theme}: Props): React.JSX.Element {
  if (!profile) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.isDark
              ? 'rgba(255,255,255,0.03)'
              : theme.colors.surface,
            borderColor: theme.colors.separator,
          },
        ]}>
        <Text
          style={[
            styles.noProfile,
            {color: theme.colors.secondaryText, fontFamily: theme.fonts.medium},
          ]}>
          No profile selected
        </Text>
        <Text
          style={[
            styles.hint,
            {color: theme.colors.tertiaryText, fontFamily: theme.fonts.regular},
          ]}>
          Import a VPN profile to get started
        </Text>
      </View>
    );
  }

  const flag = getServerFlag(profile.host);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.isDark
            ? 'rgba(255,255,255,0.03)'
            : theme.colors.surface,
          borderColor: theme.colors.separator,
        },
      ]}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.regionBadge,
            {backgroundColor: theme.colors.secondarySoft},
          ]}>
          <Text
            style={[
              styles.regionText,
              {color: theme.colors.secondary, fontFamily: theme.fonts.bold},
            ]}>
            {flag}
          </Text>
        </View>
        <View style={styles.nameWrap}>
          <Text
            style={[
              styles.name,
              {color: theme.colors.text, fontFamily: theme.fonts.bold},
            ]}
            numberOfLines={1}>
            {profile.name}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.protocolBadge,
                {backgroundColor: theme.colors.primarySoft},
              ]}>
              <Text
                style={[
                  styles.protocolText,
                  {color: theme.colors.primary, fontFamily: theme.fonts.semiBold},
                ]}>
                {profile.protocol.toUpperCase()}
              </Text>
            </View>
            {profile.security && (
              <View
                style={[
                  styles.securityBadge,
                  {backgroundColor: theme.colors.successSoft},
                ]}>
                <Text
                  style={[
                    styles.securityText,
                    {color: theme.colors.success, fontFamily: theme.fonts.semiBold},
                  ]}>
                  {profile.security.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.detailsRow}>
        <Text
          style={[
            styles.detail,
            {color: theme.colors.secondaryText, fontFamily: theme.fonts.mono},
          ]}>
          {profile.host}:{profile.port}
        </Text>
      </View>
      {profile.sni && (
        <Text
          style={[
            styles.sniText,
            {color: theme.colors.tertiaryText, fontFamily: theme.fonts.mono},
          ]}>
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
    fontSize: 15,
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
    marginBottom: 10,
  },
  regionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  protocolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  protocolText: {
    fontSize: 10,
    fontWeight: '700',
  },
  securityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  securityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detail: {
    fontSize: 12,
  },
  sniText: {
    fontSize: 11,
    marginTop: 4,
  },
});
