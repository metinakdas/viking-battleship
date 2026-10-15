import Svg, { ClipPath, Defs, G, Line, Path, Rect, Circle } from 'react-native-svg';

import { colors, useSvgId } from '@/ui';

export type LongshipSideProps = {
  /** Genişlik (px). Yükseklik oranla: 240×140. */
  width: number;
  /** Yelken çizgileri: [ana renk, ara renk]. */
  sail?: readonly [string, string];
  /** Sola bakan gemi (pruva solda). */
  flip?: boolean;
  /** Uzak gemiler için tek renk silüet. */
  silhouette?: string;
};

const W = 240;
const H = 140;

/**
 * Yandan görünüş Viking uzun gemisi: ejder başlı pruva, sarmal kıç, kalkan sırası, kürekler,
 * şişkin çizgili kare yelken. Lobi sahnesinin ve kart minyatürlerinin kahramanı.
 */
export function LongshipSide({
  width,
  sail = [colors.sailRed, colors.sailCream],
  flip = false,
  silhouette,
}: LongshipSideProps) {
  const clip = useSvgId('sail');
  const sil = silhouette;
  const wood = sil ?? colors.hull;
  const woodDark = sil ?? colors.shipOutline;
  const plank = sil ?? colors.deck;
  const [sailA, sailB] = sil ? [sil, sil] : sail;
  const shieldColors = sil
    ? [sil]
    : [colors.shieldRed, colors.shieldGold, colors.shieldCream, colors.shieldBlue];

  const sailPath = 'M80 20 L160 20 Q170 50 156 82 L84 82 Q70 50 80 20 Z';

  return (
    <Svg width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <G transform={flip ? `translate(${W} 0) scale(-1 1)` : undefined}>
        {/* Halatlar */}
        <G stroke={woodDark} strokeWidth={0.8} opacity={0.7}>
          <Line x1={120} y1={10} x2={226} y2={46} />
          <Line x1={120} y1={10} x2={16} y2={52} />
        </G>
        {/* Direk ve seren */}
        <Line x1={120} y1={8} x2={120} y2={96} stroke={woodDark} strokeWidth={3} />
        <Line
          x1={72}
          y1={20}
          x2={168}
          y2={20}
          stroke={woodDark}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Şişkin kare yelken, dikey şeritler */}
        <Defs>
          <ClipPath id={clip}>
            <Path d={sailPath} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clip})`}>
          <Rect x={66} y={18} width={110} height={70} fill={sailB} />
          {[0, 2, 4, 6, 8].map((k) => (
            <Rect key={k} x={70 + k * 11} y={18} width={11} height={70} fill={sailA} />
          ))}
          {/* Rüzgâr gölgesi */}
          {sil ? null : (
            <Path d="M80 20 Q90 50 84 82 L100 82 Q104 50 96 20 Z" fill="#000" opacity={0.12} />
          )}
        </G>
        <Path d={sailPath} fill="none" stroke={woodDark} strokeWidth={1.5} />

        {/* Kürekler (gövdenin arkasında) */}
        <G stroke={woodDark} strokeWidth={2} strokeLinecap="round">
          {[56, 76, 96, 144, 164, 184].map((x) => (
            <Line key={x} x1={x} y1={94} x2={x - 16} y2={124} />
          ))}
        </G>

        {/* Gövde: alçak, iki ucu yükselen hilal */}
        <Path
          d="M14 74 Q40 92 120 92 Q200 92 226 74 L218 92 Q176 112 120 112 Q64 112 22 92 Z"
          fill={wood}
          stroke={woodDark}
          strokeWidth={2}
        />
        {/* Bindirme kaplama */}
        {sil ? null : (
          <G fill="none" stroke={plank} strokeWidth={1.4} opacity={0.9}>
            <Path d="M24 88 Q70 100 120 100 Q170 100 216 88" />
            <Path d="M30 95 Q74 106 120 106 Q166 106 210 95" />
          </G>
        )}

        {/* Kalkan sırası */}
        {[48, 62, 76, 90, 104, 136, 150, 164, 178, 192].map((x, i) => (
          <G key={x}>
            <Circle
              cx={x}
              cy={90}
              r={6.5}
              fill={shieldColors[i % shieldColors.length]}
              stroke={woodDark}
              strokeWidth={1.2}
            />
            {sil ? null : <Circle cx={x} cy={90} r={1.8} fill={colors.shieldBoss} />}
          </G>
        ))}

        {/* Pruva: yükselen boyun ve ejder başı */}
        <Path
          d="M218 80 Q232 66 230 44 Q229 34 222 30"
          fill="none"
          stroke={wood}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <Path
          d="M218 80 Q232 66 230 44 Q229 34 222 30"
          fill="none"
          stroke={woodDark}
          strokeWidth={1.2}
          opacity={0.6}
        />
        <Path
          d="M218 26 Q226 18 238 22 L232 27 L239 30 Q230 36 222 34 Z"
          fill={sil ?? colors.shieldGold}
          stroke={woodDark}
          strokeWidth={1.2}
        />
        {sil ? null : <Circle cx={228} cy={25} r={1.3} fill={woodDark} />}
        <Path
          d="M221 25 L216 16 M225 23 L223 14"
          stroke={woodDark}
          strokeWidth={1.4}
          strokeLinecap="round"
        />

        {/* Kıç: sarmal kuyruk */}
        <Path
          d="M22 80 Q8 64 12 46 Q16 34 26 38 Q32 42 26 48 Q22 50 20 46"
          fill="none"
          stroke={wood}
          strokeWidth={6}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}
