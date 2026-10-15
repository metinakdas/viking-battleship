import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Avatar } from '@/features/auth';
import { aiOpponent } from '@/features/game/aiOpponent';
import { AI_LEVELS, type AiLevel } from '@/game';
import { t } from '@/i18n';
import { AppText, colors, radii, spacing, withAlpha } from '@/ui';

/** Zorluk derecesi: 1–3 Viking baltası. */
function Axes({ count }: { count: number }) {
  return (
    <View style={styles.axes} accessibilityLabel={`${count}/3`}>
      {[1, 2, 3].map((i) => (
        <Svg key={i} width={14} height={14} viewBox="0 0 16 16" aria-hidden>
          <Path
            d="M3 14 L11 6"
            stroke={i <= count ? colors.shipOutline : colors.textDisabled}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <Path
            d="M9 2 Q15 3 14 9 Q12 7 9.5 7.5 Q9.2 5 9 2 Z"
            fill={i <= count ? colors.accent : 'none'}
            stroke={i <= count ? colors.accent : colors.textDisabled}
            strokeWidth={1}
          />
        </Svg>
      ))}
    </View>
  );
}

/** Rakibini seç: her zorluk bir jarl — kalkanı, adı, balta derecesi ve savaş tarzı. */
export function JarlPicker({
  value,
  onChange,
}: {
  value: AiLevel;
  onChange: (l: AiLevel) => void;
}) {
  // Telefonda üç kutu yan yana sığmaz: her jarl bir satır (kalkan solda).
  const rows = useWindowDimensions().width < 560;
  return (
    <View
      style={[styles.root, rows && styles.rootRows]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('lobby.ai.pick')}
    >
      {AI_LEVELS.map((level, i) => (
        <JarlTile
          key={level}
          level={level}
          rank={i + 1}
          row={rows}
          selected={level === value}
          onPress={() => onChange(level)}
        />
      ))}
    </View>
  );
}

function JarlTile({
  level,
  rank,
  row,
  selected,
  onPress,
}: {
  level: AiLevel;
  rank: number;
  row: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const jarl = aiOpponent(level);
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityLabel={`${jarl.displayName}, ${t(`lobby.ai.levels.${level}`)}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.tile,
        row && styles.tileRow,
        hovered && styles.hovered,
        selected && styles.selected,
      ]}
    >
      <Avatar avatar={jarl.avatar} size={row ? 40 : 44} />
      <View style={row ? styles.rowText : styles.colText}>
        <AppText variant="bodyStrong" align={row ? 'left' : 'center'} numberOfLines={2}>
          {jarl.displayName}
        </AppText>
        <View style={styles.levelRow}>
          <Axes count={rank} />
          <AppText variant="caption" tone={selected ? 'accent' : 'muted'}>
            {t(`lobby.ai.levels.${level}`)}
          </AppText>
        </View>
        <AppText variant="caption" tone="secondary" align={row ? 'left' : 'center'}>
          {t(`lobby.ai.levelHints.${level}`)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  rootRows: { flexDirection: 'column', flexWrap: 'nowrap' },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowText: { flex: 1, gap: 2 },
  colText: { alignItems: 'center', gap: spacing.xs },
  tile: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  hovered: { backgroundColor: 'rgba(255, 255, 255, 0.85)' },
  selected: {
    borderColor: colors.gold,
    backgroundColor: withAlpha(colors.gold, 0.12),
    boxShadow: `0 0 0 3px ${withAlpha(colors.gold, 0.18)}`,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  axes: { flexDirection: 'row', gap: 1 },
});
