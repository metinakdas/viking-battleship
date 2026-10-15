import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useReducedMotion } from '@/features/game/hooks';
import { colors, RUNES, useSvgId } from '@/ui';

import { LongshipSide } from './LongshipSide';

export type VignetteKind = 'duel' | 'hotseat' | 'compass' | 'longhouse' | 'runestone';

const VW = 320;
const VH = 140;
const SEA_Y = 92;

/** Kart başlığındaki minyatür sahne: her mod kendi küçük hikâyesini anlatır. */
export function Vignette({
  kind,
  height: fixedHeight,
  style,
}: {
  kind: VignetteKind;
  /** Verilmezse kapsayıcının yüksekliği ölçülür (yan yerleşim). */
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useSvgId('vg');
  const [size, setSize] = useState({ w: VW, h: VH });
  const w = size.w;
  const height = fixedHeight ?? Math.max(VH, size.h);
  // Gemiler hem yüksekliğe hem genişliğe sığsın; ufuk her yükseklikte aynı oranda.
  const scale = Math.min(height / VH, w / VW, 1.4);
  const sea = height * (SEA_Y / VH);
  const duelW = Math.min(w * 0.84, 320, height * 1.4);

  return (
    <View
      style={[styles.root, fixedHeight ? { height: fixedHeight } : null, style]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      aria-hidden
    >
      <Svg width={w} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.skyTop} />
            <Stop offset="0.7" stopColor={colors.skyMid} />
            <Stop offset="1" stopColor={kind === 'duel' ? colors.fire : colors.horizonGlow} />
          </LinearGradient>
          <LinearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.seaTop} />
            <Stop offset="1" stopColor={colors.seaDeep} />
          </LinearGradient>
        </Defs>
        <Rect width={w} height={sea} fill={`url(#${id}-sky)`} />
        {/* Uzak dağlar */}
        <Path
          d={`M0 ${sea} L0 ${sea * 0.55} L${w * 0.12} ${sea * 0.38} L${w * 0.22} ${sea * 0.6} L${w * 0.3} ${sea * 0.72} L${w * 0.7} ${sea * 0.74} L${w * 0.8} ${sea * 0.5} L${w * 0.9} ${sea * 0.34} L${w} ${sea * 0.5} L${w} ${sea} Z`}
          fill={colors.mountainMid}
          opacity={0.9}
        />
        {kind === 'duel' ? (
          // Ufukta yanan yangın: düşman filosu yaklaşıyor.
          <>
            <Defs>
              <RadialGradient id={`${id}-fire`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={colors.fireCore} stopOpacity={0.85} />
                <Stop offset="0.45" stopColor={colors.fire} stopOpacity={0.45} />
                <Stop offset="1" stopColor={colors.fire} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={w * 0.5}
              cy={sea}
              rx={w * 0.55}
              ry={sea * 0.42}
              fill={`url(#${id}-fire)`}
            />
          </>
        ) : null}
        <Rect y={sea} width={w} height={height - sea} fill={`url(#${id}-sea)`} />
        {kind === 'duel' ? (
          <Rect
            x={w * 0.3}
            y={sea + 2}
            width={w * 0.4}
            height={2}
            rx={1}
            fill={colors.fireCore}
            opacity={0.5}
          />
        ) : null}
        <G stroke={colors.foam} strokeWidth={1} opacity={0.35} fill="none">
          {[0.18, 0.45, 0.75].map((f) => (
            <Path
              key={f}
              d={`M${w * 0.05} ${sea + (height - sea) * f} q12 -3 24 0 t24 0 M${w * 0.55} ${sea + (height - sea) * (f + 0.08)} q12 -3 24 0 t24 0`}
            />
          ))}
        </G>
        {kind === 'longhouse' ? <Longhouse w={w} sea={sea} /> : null}
        {kind === 'runestone' ? <Runestone w={w} sea={sea} /> : null}
        {/* Yıldızlar */}
        <G fill="#fff">
          {[0.1, 0.27, 0.48, 0.63, 0.86].map((x, i) => (
            <Circle key={x} cx={w * x} cy={8 + ((i * 13) % 26)} r={0.9} opacity={0.6} />
          ))}
        </G>
      </Svg>

      {kind === 'duel' ? (
        // Düşman gemisi panel genişliğinin çoğunu kaplar; su çizgisi ufukta.
        <View
          style={[
            styles.ship,
            {
              left: (w - duelW) / 2,
              top: sea - duelW * (140 / 240) * 0.78,
            },
          ]}
        >
          <LongshipSide width={duelW} flip sail={[colors.shipOutline, colors.sailRed]} />
        </View>
      ) : null}
      {kind === 'hotseat' ? (
        <>
          <View style={[styles.ship, { left: '6%', top: sea - 60 * scale }]}>
            <LongshipSide width={140 * scale} sail={[colors.shieldBlue, colors.sailCream]} />
          </View>
          <View style={[styles.ship, { right: '6%', top: sea - 60 * scale }]}>
            <LongshipSide width={140 * scale} flip sail={[colors.sailRed, colors.sailCream]} />
          </View>
        </>
      ) : null}
      {kind === 'compass' ? <CompassSweep size={height * 0.86} /> : null}
      {kind === 'longhouse' ? (
        <View style={[styles.ship, { right: '8%', top: sea - 48 * scale }]}>
          <LongshipSide width={110 * scale} flip />
        </View>
      ) : null}
    </View>
  );
}

/** Uzun ev: ejder başlı çatı, sıcak ışıklı kapı, iskele. */
function Longhouse({ w, sea }: { w: number; sea: number }) {
  const x = w * 0.14;
  const base = sea + 4;
  return (
    <G>
      {/* Kıyı */}
      <Path
        d={`M0 ${base + 8} Q${w * 0.3} ${base - 6} ${w * 0.55} ${base + 10} L0 ${base + 30} Z`}
        fill={colors.mountainNear}
      />
      {/* Gövde ve çatı */}
      <Path
        d={`M${x} ${base - 2} L${x} ${base - 26} L${x + 120} ${base - 26} L${x + 120} ${base - 2} Z`}
        fill="#3a2a1c"
      />
      <Path
        d={`M${x - 10} ${base - 24} Q${x + 60} ${base - 70} ${x + 130} ${base - 24} Z`}
        fill="#2a1d12"
      />
      {/* Çatı sırtındaki ejder başları */}
      <Path
        d={`M${x - 10} ${base - 24} q-6 -10 2 -16 q4 4 0 8`}
        stroke="#2a1d12"
        strokeWidth={3}
        fill="none"
      />
      <Path
        d={`M${x + 130} ${base - 24} q6 -10 -2 -16 q-4 4 0 8`}
        stroke="#2a1d12"
        strokeWidth={3}
        fill="none"
      />
      {/* Işıklı kapı ve pencere */}
      <Rect x={x + 52} y={base - 20} width={16} height={18} rx={2} fill={colors.horizonGlow} />
      <Circle cx={x + 60} cy={base - 14} r={18} fill={colors.horizonGlow} opacity={0.18} />
      <Rect x={x + 20} y={base - 18} width={8} height={6} fill={colors.horizonHaze} opacity={0.8} />
      <Rect x={x + 92} y={base - 18} width={8} height={6} fill={colors.horizonHaze} opacity={0.8} />
      {/* İskele */}
      <Rect x={w * 0.5} y={base} width={w * 0.24} height={3} fill="#3a2a1c" />
      {[0.52, 0.6, 0.68].map((f) => (
        <Rect key={f} x={w * f} y={base} width={3} height={14} fill="#2a1d12" />
      ))}
    </G>
  );
}

/** Run taşı: oyulmuş, parlayan altın runlar. */
function Runestone({ w, sea }: { w: number; sea: number }) {
  const cx = w * 0.5;
  const top = sea - 74;
  const runes = ['raido', 'othala', 'tiwaz', 'ansuz'] as const;
  return (
    <G>
      <Path
        d={`M${cx - 120} ${sea + 14} Q${cx} ${sea - 8} ${cx + 120} ${sea + 14} L${cx + 120} ${sea + 40} L${cx - 120} ${sea + 40} Z`}
        fill={colors.mountainNear}
      />
      <Circle cx={cx} cy={top + 40} r={58} fill={colors.horizonGlow} opacity={0.14} />
      <Path
        d={`M${cx - 30} ${sea + 6} Q${cx - 36} ${top + 20} ${cx - 10} ${top} Q${cx + 22} ${top - 6} ${cx + 30} ${top + 24} Q${cx + 36} ${sea - 10} ${cx + 30} ${sea + 6} Z`}
        fill="#5b6670"
        stroke="#2d363e"
        strokeWidth={2}
      />
      <Path
        d={`M${cx - 18} ${sea} Q${cx - 24} ${top + 22} ${cx - 6} ${top + 10}`}
        stroke="#8a96a0"
        strokeWidth={2}
        fill="none"
        opacity={0.5}
      />
      <G stroke={colors.horizonHaze} strokeWidth={1.6} fill="none" strokeLinecap="round">
        {runes.map((r, i) => (
          <Path
            key={r}
            d={RUNES[r]}
            transform={`translate(${cx - 6} ${top + 12 + i * 15}) scale(0.75)`}
          />
        ))}
      </G>
    </G>
  );
}

/** Denizi tarayan pusula: altın tarama konisi yavaşça döner. */
function CompassSweep({ size }: { size: number }) {
  const reduced = useReducedMotion();
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, spin]);
  const r = 50;
  const ticks = Array.from({ length: 32 }, (_, i) => i * 11.25);
  return (
    <View
      style={[
        styles.center,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120" style={StyleSheet.absoluteFill}>
        <Circle cx={60} cy={60} r={r + 6} fill={colors.skyTop} opacity={0.55} />
        <Circle cx={60} cy={60} r={r} fill="none" stroke={colors.gold} strokeWidth={1.2} />
        <Circle
          cx={60}
          cy={60}
          r={r * 0.62}
          fill="none"
          stroke={colors.gold}
          strokeWidth={0.6}
          opacity={0.6}
        />
        <G stroke={colors.horizonHaze} strokeWidth={0.8}>
          {ticks.map((d) => (
            <Path
              key={d}
              d={`M60 ${60 - r} v${d % 90 === 0 ? 7 : 3}`}
              transform={`rotate(${d} 60 60)`}
            />
          ))}
        </G>
        <Path d="M60 18 L65 60 L60 102 L55 60 Z" fill={colors.horizonHaze} opacity={0.9} />
        <Path d="M18 60 L60 55 L102 60 L60 65 Z" fill={colors.horizonHaze} opacity={0.55} />
        <Path d="M60 18 L65 60 L55 60 Z" fill={colors.accent} />
        <Circle cx={60} cy={60} r={3} fill={colors.gold} />
        {/* Uzaktaki hedef işaretleri */}
        <Circle cx={84} cy={40} r={2} fill={colors.fire} />
        <Circle cx={38} cy={78} r={1.6} fill={colors.foam} />
      </Svg>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              {
                rotate: reduced
                  ? '40deg'
                  : spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
              },
            ],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 120 120">
          <Path
            d={`M60 60 L60 ${60 - r} A${r} ${r} 0 0 1 ${60 + r * Math.sin(Math.PI / 5)} ${60 - r * Math.cos(Math.PI / 5)} Z`}
            fill={colors.gold}
            opacity={0.32}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', width: '100%' },
  ship: { position: 'absolute' },
  center: { position: 'absolute', left: '50%', top: '50%' },
});
