import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { colors, useSvgId } from '@/ui';

import { LongshipSide } from './LongshipSide';

/** Deterministik "rastgele" (yıldızlar her açılışta aynı yerde). */
function seeded(n: number) {
  let s = n;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * Fiyort silüeti: kenarlarda yüksek yarlar, ortada açık geçit (gemi oradan süzülür).
 * Noktalar 0–1 genişlik / 0–1 yükseklik (1 = ufuk çizgisinden en yüksek tepe).
 */
const RIDGES: Record<'far' | 'mid' | 'near', readonly [number, number][]> = {
  far: [
    [0, 0.55],
    [0.06, 0.7],
    [0.12, 0.52],
    [0.2, 0.62],
    [0.28, 0.4],
    [0.36, 0.3],
    [0.44, 0.18],
    [0.52, 0.2],
    [0.6, 0.28],
    [0.68, 0.42],
    [0.76, 0.5],
    [0.84, 0.66],
    [0.92, 0.58],
    [1, 0.72],
  ],
  mid: [
    [0, 0.85],
    [0.05, 0.95],
    [0.1, 0.72],
    [0.16, 0.6],
    [0.22, 0.38],
    [0.28, 0.18],
    [0.34, 0.06],
    [0.66, 0.05],
    [0.72, 0.16],
    [0.78, 0.4],
    [0.84, 0.66],
    [0.9, 0.8],
    [0.95, 0.92],
    [1, 0.86],
  ],
  near: [
    [0, 1],
    [0.04, 0.82],
    [0.09, 0.58],
    [0.14, 0.32],
    [0.18, 0.12],
    [0.21, 0.02],
    [0.8, 0.02],
    [0.84, 0.16],
    [0.88, 0.42],
    [0.93, 0.7],
    [0.97, 0.9],
    [1, 1],
  ],
};

function ridgePath(
  points: readonly [number, number][],
  w: number,
  horizon: number,
  height: number,
) {
  const pts = points.map(([x, y]) => `${(x * w).toFixed(1)},${(horizon - y * height).toFixed(1)}`);
  return `M0,${horizon} L${pts.join(' L')} L${w},${horizon} Z`;
}

/** Döşenebilir dalga satırı: genişlik boyunca tekrar eden yumuşak tepe çizgileri. */
function wavePath(width: number, wavelength: number, amp: number) {
  let d = `M0 ${amp}`;
  for (let x = 0; x < width + wavelength; x += wavelength) {
    d += ` Q${x + wavelength / 4} 0 ${x + wavelength / 2} ${amp} T${x + wavelength} ${amp}`;
  }
  return d;
}

export type FjordSceneProps = {
  /** Ufkun ekran yüksekliğine oranı (0–1). */
  horizonRatio?: number;
  /** Ufuk için üst sınır (px): uzun ekranlarda deniz kartlara yer açsın. */
  maxHorizon?: number;
  showShip?: boolean;
};

/**
 * Lobinin canlı arka planı: alacakaranlıkta fiyort. Gökyüzü, kuzey ışıkları, ay, katmanlı dağlar,
 * ufuk sisi, altın yansıma, kayan dalgalar ve sallanan drakkar. Hareketi azalt açıkken durağan.
 */
export function FjordScene({
  horizonRatio = 0.44,
  maxHorizon = 440,
  showShip = true,
}: FjordSceneProps) {
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const id = useSvgId('fjord');
  const horizon = Math.min(Math.round(H * horizonRatio), maxHorizon);
  const mountainH = horizon * 0.62;
  const phone = W < 768;

  const [stars] = useState(() => {
    const rnd = seeded(7);
    return Array.from({ length: 70 }, () => ({
      x: rnd(),
      y: rnd() * rnd(),
      r: 0.4 + rnd() * 1.1,
      o: 0.25 + rnd() * 0.6,
    }));
  });

  // Animasyonlar: dalgalar (üç hız), kuzey ışığı nabzı, gemi sallanması.
  const [waves] = useState(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);
  const [glow] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const loops = [
      ...waves.map((v, i) =>
        Animated.loop(
          Animated.timing(v, {
            toValue: 1,
            duration: [16000, 11000, 7000][i],
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 5000, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 5000, useNativeDriver: false }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, {
            toValue: 1,
            duration: 2600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(bob, {
            toValue: 0,
            duration: 2600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [reduced, waves, glow, bob]);

  const shipW = phone ? 116 : Math.max(150, Math.min(340, W * 0.24));
  const shipH = (shipW * 140) / 240;
  const shipX = phone ? W * 0.8 : W * 0.6;
  const waveRows = [
    { y: horizon + 14, wl: 90, amp: 3, opacity: 0.18, stroke: 1 },
    { y: horizon + 70, wl: 150, amp: 6, opacity: 0.16, stroke: 1.4 },
    { y: horizon + 170, wl: 240, amp: 10, opacity: 0.12, stroke: 2 },
  ];

  return (
    // overflow: kayan dalga şeritleri ekrandan geniş; sayfa yatay kaydırılmasın.
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none" aria-hidden>
      {/* Gökyüzü, yıldızlar, ay, gün batımı, deniz */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.skyTop} />
            <Stop offset="0.55" stopColor={colors.skyMid} />
            <Stop offset="0.85" stopColor={colors.skyLow} />
            <Stop offset="1" stopColor={colors.horizonGlow} />
          </LinearGradient>
          <LinearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.seaTop} />
            <Stop offset="1" stopColor={colors.seaDeep} />
          </LinearGradient>
          <RadialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.horizonHaze} stopOpacity={0.95} />
            <Stop offset="0.4" stopColor={colors.horizonGlow} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.horizonGlow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-moon`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.moon} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.moon} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`${id}-reflect`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.horizonHaze} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.horizonGlow} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.horizonHaze} stopOpacity={0} />
            <Stop offset="0.6" stopColor={colors.horizonHaze} stopOpacity={0.35} />
            <Stop offset="1" stopColor={colors.horizonHaze} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect width={W} height={horizon} fill={`url(#${id}-sky)`} />
        <G>
          {stars.map((s, i) => (
            <Circle
              key={i}
              cx={s.x * W}
              cy={s.y * horizon * 0.85}
              r={s.r}
              fill="#ffffff"
              opacity={s.o}
            />
          ))}
        </G>
        {/* Ay */}
        <Circle cx={W * 0.86} cy={horizon * 0.34} r={70} fill={`url(#${id}-moon)`} />
        <Circle cx={W * 0.86} cy={horizon * 0.34} r={16} fill={colors.moon} />
        <Circle
          cx={W * 0.86 + 6}
          cy={horizon * 0.34 - 3}
          r={14}
          fill={colors.skyTop}
          opacity={0.25}
        />
        {/* Ufukta gün batımı parıltısı (fiyort geçidinin arkasında) */}
        <Ellipse
          cx={W * 0.5}
          cy={horizon}
          rx={W * 0.45}
          ry={horizon * 0.42}
          fill={`url(#${id}-sun)`}
        />

        {/* Dağlar: uzak → yakın */}
        <Path
          d={ridgePath(RIDGES.far, W, horizon, mountainH * 0.75)}
          fill={colors.mountainFar}
          opacity={0.85}
        />
        <Path d={ridgePath(RIDGES.mid, W, horizon, mountainH * 0.95)} fill={colors.mountainMid} />
        <Path d={ridgePath(RIDGES.near, W, horizon, mountainH * 1.15)} fill={colors.mountainNear} />
        {/* Ufuk sisi */}
        <Rect y={horizon - 40} width={W} height={70} fill={`url(#${id}-mist)`} />

        {/* Deniz */}
        <Rect y={horizon} width={W} height={H - horizon} fill={`url(#${id}-sea)`} />
        {/* Gün batımının sudaki altın yansıması: kırık yatay çizgiler */}
        <G>
          {Array.from({ length: 18 }, (_, i) => {
            const y = horizon + 4 + i * 9 + i * i * 0.6;
            const half = (W * 0.16) / (1 + i * 0.12);
            return (
              <Rect
                key={i}
                x={W * 0.5 - half + ((i * 37) % 23) - 11}
                y={y}
                width={half * 2}
                height={1.6 + i * 0.12}
                rx={1}
                fill={colors.horizonHaze}
                opacity={Math.max(0, 0.5 - i * 0.026)}
              />
            );
          })}
        </G>
        {/* Uzakta silüet gemi */}
        <G transform={`translate(${W * 0.4} ${horizon - 20}) scale(0.28)`} opacity={0.75}>
          <Path d="M0 60 Q60 72 120 60 L112 70 Q60 82 8 70 Z" fill={colors.mountainNear} />
          <Path d="M60 60 L60 6 M36 12 L84 12" stroke={colors.mountainNear} strokeWidth={4} />
          <Path d="M38 12 L82 12 Q88 34 80 52 L40 52 Q32 34 38 12 Z" fill={colors.mountainNear} />
        </G>
        {/* Kuzgunlar */}
        <G stroke={colors.skyTop} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.75}>
          <Path d={`M${W * 0.5} ${horizon * 0.3} q6 -6 12 0 q6 -6 12 0`} />
          <Path d={`M${W * 0.54} ${horizon * 0.24} q4 -4 8 0 q4 -4 8 0`} />
        </G>
      </Svg>

      {/* Kuzey ışıkları: yavaş nabız */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: reduced
              ? 0.8
              : glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          },
        ]}
      >
        <Svg width={W} height={horizon}>
          <Defs>
            <LinearGradient id={`${id}-au1`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.aurora1} stopOpacity={0} />
              <Stop offset="0.5" stopColor={colors.aurora1} stopOpacity={0.32} />
              <Stop offset="1" stopColor={colors.aurora2} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id={`${id}-au2`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.aurora2} stopOpacity={0} />
              <Stop offset="0.5" stopColor={colors.aurora2} stopOpacity={0.22} />
              <Stop offset="1" stopColor={colors.aurora1} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M${-W * 0.05} ${horizon * 0.42} C ${W * 0.2} ${horizon * 0.05}, ${W * 0.45} ${horizon * 0.5}, ${W * 0.7} ${horizon * 0.12} S ${W * 1.05} ${horizon * 0.18}, ${W * 1.1} ${horizon * 0.02} L ${W * 1.1} ${horizon * 0.2} C ${W * 0.9} ${horizon * 0.36}, ${W * 0.75} ${horizon * 0.3}, ${W * 0.7} ${horizon * 0.32} S ${W * 0.3} ${horizon * 0.62}, ${-W * 0.05} ${horizon * 0.6} Z`}
            fill={`url(#${id}-au1)`}
          />
          <Path
            d={`M${-W * 0.05} ${horizon * 0.2} C ${W * 0.25} ${horizon * 0.35}, ${W * 0.5} ${horizon * 0.0}, ${W * 1.05} ${horizon * 0.28} L ${W * 1.05} ${horizon * 0.4} C ${W * 0.55} ${horizon * 0.16}, ${W * 0.3} ${horizon * 0.5}, ${-W * 0.05} ${horizon * 0.34} Z`}
            fill={`url(#${id}-au2)`}
          />
        </Svg>
      </Animated.View>

      {/* Dalgalar: üç katman, yakına geldikçe büyük ve hızlı */}
      {waveRows.map((row, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            top: row.y,
            transform: [
              {
                translateX: reduced
                  ? 0
                  : (waves[i] as Animated.Value).interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -row.wl],
                    }),
              },
            ],
          }}
        >
          <Svg width={W + row.wl * 2} height={row.amp * 2 + 4}>
            <Path
              d={wavePath(W + row.wl * 2, row.wl, row.amp)}
              stroke={colors.foam}
              strokeWidth={row.stroke}
              fill="none"
              opacity={row.opacity * 2.2}
            />
          </Svg>
        </Animated.View>
      ))}

      {/* Drakkar: ufukta sallanarak */}
      {showShip ? (
        <Animated.View
          style={{
            position: 'absolute',
            left: shipX - shipW / 2,
            top: horizon - shipH * 0.78,
            transform: reduced
              ? []
              : [
                  { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-2, 3] }) },
                  {
                    rotate: bob.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-1.4deg', '1.4deg'],
                    }),
                  },
                ],
          }}
        >
          <LongshipSide width={shipW} />
          {/* Gövde altındaki köpük */}
          <Svg width={shipW} height={12} style={{ marginTop: -shipH * 0.22 }}>
            <Path
              d={`M${shipW * 0.06} 6 Q${shipW * 0.5} 12 ${shipW * 0.94} 6`}
              stroke={colors.foam}
              strokeWidth={2}
              fill="none"
              opacity={0.5}
            />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });

/** Sahnede ufkun y konumu (içeriği hizalamak için). */
export function useHorizon(horizonRatio = 0.44, maxHorizon = 440): number {
  const { height } = useWindowDimensions();
  return Math.min(Math.round(height * horizonRatio), maxHorizon);
}
