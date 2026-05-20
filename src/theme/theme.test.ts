import {getStatusColors, getTheme, resolveThemeMode} from './theme';

describe('theme', () => {
  it('resolves system mode from the platform color scheme', () => {
    expect(resolveThemeMode('system', 'dark')).toBe('dark');
    expect(resolveThemeMode('system', 'light')).toBe('light');
    expect(resolveThemeMode('system', null)).toBe('light');
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
  });

  it('uses the clean light palette', () => {
    const theme = getTheme('light');

    expect(theme.colors.background).toBe('#F8F9FB');
    expect(theme.colors.surface).toBe('#FFFFFF');
    expect(theme.colors.primary).toBe('#7C3AED');
    expect(theme.colors.secondary).toBe('#C084FC');
    expect(theme.colors.accentGlow).toBe('rgba(124, 58, 237, 0.08)');
    expect(theme.radius.md).toBe(12);
  });

  it('uses the cyber dark palette', () => {
    const theme = getTheme('dark');

    expect(theme.colors.background).toBe('#050507');
    expect(theme.colors.primary).toBe('#8B5CF6');
    expect(theme.colors.secondary).toBe('#D946EF');
    expect(theme.colors.accentGlow).toBe('rgba(139, 92, 246, 0.15)');
  });

  it('includes Inter font family references', () => {
    const theme = getTheme('light');

    expect(theme.fonts.regular).toBe('Inter-Regular');
    expect(theme.fonts.bold).toBe('Inter-Bold');
    expect(theme.fonts.mono).toBe('monospace');
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
