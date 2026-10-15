import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '../theme';

type Tone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'disabled'
  | 'accent'
  | 'gold'
  | 'fire'
  | 'onAccent'
  | 'onScene'
  | 'onSceneMuted';

const toneColors: Record<Tone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  disabled: colors.textDisabled,
  accent: colors.accent,
  gold: colors.goldDeep,
  fire: colors.fire,
  onAccent: colors.textOnAccent,
  onScene: colors.onScene,
  onSceneMuted: colors.onSceneMuted,
};

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
};

/** Uygulamadaki tüm metinler bunu kullanır; ham <Text> yerine. */
export function AppText({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        typography[variant],
        { color: toneColors[tone] },
        align && { textAlign: align },
        styles.base,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // Android'de Inter'in üst boşluğunu kırpmaz; dikey hizalama web ile tutarlı kalır.
  base: { includeFontPadding: false },
});
