import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { t } from '@/i18n';

import { colors, spacing } from '../theme';
import { AppText } from './AppText';
import { RuneText } from './RuneText';

/** Sekiz kolun uç işaretleri (Vegvísir'deki gibi her kol farklı). Kol yukarı bakar, uç y≈6'da. */
const ARM_TIPS = [
  'M24 6l-4 4M24 6l4 4M24 10l-4 4M24 10l4 4', // çift ok
  'M20 7h8M20 11h8', // çift çubuk
  'M24 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', // halka
  'M19 7l5 4l5 -4', // çatal
  'M20 6h8M24 6v-1', // T
  'M21 8l6 6M27 8l-6 6', // çarpı
  'M20 10l4 -5l4 5', // ok ucu
  'M24 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M20 12h8', // nokta + çubuk
];

/** Vegvísir amblemi: yol gösteren sekiz kollu İzlanda sembolü, buzlu cam rozet içinde. */
export function Vegvisir({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <Circle cx="24" cy="24" r="23" fill={colors.glassStrong} />
      <Circle cx="24" cy="24" r="22" fill="none" stroke={colors.gold} strokeWidth="1.2" />
      <Circle
        cx="24"
        cy="24"
        r="19.5"
        fill="none"
        stroke={colors.gold}
        strokeWidth="0.5"
        strokeDasharray="1 2"
      />
      <G stroke={colors.text} strokeWidth="1.3" strokeLinecap="round" fill="none">
        {ARM_TIPS.map((tip, i) => (
          <G key={i} transform={`rotate(${i * 45} 24 24)`}>
            <Path d="M24 21V6" />
            <Path d={tip} />
          </G>
        ))}
      </G>
      <Circle cx="24" cy="24" r="3.2" fill={colors.accent} stroke={colors.text} strokeWidth="1" />
    </Svg>
  );
}

export type LogoProps = {
  /** Üst çubukta yatay, giriş kartında dikey (ortalı). */
  layout?: 'row' | 'stacked';
  showSubtitle?: boolean;
  /** xs: telefon üst çubuğu (dar), sm: masaüstü üst çubuğu, lg: giriş kartı. */
  size?: 'xs' | 'sm' | 'lg';
  /** Koyu sahne üstünde açık (krem) metin. */
  light?: boolean;
};

export function Logo({
  layout = 'row',
  showSubtitle = true,
  size = 'sm',
  light = false,
}: LogoProps) {
  const stacked = layout === 'stacked';
  const large = size === 'lg';
  return (
    <View
      style={[styles.base, stacked ? styles.stacked : styles.row]}
      accessibilityRole="header"
      accessibilityLabel={t('app.title')}
    >
      {/* Amblem asla sıkışmasın; dar satırda başlık küçülür. */}
      <View style={styles.emblem}>
        <Vegvisir size={large ? 72 : size === 'xs' ? 30 : 38} />
      </View>
      <View style={stacked ? styles.textStacked : styles.textRow}>
        <AppText
          variant="logo"
          tone={light ? 'onScene' : 'primary'}
          align={stacked ? 'center' : undefined}
          style={large ? styles.titleLarge : size === 'xs' ? styles.titleSmall : undefined}
          numberOfLines={1}
        >
          {t('app.title')}
        </AppText>
        {large ? <RuneText text={t('app.title')} height={12} dotted /> : null}
        {showSubtitle ? (
          <AppText
            variant="caption"
            tone={light ? 'onSceneMuted' : 'muted'}
            align={stacked ? 'center' : undefined}
          >
            {t('app.subtitle')}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  stacked: { alignItems: 'center' },
  textRow: { gap: 1, flexShrink: 1, minWidth: 0 },
  textStacked: { alignItems: 'center', gap: spacing.xs + 2 },
  titleLarge: { fontSize: 30, lineHeight: 36, letterSpacing: 6 },
  titleSmall: { fontSize: 17, lineHeight: 22, letterSpacing: 2 },
  emblem: { flexShrink: 0 },
});
