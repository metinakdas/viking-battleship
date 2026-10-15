import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '@/i18n';
import { AppText, Pill, spacing } from '@/ui';

const STEPS = ['phase.placement', 'phase.battle'] as const;

/** Üst çubuktaki aşama adımları: "1 · Filonu Yerleştir → 2 · Savaş". */
export function PhaseSteps({ active }: { active: 0 | 1 }) {
  return (
    <View style={styles.root} accessibilityRole="list">
      {STEPS.map((key, i) => (
        <Fragment key={key}>
          {i > 0 ? (
            <AppText variant="label" tone="disabled" aria-hidden>
              →
            </AppText>
          ) : null}
          <View
            accessibilityRole="text"
            aria-current={i === active ? 'step' : undefined}
            accessibilityLabel={`${i + 1}. ${t(key)}`}
          >
            <Pill
              label={`${i + 1} · ${t(key)}`}
              tone={i === active ? 'accent' : i < active ? 'gold' : 'muted'}
              solid={i === active}
            />
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
