/**
 * ImportProfileScreen — Paste and parse VPN protocol links.
 */
import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {parseProfileLink, isProfileValid} from '../services/profileParser';
import {vpnStore} from '../store/vpnStore';
import type {VpnProfile} from '../types/vpn';

interface Props {
  onBack: () => void;
}

export function ImportProfileScreen({onBack}: Props): React.JSX.Element {
  const [linkText, setLinkText] = useState('');
  const [parsedProfile, setParsedProfile] = useState<VpnProfile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    setParseError(null);
    setParsedProfile(null);

    const result = parseProfileLink(linkText);
    if (result.success && result.profile) {
      setParsedProfile(result.profile);
    } else {
      setParseError(result.error || 'Unknown parsing error');
    }
  }, [linkText]);

  const handleSave = useCallback(() => {
    if (!parsedProfile) return;

    if (!isProfileValid(parsedProfile)) {
      Alert.alert('Invalid Profile', 'Profile is missing required fields.');
      return;
    }

    vpnStore.addProfile(parsedProfile);
    vpnStore.setActiveProfile(parsedProfile);

    Alert.alert('Profile Saved', `"${parsedProfile.name}" has been saved and set as active.`, [
      {text: 'OK', onPress: onBack},
    ]);
  }, [parsedProfile, onBack]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Import Profile</Text>
            <View style={styles.backButton} />
          </View>

          {/* Input */}
          <Text style={styles.label}>Paste VPN link</Text>
          <TextInput
            style={styles.textInput}
            placeholder="vless://uuid@host:port?..."
            placeholderTextColor="#475569"
            value={linkText}
            onChangeText={setLinkText}
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.parseButton, !linkText.trim() && styles.disabledButton]}
            onPress={handleParse}
            disabled={!linkText.trim()}>
            <Text style={styles.parseButtonText}>Parse Link</Text>
          </TouchableOpacity>

          {/* Parse Error */}
          {parseError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Parse Error</Text>
              <Text style={styles.errorText}>{parseError}</Text>
            </View>
          )}

          {/* Parsed Profile */}
          {parsedProfile && (
            <View style={styles.profileCard}>
              <Text style={styles.profileTitle}>Parsed Profile</Text>
              <ProfileField label="Name" value={parsedProfile.name} />
              <ProfileField
                label="Protocol"
                value={parsedProfile.protocol.toUpperCase()}
              />
              <ProfileField
                label="Host"
                value={`${parsedProfile.host}:${parsedProfile.port}`}
              />
              {parsedProfile.uuid && (
                <ProfileField label="UUID" value={parsedProfile.uuid} />
              )}
              {parsedProfile.security && (
                <ProfileField label="Security" value={parsedProfile.security} />
              )}
              {parsedProfile.sni && (
                <ProfileField label="SNI" value={parsedProfile.sni} />
              )}
              {parsedProfile.publicKey && (
                <ProfileField label="Public Key" value={parsedProfile.publicKey} />
              )}
              {parsedProfile.shortId && (
                <ProfileField label="Short ID" value={parsedProfile.shortId} />
              )}
              {parsedProfile.flow && (
                <ProfileField label="Flow" value={parsedProfile.flow} />
              )}
              {parsedProfile.transport && (
                <ProfileField label="Transport" value={parsedProfile.transport} />
              )}

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save & Set Active</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Supported formats info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Supported formats</Text>
            <Text style={styles.infoText}>
              ✅ VLESS (vless://...){'\n'}
              🔜 VMess (vmess://...){'\n'}
              🔜 Trojan (trojan://...){'\n'}
              🔜 Shadowsocks (ss://...)
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={fieldStyles.row}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Text style={fieldStyles.value} numberOfLines={1} ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2D2D3F',
  },
  label: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
    color: '#F1F5F9',
    fontFamily: 'monospace',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
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
    color: '#3B82F6',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 14,
    color: '#F1F5F9',
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#2D2D3F',
  },
  parseButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  parseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#2D1B1B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FCA5A5',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FDA4AF',
  },
  profileCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 22,
  },
});
