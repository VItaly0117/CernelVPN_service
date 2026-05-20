import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  useColorScheme,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { appLogger } from '../services/appLogger';
import { generateDiagnosticReport } from '../services/diagnosticReport';
import { vpnStore } from '../store/vpnStore';
import { getTheme, resolveThemeMode, AppTheme } from '../theme/theme';

interface InnerProps {
  theme: AppTheme;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryInner extends Component<InnerProps, State> {
  constructor(props: InnerProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    appLogger.error('frontend', `Unhandled React Component Crash: ${error.message}`, {
      raw: `${error.stack || ''}\nComponent Stack: ${errorInfo.componentStack || ''}`,
    });
  }

  handleCopyReport = async (): Promise<void> => {
    try {
      const state = vpnStore.getState();
      const diagResult = {
        timestamp: Date.now(),
        androidVersion: 'Unknown',
        vpnPermissionGranted: state.status === 'connected',
        serviceRunning: state.status === 'connected' || state.status === 'connecting',
        coreIntegrated: true,
        coreRunning: state.status === 'connected',
        activeProfileName: state.activeProfile?.name ?? undefined,
        selectedProtocol: state.activeProfile?.protocol ?? undefined,
        panelConnectionStatus: state.panelSettings ? 'configured' : 'not_configured',
        splitTunnelMode: state.splitTunnelMode,
        splitTunnelRuleCount: state.splitTunnelRules.length,
        lastError: state.lastError || this.state.error?.message || undefined,
      };

      const report = generateDiagnosticReport(diagResult);
      await Share.share({
        title: 'KernelVPN Frontend Crash Report',
        message: report,
      });
    } catch (e: unknown) {
      console.warn('Failed to share diagnostic report', e);
    }
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { theme } = this.props;
      const errorMessage = this.state.error?.message || 'An unexpected rendering or component exception occurred.';
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <StatusBar
            barStyle={theme.isDark ? 'light-content' : 'dark-content'}
            backgroundColor={theme.colors.background}
          />
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={[styles.errorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.separator }]}>
              <View style={[styles.dangerIconContainer, { backgroundColor: theme.colors.dangerSoft }]}>
                <Text style={[styles.dangerIconText, { color: theme.colors.danger }]}>⚠</Text>
              </View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Frontend error</Text>
              <Text style={[styles.subtitle, { color: theme.colors.secondaryText }]}>
                Something went wrong in the application UI. You can copy the diagnostic report to send in chat for fixing.
              </Text>

              <View style={[styles.codeBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.separator }]}>
                <Text style={[styles.codeText, { color: theme.colors.danger }]}>
                  {errorMessage}
                </Text>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.8}
                  onPress={this.handleCopyReport}
                >
                  <Text style={styles.primaryButtonText}>Copy diagnostic report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.colors.separator }]}
                  activeOpacity={0.8}
                  onPress={this.handleReset}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
                    Go home / Retry
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: { children: ReactNode }): React.JSX.Element {
  const systemScheme = useColorScheme();
  const theme = getTheme(resolveThemeMode(vpnStore.getState().themeMode, systemScheme));

  return (
    <ErrorBoundaryInner theme={theme}>
      {children}
    </ErrorBoundaryInner>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dangerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dangerIconText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'sans-serif-condensed',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  codeBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
