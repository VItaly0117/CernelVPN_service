/**
 * ActionRow — A tappable row for navigation actions on the home screen.
 */
import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View} from 'react-native';
import type {AppTheme} from '../theme/theme';

interface Props {
  label: string;
  subtitle?: string;
  onPress: () => void;
  icon?: string;
  theme: AppTheme;
}

export function ActionRow({
  label,
  subtitle,
  onPress,
  icon,
  theme,
}: Props): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: theme.isDark
            ? 'rgba(255,255,255,0.03)'
            : theme.colors.surface,
          borderColor: theme.colors.separator,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.left}>
        {icon && (
          <View
            style={[
              styles.iconWrap,
              {backgroundColor: theme.colors.primarySoft},
            ]}>
            <Text style={[styles.icon, {color: theme.colors.primary}]}>
              {icon}
            </Text>
          </View>
        )}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.label,
              {color: theme.colors.text, fontFamily: theme.fonts.semiBold},
            ]}>
            {label}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {color: theme.colors.tertiaryText, fontFamily: theme.fonts.regular},
              ]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Text style={[styles.chevron, {color: theme.colors.tertiaryText}]}>
        ›
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 15,
    fontWeight: '800',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
});
