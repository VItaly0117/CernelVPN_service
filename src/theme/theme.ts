import {useColorScheme} from 'react-native';
import type {VpnStatus} from '../types/vpn';

export type ThemeMode = 'system' | 'light' | 'dark' | 'amoled';
export type ResolvedTheme = 'light' | 'dark' | 'amoled';

export interface AppFonts {
  regular: string;
  medium: string;
  semiBold: string;
  bold: string;
  extraBold: string;
  mono: string;
}

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
    secondary: string;
    secondarySoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    shadow: string;
    accentGlow: string;
  };
  fonts: AppFonts;
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
  const isDark = mode === 'dark' || mode === 'amoled';

  if (mode === 'amoled') {
    return {
      mode,
      isDark: true,
      colors: {
        background: '#000000',
        surface: '#090909',
        elevated: '#111111',
        text: '#F0F2F5',
        secondaryText: '#8899AA',
        tertiaryText: '#556677',
        separator: '#181818',
        primary: '#8B5CF6',
        primarySoft: '#130D22',
        secondary: '#D946EF',
        secondarySoft: '#1A0820',
        success: '#00E676',
        successSoft: '#001A0D',
        warning: '#FFAB00',
        warningSoft: '#1A1200',
        danger: '#FF1744',
        dangerSoft: '#1A0008',
        shadow: '#000000',
        accentGlow: 'rgba(139, 92, 246, 0.2)',
      },
      fonts: {
        regular: 'Play-Regular',
        medium: 'Play-Regular',
        semiBold: 'Play-Bold',
        bold: 'Play-Bold',
        extraBold: 'Play-Bold',
        mono: 'Play-Regular',
      },
      radius: {sm: 8, md: 12, lg: 16, xl: 22},
      spacing: {xs: 6, sm: 10, md: 16, lg: 22, xl: 28},
    };
  }

  return {
    mode,
    isDark,
    colors: isDark
      ? {
          background: '#050507',
          surface: '#0D0E12',
          elevated: '#15171D',
          text: '#F0F2F5',
          secondaryText: '#9BA3B2',
          tertiaryText: '#5C6370',
          separator: '#1E2028',
          primary: '#8B5CF6',
          primarySoft: '#161129',
          secondary: '#D946EF',
          secondarySoft: '#260B2A',
          success: '#00E676',
          successSoft: '#002E18',
          warning: '#FFAB00',
          warningSoft: '#2A1F00',
          danger: '#FF1744',
          dangerSoft: '#2A0810',
          shadow: '#000000',
          accentGlow: 'rgba(139, 92, 246, 0.15)',
        }
      : {
          background: '#F8F9FB',
          surface: '#FFFFFF',
          elevated: '#FFFFFF',
          text: '#0F1419',
          secondaryText: '#536471',
          tertiaryText: '#8B98A5',
          separator: '#EFF3F4',
          primary: '#7C3AED',
          primarySoft: '#F5F3FF',
          secondary: '#C084FC',
          secondarySoft: '#FAF5FF',
          success: '#00A63E',
          successSoft: '#E6F9ED',
          warning: '#CC8400',
          warningSoft: '#FFF7E6',
          danger: '#DC2626',
          dangerSoft: '#FEF2F2',
          shadow: '#1A1A2E',
          accentGlow: 'rgba(124, 58, 237, 0.08)',
        },
    fonts: {
      regular: 'Play-Regular',
      medium: 'Play-Regular',
      semiBold: 'Play-Bold',
      bold: 'Play-Bold',
      extraBold: 'Play-Bold',
      mono: 'Play-Regular',
    },
    radius: {sm: 8, md: 12, lg: 16, xl: 22},
    spacing: {xs: 6, sm: 10, md: 16, lg: 22, xl: 28},
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
  const resolved = resolveThemeMode(mode, systemScheme);
  return getTheme(resolved);
}
