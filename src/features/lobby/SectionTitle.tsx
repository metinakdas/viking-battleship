import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, colors, RuneText, spacing, withAlpha } from '@/ui';

/** Denizin üstünde bölüm başlığı: altın çizgi + destansı başlık + küçük alt etiket + run süsü. */
export function SectionTitle({ title, sub }: { title: string; sub: string }) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <AppText variant="epicSection" tone="onScene" accessibilityRole="header">
          {title.toLocaleUpperCase('tr')}
        </AppText>
        <AppText variant="caption" tone="onSceneMuted">
          {sub}
        </AppText>
        <View style={styles.line} />
        {width >= 600 ? (
          <RuneText text={title} height={10} color={withAlpha(colors.horizonHaze, 0.8)} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: withAlpha(colors.horizonHaze, 0.35) },
});
