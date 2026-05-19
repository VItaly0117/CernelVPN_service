import {getStatusColors, getTheme, resolveThemeMode} from './theme';

describe('theme', () => {
  it('resolves system mode from the platform color scheme', () => {
    expect(resolveThemeMode('system', 'dark')).toBe('dark');
    expect(resolveThemeMode('system', 'light')).toBe('light');
    expect(resolveThemeMode('system', null)).toBe('light');
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
  });

  it('uses a light Apple-like default palette', () => {
    const theme = getTheme('light');

    expect(theme.colors.background).toBe('#F5F6F8');
    expect(theme.colors.surface).toBe('#FFFFFF');
    expect(theme.colors.primary).toBe('#007AFF');
    expect(theme.radius.md).toBe(12);
  });

  it('maps status colors to semantic accents', () => {
    const theme = getTheme('light');

    expect(getStatusColors('connected', theme).accent).toBe(theme.colors.success);
    expect(getStatusColors('error', theme).accent).toBe(theme.colors.danger);
    expect(getStatusColors('permission_required', theme).accent).toBe(
      theme.colors.warning,
    );
  });
});
