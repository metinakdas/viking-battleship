import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Vignette, type VignetteKind } from '@/features/scene/Vignette';
import { AppText, Glass, radii, spacing } from '@/ui';

export type VoyageCardProps = {
  art: VignetteKind;
  title: string;
  description: string;
  children?: ReactNode;
  action: ReactNode;
  /** side: minyatür solda (geniş öne çıkan kart); top: üstte. */
  artPlacement?: 'top' | 'side';
  artHeight?: number;
  style?: StyleProp<ViewStyle>;
};

/** Mod kartı: minyatür sahne + destansı başlık + açıklama + içerik + eylem. */
export function VoyageCard({
  art,
  title,
  description,
  children,
  action,
  artPlacement = 'top',
  artHeight = 132,
  style,
}: VoyageCardProps) {
  const side = artPlacement === 'side';
  return (
    <Glass strong elevation="raised" style={[styles.card, side && styles.cardSide, style]}>
      <Vignette
        kind={art}
        height={side ? undefined : artHeight}
        style={side ? styles.artSide : styles.artTop}
      />
      <View style={styles.body}>
        <AppText variant="epicTitle" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="label" tone="secondary">
          {description}
        </AppText>
        {children}
        <View style={styles.spacer} />
        {action}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: 280, borderRadius: radii.card + 4 },
  cardSide: { flexDirection: 'row', flexBasis: 560, flexGrow: 2 },
  artTop: {},
  artSide: { width: '38%', height: 'auto', alignSelf: 'stretch', minHeight: 260 },
  body: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  spacer: { flexGrow: 1, minHeight: spacing.xs },
});
