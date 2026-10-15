import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useSvgId } from '../svgId';
import { colors, spacing } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  /** İçerik ekrandan uzunsa kaydırılsın. */
  scroll?: boolean;
  /** Arka plan katmanı (ör. giriş ekranındaki soluk tahta ve gemiler). Zeminin üstünde, içeriğin altında. */
  backdrop?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** Duvar kâğıdı yerine tam ekran arka plan (ör. lobideki fiyort sahnesi). */
  background?: ReactNode;
};

/** Kuzey ışığı lekeleri: [renk, cx, cy, yarıçap]. macOS duvar kâğıtları gibi yumuşak, büyük, örtüşen. */
const BLOBS: readonly [string, string, string, string][] = [
  [colors.auroraIce, '12%', '8%', '55%'],
  [colors.auroraTeal, '88%', '18%', '50%'],
  [colors.auroraLilac, '78%', '92%', '55%'],
  [colors.auroraAmber, '8%', '88%', '45%'],
];

/** Uygulama zemini: açık "kuzey ışığı" duvar kâğıdı. Cam paneller bunun üstünde bulanıklaşır. */
export function Wallpaper() {
  const id = useSvgId('aurora');
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden
    >
      <Defs>
        {BLOBS.map(([color, cx, cy, r], i) => (
          <RadialGradient key={i} id={`${id}-${i}`} cx={cx} cy={cy} r={r} fx={cx} fy={cy}>
            <Stop offset="0" stopColor={color} stopOpacity={0.95} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={colors.wallpaper} />
      {BLOBS.map((_, i) => (
        <Rect key={i} x="0" y="0" width="100%" height="100%" fill={`url(#${id}-${i})`} />
      ))}
    </Svg>
  );
}

/** Her ekranın kökü: duvar kâğıdı + güvenli alan. */
export function Screen({
  children,
  scroll = false,
  backdrop,
  contentStyle,
  background,
}: ScreenProps) {
  return (
    <View style={styles.root}>
      {background ?? <Wallpaper />}
      {backdrop ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {backdrop}
        </View>
      ) : null}
      <SafeAreaView style={styles.safe}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.wallpaper },
  safe: { flex: 1 },
  fill: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1 },
});
