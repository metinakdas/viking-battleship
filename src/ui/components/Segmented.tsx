import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radii, shadows, spacing } from '../theme';
import { AppText } from './AppText';

export type SegmentedOption<T extends string> = { value: T; label: string };

export type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** macOS tarzı bölümlü seçici: gömük ray, seçili parça beyaz ve gölgeli. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedProps<T>) {
  return (
    <View
      style={styles.track}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => (
        <Segment
          key={o.value}
          label={o.label}
          selected={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

function Segment({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.segment, selected ? styles.selected : hovered && styles.hovered]}
    >
      <AppText variant="label" tone={selected ? 'primary' : 'secondary'} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
    borderRadius: radii.input,
    backgroundColor: 'rgba(22, 32, 43, 0.07)',
    alignSelf: 'stretch',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.input - 3,
  },
  selected: { backgroundColor: '#ffffff', boxShadow: shadows.button },
  hovered: { backgroundColor: 'rgba(255, 255, 255, 0.5)' },
});
