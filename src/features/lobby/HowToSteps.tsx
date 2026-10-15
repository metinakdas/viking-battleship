import { StyleSheet, View } from 'react-native';

import { AppText, colors, spacing, withAlpha } from '@/ui';

/** Kısa "nasıl oynanır" akışı: altın numaralı adımlar, aralarında ince çizgi. */
export function HowToSteps({ steps }: { steps: readonly string[] }) {
  return (
    <View style={styles.root} accessibilityRole="list">
      {steps.map((s, i) => (
        <View key={s} style={styles.step} accessibilityRole="text">
          <View style={styles.rail}>
            <View style={styles.num}>
              <AppText variant="caption" style={styles.numText}>
                {i + 1}
              </AppText>
            </View>
            {i < steps.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <AppText variant="label" tone="secondary" style={styles.text}>
            {s}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.sm },
  step: { flexDirection: 'row', gap: spacing.md, minHeight: 34 },
  rail: { alignItems: 'center', width: 22 },
  num: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.gold, 0.15),
    borderWidth: 1,
    borderColor: withAlpha(colors.gold, 0.6),
  },
  numText: { color: colors.goldDeep, fontWeight: '700' },
  line: { flex: 1, width: 1, backgroundColor: withAlpha(colors.gold, 0.35), marginVertical: 2 },
  text: { flex: 1, paddingTop: 2 },
});
