import { StyleSheet, View } from 'react-native';

import { colors, radii } from '../theme';

/** İnce ilerleme çubuğu (0–1). */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <View
      style={styles.track}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label}
    >
      <View style={[styles.fill, { width: `${v * 100}%` }, v === 1 && styles.done]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(22, 32, 43, 0.08)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.gold },
  done: { backgroundColor: colors.accent },
});
