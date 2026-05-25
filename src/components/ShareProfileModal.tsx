import React from 'react';
import {View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type {VpnProfile} from '../types/vpn';
import {useResolvedTheme} from '../theme/theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  visible: boolean;
  profile: VpnProfile | null;
  onClose: () => void;
  themeMode: 'system' | 'light' | 'dark' | 'amoled';
}

export function ShareProfileModal({visible, profile, onClose, themeMode}: Props): React.JSX.Element | null {
  const theme = useResolvedTheme(themeMode);
  
  if (!profile) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, {backgroundColor: theme.colors.surface, borderColor: theme.colors.separator}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: theme.colors.text}]}>Share Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.subtitle, {color: theme.colors.secondaryText}]} numberOfLines={2}>
            {profile.name}
          </Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={profile.rawLink}
              size={Dimensions.get('window').width * 0.6}
              color={theme.colors.text}
              backgroundColor="transparent"
            />
          </View>

          <Text style={[styles.helperText, {color: theme.colors.tertiaryText}]}>
            Scan this QR code with the KernelVPN app on another device to import this profile instantly.
          </Text>

          <TouchableOpacity
            style={[styles.doneBtn, {backgroundColor: theme.colors.primary}]}
            onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    fontWeight: '500',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF', // Always white background for QR readability
    borderRadius: 16,
    marginBottom: 32,
    alignSelf: 'center',
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  doneBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
