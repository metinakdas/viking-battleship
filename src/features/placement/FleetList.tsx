import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';

import { ShipSprite } from '@/features/board';
import { FLEET, type Fleet, type ShipType } from '@/game';
import { t } from '@/i18n';
import { AppText, colors, Pill, radii, spacing, withAlpha } from '@/ui';

import { isPlaced } from './model';

const SPRITE_CELL = 18;

export type FleetListProps = {
  fleet: Fleet;
  selected: ShipType | null;
  onSelect: (ship: ShipType) => void;
  /** Satırı tahtaya sürüklemek için hareket (yerleştirme ekranı üretir). */
  dragGesture: (ship: ShipType) => GestureType;
};

/** Filo listesi: gemi silueti + ad + boyut + durum. Satır seçilir ya da tahtaya sürüklenir. */
export function FleetList({ fleet, selected, onSelect, dragGesture }: FleetListProps) {
  return (
    <View style={styles.list}>
      {FLEET.map(({ ship, size }) => (
        <GestureDetector key={ship} gesture={dragGesture(ship)}>
          <View>
            <FleetRow
              ship={ship}
              size={size}
              placed={isPlaced(fleet, ship)}
              selected={selected === ship}
              onPress={() => onSelect(ship)}
            />
          </View>
        </GestureDetector>
      ))}
    </View>
  );
}

function FleetRow({
  ship,
  size,
  placed,
  selected,
  onPress,
}: {
  ship: ShipType;
  size: number;
  placed: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const status = selected
    ? t('placement.status.selected')
    : placed
      ? t('placement.status.placed')
      : null;
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      aria-selected={selected}
      accessibilityLabel={t('placement.shipA11y', {
        ship: t(`ships.${ship}`),
        size,
        status: status ? `, ${status}` : '',
      })}
      style={[styles.row, hovered && styles.hovered, selected && styles.selected]}
    >
      <View style={[styles.sprite, placed && !selected && styles.placedSprite]}>
        <ShipSprite ship={ship} cell={SPRITE_CELL} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {t(`ships.${ship}`)}
        </AppText>
        <AppText variant="caption" tone="muted">
          {t('placement.cells', { size })}
        </AppText>
      </View>
      {selected ? (
        <Pill label={t('placement.status.selected')} tone="accent" />
      ) : placed ? (
        <Pill label={t('placement.status.placed')} tone="gold" dot />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: 'transparent',
    // Web: satır sürüklenebilir; metin seçimi ve tarayıcının kendi sürüklemesi karışmasın.
    userSelect: 'none',
    cursor: 'pointer',
  },
  hovered: { backgroundColor: 'rgba(255, 255, 255, 0.55)' },
  selected: {
    backgroundColor: withAlpha(colors.gold, 0.1),
    borderColor: withAlpha(colors.gold, 0.6),
  },
  sprite: { width: SPRITE_CELL * 5, alignItems: 'flex-start' },
  placedSprite: { opacity: 0.45 },
  text: { flex: 1, gap: 0 },
});
