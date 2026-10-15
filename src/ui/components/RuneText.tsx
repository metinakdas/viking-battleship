import Svg, { G, Path } from 'react-native-svg';

import { colors } from '../theme';

/**
 * Elder Futhark runları, 10×16 kutuda çizgi yolları. Font yerine SVG: her platformda aynı görünür.
 * Süs amaçlıdır; erişilebilirlik ağacından gizlenir (anlamı taşıyan metin her zaman ayrıca yazılır).
 */
export const RUNES = {
  fehu: 'M3 0V16M3 5L8 1M3 9L8 5',
  uruz: 'M2 16V0L8 6V16',
  thurisaz: 'M3 0V16M3 4L8 8L3 12',
  ansuz: 'M3 0V16M3 1L8 5M3 6L8 10',
  raido: 'M2 16V0L7 4L2 8L8 16',
  kaunan: 'M7 2L2 8L7 14',
  gebo: 'M1 1L9 15M9 1L1 15',
  wunjo: 'M3 0V16M3 0L8 4L3 8',
  hagalaz: 'M2 0V16M8 0V16M2 5L8 11',
  naudiz: 'M5 0V16M2 5L8 11',
  isaz: 'M5 0V16',
  jera: 'M4 2L1 5L4 8M6 8L9 11L6 14',
  perthro: 'M2 0V16M2 0L7 4M2 16L7 12M7 4V5M7 12V11',
  algiz: 'M5 0V16M1 3L5 8L9 3',
  sowilo: 'M7 0L2 6L8 10L3 16',
  tiwaz: 'M5 0V16M1 5L5 0L9 5',
  berkanan: 'M2 0V16M2 0L7 4L2 8L7 12L2 16',
  ehwaz: 'M2 16V0L5 5L8 0V16',
  mannaz: 'M2 0V16M8 0V16M2 0L8 7M8 0L2 7',
  laguz: 'M3 0V16M3 0L8 5',
  othala: 'M2 16L8 8L5 3L2 8L8 16',
  dagaz: 'M1 0V16M9 0V16M1 0L9 16M9 0L1 16',
} as const;

export type Rune = keyof typeof RUNES;

/** Türkçe/Latin harf → run (yaklaşık ses karşılığı). */
const LETTER_TO_RUNE: Record<string, Rune> = {
  a: 'ansuz',
  b: 'berkanan',
  c: 'kaunan',
  ç: 'kaunan',
  d: 'dagaz',
  e: 'ehwaz',
  f: 'fehu',
  g: 'gebo',
  ğ: 'gebo',
  h: 'hagalaz',
  ı: 'isaz',
  i: 'isaz',
  j: 'jera',
  k: 'kaunan',
  l: 'laguz',
  m: 'mannaz',
  n: 'naudiz',
  o: 'othala',
  ö: 'othala',
  p: 'perthro',
  q: 'kaunan',
  r: 'raido',
  s: 'sowilo',
  ş: 'sowilo',
  t: 'tiwaz',
  u: 'uruz',
  ü: 'uruz',
  v: 'wunjo',
  w: 'wunjo',
  x: 'kaunan',
  y: 'jera',
  z: 'algiz',
};

export function toRunes(text: string): (Rune | ' ')[] {
  return [...text.toLocaleLowerCase('tr')].flatMap((ch) => {
    if (ch === ' ') return [' ' as const];
    const rune = LETTER_TO_RUNE[ch];
    return rune ? [rune] : [];
  });
}

export type RuneTextProps = {
  text: string;
  /** Run yüksekliği (px). */
  height?: number;
  color?: string;
  strokeWidth?: number;
  /** Runlar arasına Viking tarzı ayraç noktası (·) koy. */
  dotted?: boolean;
};

const GLYPH_W = 10;
const GAP = 4;
const SPACE = 8;

export function RuneText({
  text,
  height = 14,
  color = colors.goldDeep,
  strokeWidth = 1.6,
  dotted = false,
}: RuneTextProps) {
  const runes = toRunes(text);
  let x = 0;
  const placed: { rune: Rune | 'dot'; x: number }[] = [];
  runes.forEach((r, i) => {
    if (r === ' ') {
      if (dotted && i > 0) placed.push({ rune: 'dot', x: x + 1 });
      x += SPACE;
      return;
    }
    placed.push({ rune: r, x });
    x += GLYPH_W + GAP;
  });
  const width = Math.max(x - GAP, 1);
  const scale = height / 16;

  return (
    <Svg width={width * scale} height={height} viewBox={`-1 -1 ${width + 2} 18`} aria-hidden>
      <G
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {placed.map((p, i) =>
          p.rune === 'dot' ? (
            <Path key={i} d={`M${p.x + 2} 6v0M${p.x + 2} 10v0`} strokeWidth={strokeWidth * 1.6} />
          ) : (
            <Path key={i} d={RUNES[p.rune]} transform={`translate(${p.x} 0)`} />
          ),
        )}
      </G>
    </Svg>
  );
}
