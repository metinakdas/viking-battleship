import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors, glass, radii, shadows } from '../theme';

export type GlassProps = ViewProps & {
  children?: ReactNode;
  /** Daha opak yüzey (giriş kartı, açılır pencere). */
  strong?: boolean;
  radius?: number;
  elevation?: 'card' | 'raised' | 'none';
  style?: StyleProp<ViewStyle>;
};

/**
 * macOS tarzı buzlu cam: arkasını bulanıklaştırır (web'de CSS backdrop-filter),
 * üstüne yarı saydam beyaz, ince parlak kenar ve yumuşak gölge.
 * Android'de blur için BlurTargetView gerekir; yoksa yarı saydam yüzeye düşer (yine okunaklı).
 */
export function Glass({
  children,
  strong = false,
  radius = radii.card,
  elevation = 'card',
  style,
  ...rest
}: GlassProps) {
  return (
    <View
      style={[
        styles.shell,
        { borderRadius: radius },
        elevation !== 'none' && { boxShadow: shadows[elevation] },
        style,
      ]}
      {...rest}
    >
      <BlurView
        intensity={glass.intensity}
        tint={glass.tint}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, backgroundColor: strong ? colors.glassStrong : colors.glass },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
});
