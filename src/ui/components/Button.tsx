import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, opacity, radii, shadows, spacing, typography } from '../theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'sceneGhost';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  /** Etiketin solunda (ör. SVG ikon). */
  icon?: ReactNode;
  /** Klavye kısayolu ipucu, ör. "R". Sadece gösterim; dinleme ekranın işi. */
  shortcut?: string;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  shortcut,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = Boolean(disabled) || loading;
  const v = isDisabled ? disabledStyle : variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: v.bg, borderColor: v.border },
        v.shadow && { boxShadow: shadows.button },
        hovered && !isDisabled && { backgroundColor: v.hoverBg },
        pressed && !isDisabled && { opacity: opacity.pressed, transform: [{ scale: 0.98 }] },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <AppText variant="button" style={{ color: v.text }} numberOfLines={1}>
            {label}
          </AppText>
          {shortcut ? (
            <View style={[styles.kbd, { borderColor: v.text }]}>
              <AppText variant="caption" style={{ color: v.text }}>
                {shortcut}
              </AppText>
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

type VariantStyle = {
  bg: string;
  hoverBg: string;
  border: string;
  text: string;
  shadow: boolean;
};

const variants: Record<Variant, VariantStyle> = {
  primary: {
    bg: colors.accent,
    hoverBg: colors.accentHover,
    border: colors.accentHover,
    text: colors.textOnAccent,
    shadow: true,
  },
  secondary: {
    bg: colors.glassStrong,
    hoverBg: '#ffffff',
    border: colors.hairlineStrong,
    text: colors.text,
    shadow: true,
  },
  ghost: {
    bg: 'transparent',
    hoverBg: 'rgba(22, 32, 43, 0.06)',
    border: 'transparent',
    text: colors.textSecondary,
    shadow: false,
  },
  /** Koyu sahne (lobi) üstünde metin buton. */
  sceneGhost: {
    bg: 'transparent',
    hoverBg: 'rgba(255, 246, 230, 0.12)',
    border: 'transparent',
    text: colors.onScene,
    shadow: false,
  },
};

const disabledStyle: VariantStyle = {
  bg: 'rgba(22, 32, 43, 0.06)',
  hoverBg: 'rgba(22, 32, 43, 0.06)',
  border: colors.hairline,
  text: colors.textDisabled,
  shadow: false,
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  md: { minHeight: 40, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  lg: { minHeight: 52, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  fullWidth: { alignSelf: 'stretch' },
  icon: { marginRight: spacing.xxs },
  kbd: {
    minWidth: typography.caption.lineHeight + 4,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    opacity: 0.6,
  },
});
