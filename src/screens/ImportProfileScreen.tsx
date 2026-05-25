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
  StatusBar as NativeStatusBar,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import {parseProfileLink, isProfileValid} from '../services/profileParser';
import {fetchSubscription} from '../services/subscriptionService';
import {vpnStore, useVpnStore} from '../store/vpnStore';
import type {VpnProfile} from '../types/vpn';
import {useResolvedTheme, type AppTheme} from '../theme/theme';
import {androidHeaderTopPadding} from '../services/layoutService';
import {appLogger} from '../services/appLogger';

interface Props {
  onBack: () => void;
}

const HEADER_TOP_PADDING = androidHeaderTopPadding(
  Platform.OS,
  NativeStatusBar.currentHeight,
  12,
);

export function ImportProfileScreen({onBack}: Props): React.JSX.Element {
  const {themeMode} = useVpnStore();
  const theme = useResolvedTheme(themeMode);
  const [linkText, setLinkText] = useState('');
  const [parsedProfile, setParsedProfile] = useState<VpnProfile | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isFetchingSub, setIsFetchingSub] = useState(false);

  const handleParse = useCallback(async () => {
    Keyboard.dismiss();
    setParseError(null);
    setParsedProfile(null);

    const text = linkText.trim();
    if (!text) {return;}

    // Check if it's a subscription link
    if (text.startsWith('http://') || text.startsWith('https://')) {
      setIsFetchingSub(true);
      try {
        const subId = Date.now().toString();
        await fetchSubscription({
          id: subId,
          name: 'Subscription ' + subId.slice(-4),
          url: text,
          updatedAt: Date.now(),
        });
        Alert.alert(
          'Subscription Added',
          'Successfully downloaded proxy list.',
          [{text: 'OK', onPress: onBack}]
        );
      } catch (e: any) {
        setParseError('Failed to fetch subscription: ' + e.message);
        appLogger.error('profile-import', `Sub error: ${e.message}`);
      } finally {
        setIsFetchingSub(false);
      }
      return;
    }

    appLogger.info('profile-import', 'Initiating manual profile paste parse');

    const result = parseProfileLink(text);
    if (result.success && result.profile) {
      setParsedProfile(result.profile);
      appLogger.info('profile-import', `Profile parsed successfully: protocol=${result.profile.protocol}, host=${result.profile.host}`);
    } else {
      const errStr = result.error || 'Unknown parsing error';
      setParseError(errStr);
      appLogger.error('profile-import', `Profile parsing failed: ${errStr}`);
    }
  }, [linkText]);

  const handleSave = useCallback(() => {
    if (!parsedProfile) {return;}

    if (!isProfileValid(parsedProfile)) {
      const errStr = 'Profile is missing required fields.';
      Alert.alert('Invalid Profile', errStr);
      appLogger.error('profile-import', `Profile save failed: ${errStr}`);
      return;
    }

    vpnStore.addProfile(parsedProfile);
    vpnStore.setActiveProfile(parsedProfile);
    appLogger.info('profile-import', `Profile saved and activated: Name=${parsedProfile.name}`);

    Alert.alert(
      'Profile Saved',
      `"${parsedProfile.name}" is now the active KernelVPN profile.`,
      [{text: 'OK', onPress: onBack}],
    );
  }, [parsedProfile, onBack]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : 'padding'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={[styles.backText, {color: theme.colors.primary}]}>
                Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, {color: theme.colors.text}]}>
              Import Profile
            </Text>
            <View style={styles.backButton} />
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, {color: theme.colors.secondaryText}]}>
              VPN link
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.separator,
                  color: theme.colors.text,
                },
              ]}
              placeholder="vless://uuid@host:443?..."
              placeholderTextColor={theme.colors.tertiaryText}
              value={linkText}
              onChangeText={setLinkText}
              multiline
              numberOfLines={5}
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
              blurOnSubmit={true}
              onSubmitEditing={handleParse}
            />

            <TouchableOpacity
              style={[
                styles.parseButton,
                {backgroundColor: theme.colors.primary},
                !linkText.trim() && styles.disabledButton,
              ]}
              onPress={handleParse}
              disabled={!linkText.trim() || isFetchingSub}>
              {isFetchingSub ? (
                <ActivityIndicator color={'#FFFFFF'} />
              ) : (
                <Text style={styles.primaryButtonText}>Parse Link</Text>
              )}
            </TouchableOpacity>
          </View>

          {parseError && (
            <View
              style={[
                styles.messageCard,
                {
                  backgroundColor: theme.colors.dangerSoft,
                  borderColor: theme.colors.danger,
                },
              ]}>
              <Text style={[styles.messageTitle, {color: theme.colors.danger}]}>
                Parse Error
              </Text>
              <Text
                style={[
                  styles.messageText,
                  {color: theme.colors.secondaryText},
                ]}>
                {parseError}
              </Text>
            </View>
          )}

          {parsedProfile && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.separator,
                },
              ]}>
              <Text style={[styles.cardTitle, {color: theme.colors.text}]}>
                Parsed Profile
              </Text>
              <ProfileField theme={theme} label="Name" value={parsedProfile.name} />
              <ProfileField
                theme={theme}
                label="Protocol"
                value={parsedProfile.protocol.toUpperCase()}
              />
              <ProfileField
                theme={theme}
                label="Server"
                value={`${parsedProfile.host}:${parsedProfile.port}`}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {backgroundColor: theme.colors.success},
                ]}
                onPress={handleSave}>
                <Text style={styles.primaryButtonText}>Save and Activate</Text>
              </TouchableOpacity>
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
              Supported formats
            </Text>
            {['VLESS', 'VMess', 'Trojan', 'Shadowsocks'].map(item => (
              <View key={item} style={styles.formatRow}>
                <View
                  style={[
                    styles.formatDot,
                    {backgroundColor: theme.colors.primary},
                  ]}
                />
                <Text
                  style={[
                    styles.formatText,
                    {color: theme.colors.secondaryText},
                  ]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileField({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: AppTheme;
}): React.JSX.Element {
  return (
    <View style={[fieldStyles.row, {borderBottomColor: theme.colors.separator}]}>
      <Text style={[fieldStyles.label, {color: theme.colors.secondaryText}]}>
        {label}
      </Text>
      <Text
        style={[fieldStyles.value, {color: theme.colors.text}]}
        numberOfLines={1}
        ellipsizeMode="middle">
        {value}
      </Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    fontFamily: 'monospace',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

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
  section: {
    marginTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 18,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 14,
    fontSize: 14,
    fontFamily: 'monospace',
    minHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
  },
  parseButton: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  messageCard: {
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  saveButton: {
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  formatDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
  },
  formatText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
