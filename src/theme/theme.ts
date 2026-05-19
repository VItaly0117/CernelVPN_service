import {useColorScheme} from 'react-native';
import type {VpnStatus} from '../types/vpn';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface AppTheme {
  mode: ResolvedTheme;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    elevated: string;
    text: string;
    secondaryText: string;
    tertiaryText: string;
    separator: string;
    primary: string;
    primarySoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    shadow: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): ResolvedTheme {
  if (mode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

export function getTheme(mode: ResolvedTheme): AppTheme {
  const isDark = mode === 'dark';

  return {
    mode,
    isDark,
    colors: isDark
      ? {
          background: '#0B0C0F',
          surface: '#17191F',
          elevated: '#22252D',
          text: '#F5F7FA',
          secondaryText: '#B6BCC7',
          tertiaryText: '#7E8796',
          separator: '#30343D',
          primary: '#0A84FF',
          primarySoft: '#112A44',
          success: '#32D74B',
          successSoft: '#14351F',
          warning: '#FFD60A',
          warningSoft: '#3A3210',
          danger: '#FF453A',
          dangerSoft: '#3A1716',
          shadow: '#000000',
        }
      : {
          background: '#F5F6F8',
          surface: '#FFFFFF',
          elevated: '#FFFFFF',
          text: '#111317',
          secondaryText: '#5E6673',
          tertiaryText: '#8A93A1',
          separator: '#E5E7EB',
          primary: '#007AFF',
          primarySoft: '#E7F1FF',
          success: '#248A3D',
          successSoft: '#E8F7ED',
          warning: '#B7791F',
          warningSoft: '#FFF4D7',
          danger: '#D92D20',
          dangerSoft: '#FDECEC',
          shadow: '#0F172A',
        },
    radius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 22,
    },
    spacing: {
      xs: 6,
      sm: 10,
      md: 16,
      lg: 22,
      xl: 28,
    },
  };
}

export function getStatusColors(
  status: VpnStatus,
  theme: AppTheme,
): {accent: string; soft: string} {
  switch (status) {
    case 'connected':
      return {accent: theme.colors.success, soft: theme.colors.successSoft};
    case 'connecting':
    case 'disconnecting':
      return {accent: theme.colors.primary, soft: theme.colors.primarySoft};
    case 'permission_required':
      return {accent: theme.colors.warning, soft: theme.colors.warningSoft};
    case 'error':
      return {accent: theme.colors.danger, soft: theme.colors.dangerSoft};
    case 'disconnected':
    default:
      return {accent: theme.colors.tertiaryText, soft: theme.colors.surface};
  }
}

export function useResolvedTheme(mode: ThemeMode): AppTheme {
  const systemScheme = useColorScheme();
  return getTheme(resolveThemeMode(mode, systemScheme));
}
