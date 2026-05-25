import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar as NativeStatusBar,
  Share,
} from 'react-native';
import {useVpnStore} from '../store/vpnStore';
import {useResolvedTheme, type AppTheme} from '../theme/theme';
import {appLogger, getLogs, subscribeToLogs, type LogEvent} from '../services/appLogger';
import {androidHeaderTopPadding} from '../services/layoutService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTranslation} from 'react-i18next';

const HEADER_TOP_PADDING = androidHeaderTopPadding(
  Platform.OS,
  NativeStatusBar.currentHeight,
  12,
);

export function EventLogScreen({onBack}: {onBack: () => void}): React.JSX.Element {
  const {t} = useTranslation();
  const state = useVpnStore();
  const theme = useResolvedTheme(state.themeMode);
  const [logs, setLogs] = useState<LogEvent[]>(getLogs());

  useEffect(() => {
    const unsub = subscribeToLogs(setLogs);
    return () => {
      unsub();
    };
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const json = appLogger.exportAsJson?.();
      if (!json) {return;}
      await Share.share({
        message: json,
        title: 'KernelVPN Logs',
      });
    } catch {}
  }, []);

  const renderLog = ({item}: {item: LogEvent}) => {
    const isError = item.level === 'error';
    const isWarn = item.level === 'warn';
    const color = isError
      ? theme.colors.danger
      : isWarn
        ? '#FFA000'
        : theme.colors.text;
    
    return (
      <View style={[styles.logItem, {borderBottomColor: theme.colors.separator}]}>
        <View style={styles.logHeader}>
          <Text style={[styles.logTime, {color: theme.colors.tertiaryText}]}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
          <Text style={[styles.logSource, {backgroundColor: theme.colors.surface, color: theme.colors.secondaryText}]}>
            {item.source}
          </Text>
        </View>
        <Text style={[styles.logMessage, {color}]} selectable>
          {item.message}
        </Text>
        {item.raw && (
          <Text style={[styles.logRaw, {color: theme.colors.tertiaryText}]} selectable>
            {item.raw}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, {color: theme.colors.primary}]}>{t('common.back', 'Back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: theme.colors.text}]}>{t('settings.event_log', 'Event Log')}</Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
          <MaterialCommunityIcons name="export-variant" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: HEADER_TOP_PADDING,
    paddingBottom: 12,
  },
  backButton: {width: 60},
  backText: {fontSize: 16, fontWeight: '700'},
  title: {fontSize: 20, fontWeight: '800'},
  exportButton: {width: 60, alignItems: 'flex-end'},
  listContent: {padding: 16, paddingBottom: 40},
  logItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logTime: {fontSize: 11, fontWeight: '500'},
  logSource: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  logMessage: {fontSize: 13, lineHeight: 18},
  logRaw: {fontSize: 11, marginTop: 4, fontFamily: 'Courier'},
});
