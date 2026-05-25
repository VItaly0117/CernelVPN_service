import React from 'react';
import { Modal, SafeAreaView, ScrollView, View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import type { AppTheme } from '../theme/theme';

interface DocumentationModalProps {
  visible: boolean;
  onClose: () => void;
  theme: AppTheme;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ visible, onClose, theme }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: theme.colors.separator,
              backgroundColor: theme.colors.surface,
              paddingTop: Platform.OS === 'android' ? 24 : 10,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.colors.text, fontFamily: theme.fonts.extraBold }]}>
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
            onPress={onClose}
          >
            <Text style={[styles.menuCloseText, { color: theme.colors.text, fontSize: 20, lineHeight: 22 }]}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={true}>
          <Text style={[styles.docsH1, { color: theme.colors.primary, fontFamily: theme.fonts.extraBold }]}>KernelVPN Core Architecture</Text>
          <Text style={[styles.docsPara, { color: theme.colors.secondaryText, fontFamily: theme.fonts.medium }]}>KernelVPN bridges a native Android VPN Service wrapping the ultra-fast Sing-box routing engine. All network policies, routing rules, DNS parameters, and blocked application namespaces are compiled locally into a secure binary execution config.</Text>

          <Text style={[styles.docsH2, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>📶 Native Samsung Handover Fix</Text>
          <Text style={[styles.docsPara, { color: theme.colors.secondaryText, fontFamily: theme.fonts.medium }]}>Samsung devices strictly enforce target socket bindings inside their active interface drivers. When transitioning between Wi-Fi and Mobile Networks, standard Android VPN handles this poorly, resulting in data blackholes.{"\n\n"}KernelVPN fixes this by tracking network capabilities dynamically. When default interfaces switch, we dynamically notify the active VpnService, re-binding underlying network handlers in real-time without tearing down the cryptographic tunnel.</Text>

          <Text style={[styles.docsH2, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>🚫 DNS-Level Ad Blocking (DNS DoH)</Text>
          <Text style={[styles.docsPara, { color: theme.colors.secondaryText, fontFamily: theme.fonts.medium }]}>When DNS AdBlocker is active, the Sing-box config detours all DNS packets to a highly secure DNS-over-HTTPS (DoH) tunnel connected to AdGuard resolvers. Trackers, ads, and telemetry queries are black-listed and blocked locally on your device, preventing bandwidth loss and tracking.</Text>

          <Text style={[styles.docsH2, { color: theme.colors.text, fontFamily: theme.fonts.bold }]}>⇄ Split Tunneling Rule-Set</Text>
          <Text style={[styles.docsPara, { color: theme.colors.secondaryText, fontFamily: theme.fonts.medium }]}>Split tunneling allows detouring specific applications through the secure proxy node while keeping banking apps or domestic sites on direct local routing. Network-Aware mode loads dedicated rulesets tailored automatically for your active Wi-Fi or cellular networks.</Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 20,
  },
  menuCloseButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuCloseText: {
    lineHeight: 20,
  },
  modalContent: {
    padding: 20,
    gap: 12,
  },
  docsH1: {
    fontSize: 24,
    marginBottom: 12,
  },
  docsH2: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 6,
  },
  docsPara: {
    fontSize: 14,
    lineHeight: 20,
  },
});
