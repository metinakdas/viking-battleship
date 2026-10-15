import { Pressable, StyleSheet, View } from 'react-native';

import { withAlpha } from '../color';
import { colors, shadows, spacing } from '../theme';
import { AppText } from './AppText';

export type ToggleProps = {
  label: string;
  hint?: string;
  value: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
};

/** macOS tarzı anahtar: açıkken altın ray. Salt okunur gösterim için onChange vermeyin. */
export function Toggle({ label, hint, value, onChange, disabled }: ToggleProps) {
  const readOnly = !onChange || disabled;
  return (
    <Pressable
      role="switch"
      aria-checked={value}
      aria-disabled={readOnly}
      accessibilityLabel={label}
      disabled={readOnly}
      onPress={() => onChange?.(!value)}
      style={styles.row}
    >
      <View style={styles.text}>
        <AppText variant="label" tone={readOnly && disabled ? 'disabled' : 'primary'}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.track, value ? styles.on : styles.off, readOnly && styles.readOnly]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  text: { flex: 1 },
  track: { width: 40, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  on: { backgroundColor: colors.gold },
  off: { backgroundColor: withAlpha(colors.text, 0.15) },
  readOnly: { opacity: 0.6 },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    boxShadow: shadows.button,
  },
  thumbOn: { transform: [{ translateX: 16 }] },
});
