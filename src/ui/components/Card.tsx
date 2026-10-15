import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '../theme';
import { AppText } from './AppText';
import { Glass } from './Glass';

export type CardProps = ViewProps & {
  /** Küçük, büyük harfli başlık (ör. "DÜŞMAN FİLOSU"). Metni çağıran büyük harfle verir. */
  title?: string;
  /** Başlığın sağındaki içerik (sayaç, pill vb.). */
  headerRight?: ReactNode;
  /** Öne çıkan kart (ör. giriş kartı): daha opak cam + altın üst çizgi. */
  highlighted?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Buzlu cam kart. */
export function Card({
  title,
  headerRight,
  highlighted = false,
  padded = true,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <Glass strong={highlighted} elevation={highlighted ? 'raised' : 'card'} style={style} {...rest}>
      {highlighted ? <View style={styles.accentLine} /> : null}
      <View style={padded && styles.padded}>
        {title || headerRight ? (
          <View style={styles.header}>
            {title ? (
              <AppText variant="overline" tone="muted" accessibilityRole="header">
                {title}
              </AppText>
            ) : (
              <View />
            )}
            {headerRight}
          </View>
        ) : null}
        {children}
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.lg },
  accentLine: {
    height: 3,
    backgroundColor: colors.gold,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
