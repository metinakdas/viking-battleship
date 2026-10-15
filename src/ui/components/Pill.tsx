import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { withAlpha } from '../color';
import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';

type Tone = 'neutral' | 'accent' | 'gold' | 'fire' | 'muted' | 'scene';

export type PillProps = {
  label: string;
  tone?: Tone;
  /** Solda küçük nokta (ör. hazır/çevrimiçi göstergesi). */
  dot?: boolean;
  /** Arka planı dolu (aktif adım gibi). */
  solid?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** [metin/kenar rengi, dolu arka plan] */
const toneColor: Record<Tone, string> = {
  neutral: colors.textSecondary,
  accent: colors.accent,
  gold: colors.goldDeep,
  fire: colors.fire,
  muted: colors.textMuted,
  scene: colors.onScene,
};

export function Pill({
  label,
  tone = 'neutral',
  dot = false,
  solid = false,
  icon,
  style,
}: PillProps) {
  const c = toneColor[tone];
  const fg = solid ? colors.textOnAccent : c;
  return (
    <View
      style={[
        styles.base,
        solid
          ? { backgroundColor: c, borderColor: c }
          : { borderColor: withAlpha(c, 0.3), backgroundColor: withAlpha(c, 0.1) },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      {icon}
      <AppText variant="label" style={{ color: fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
