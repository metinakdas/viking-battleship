import { memo } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect } from 'react-native-svg';

import { shipSize, type Orientation, type ShipType } from '@/game';
import { colors, useSvgId } from '@/ui';

/**
 * Üstten görünüş Viking gemileri. Yerel koordinat: uzunluk L = boyut × 100, genişlik 100,
 * baş (pruva) sağda. Dikey yerleşim aynı çizimin 90° döndürülmüşüdür (baş aşağı bakar).
 */

export type ShipLook = 'afloat' | 'sunk' | 'ghost';

type Palette = {
  hull: string;
  hullDark: string;
  deck: string;
  plank: string;
  outline: string;
  sailA: string;
  sailB: string;
  shields: readonly string[];
  boss: string;
  dragon: string;
};

const AFLOAT: Palette = {
  hull: colors.hull,
  hullDark: colors.hullDark,
  deck: colors.deck,
  plank: colors.plank,
  outline: colors.shipOutline,
  sailA: colors.sailRed,
  sailB: colors.sailCream,
  shields: [colors.shieldRed, colors.shieldGold, colors.shieldCream, colors.shieldBlue],
  boss: colors.shieldBoss,
  dragon: colors.shieldGold,
};

const SUNK: Palette = {
  hull: colors.sunkHull,
  hullDark: '#3a302a',
  deck: colors.sunkDeck,
  plank: '#57493f',
  outline: '#241a14',
  sailA: colors.sunkSail,
  sailB: '#b5ada5',
  shields: ['#6f645c', '#857a70'],
  boss: '#4a423c',
  dragon: '#7d7065',
};

type Rig = {
  shields: boolean;
  sail: boolean;
  dragon: boolean;
  cargo: boolean;
  /** Gövde genişliği (100 üzerinden). Knarr yük gemisi olduğu için daha geniş. */
  beam: number;
};

const RIGS: Record<ShipType, Rig> = {
  drakkar: { shields: true, sail: true, dragon: true, cargo: false, beam: 54 },
  snekkja: { shields: true, sail: true, dragon: true, cargo: false, beam: 48 },
  karvi: { shields: true, sail: true, dragon: false, cargo: false, beam: 50 },
  knarr: { shields: false, sail: true, dragon: false, cargo: true, beam: 62 },
  faering: { shields: false, sail: false, dragon: false, cargo: false, beam: 46 },
};

export type ShipShapeProps = {
  ship: ShipType;
  orientation: Orientation;
  /** Sol üst köşe (px), hücre boyutu (px). */
  x: number;
  y: number;
  cell: number;
  look?: ShipLook;
  /** ClipPath kimlikleri için sayfada benzersiz önek. */
  idPrefix: string;
};

/** Bir <Svg> içine yerleştirilen gemi grubu. */
export const ShipShape = memo(function ShipShape({
  ship,
  orientation,
  x,
  y,
  cell,
  look = 'afloat',
  idPrefix,
}: ShipShapeProps) {
  const size = shipSize(ship);
  const L = size * 100;
  const rig = RIGS[ship];
  const p = look === 'sunk' ? SUNK : AFLOAT;
  const s = cell / 100;
  const transform =
    orientation === 'horizontal'
      ? `translate(${x} ${y}) scale(${s})`
      : `translate(${x + cell} ${y}) rotate(90) scale(${s})`;

  const half = rig.beam / 2;
  const top = 50 - half;
  const bot = 50 + half;
  const hull = hullPath(L, top, bot, 7);
  const deck = hullPath(L, top + 7, bot - 7, 20);
  const sailX = L * (size === 2 ? 0.5 : 0.47);
  const clipId = `${idPrefix}-${ship}-sail`;

  // Kalkanlar: iki küpeşte boyunca, başa ve kıça yer bırakarak.
  const shieldXs: number[] = [];
  if (rig.shields) {
    const step = 22;
    for (let sx = L * 0.24; sx <= L * 0.76; sx += step) {
      if (rig.sail && Math.abs(sx - sailX) < 14) continue;
      shieldXs.push(sx);
    }
  }
  // Kürekler: kalkan aralarından ya da (kalkansız teknelerde) eşit aralıkla.
  const oarXs = rig.shields
    ? shieldXs.slice(0, -1).map((sx, i) => (sx + (shieldXs[i + 1] ?? sx)) / 2)
    : rig.cargo
      ? []
      : [L * 0.38, L * 0.62];

  return (
    <G transform={transform} opacity={look === 'ghost' ? 0.6 : 1}>
      {/* Kürekler (gövdenin altında kalsın diye önce) */}
      <G stroke={p.outline} strokeWidth={3} strokeLinecap="round">
        {oarXs.map((ox, i) => (
          <G key={i}>
            <Line x1={ox} y1={top + 4} x2={ox - 10} y2={Math.max(top - 16, 3)} />
            <Line x1={ox} y1={bot - 4} x2={ox - 10} y2={Math.min(bot + 16, 97)} />
          </G>
        ))}
      </G>

      {/* Gövde ve güverte */}
      <Path d={hull} fill={p.hull} stroke={p.outline} strokeWidth={3} />
      <Path d={deck} fill={p.deck} />
      {/* Bindirme kaplama (klinker) çizgileri */}
      <G stroke={p.plank} strokeWidth={1.6}>
        {[-0.5, 0, 0.5].map((k) => (
          <Line
            key={k}
            x1={L * 0.2}
            y1={50 + k * half * 0.7}
            x2={L * 0.8}
            y2={50 + k * half * 0.7}
          />
        ))}
      </G>
      {/* İç kaburga çizgisi */}
      <Path d={deck} fill="none" stroke={p.hullDark} strokeWidth={1.5} opacity={0.6} />

      {rig.cargo ? (
        <G stroke={p.outline} strokeWidth={1.5}>
          <Rect x={L * 0.22} y={42} width={22} height={16} rx={2} fill={p.hullDark} />
          <Rect x={L * 0.66} y={40} width={20} height={20} rx={2} fill={p.hullDark} />
          <Circle cx={L * 0.74 + 14} cy={50} r={6} fill={p.plank} />
        </G>
      ) : null}

      {/* Kalkan sırası */}
      {shieldXs.map((sx, i) => (
        <G key={sx} stroke={p.outline} strokeWidth={1.4}>
          {[top + 1, bot - 1].map((sy) => (
            <G key={sy}>
              <Circle cx={sx} cy={sy} r={8} fill={p.shields[i % p.shields.length]} />
              <Circle cx={sx} cy={sy} r={2.4} fill={p.boss} strokeWidth={0} />
            </G>
          ))}
        </G>
      ))}

      {/* Ejder başı (pruva) ve kıvrık kuyruk (pupa) */}
      {rig.dragon ? (
        <G stroke={p.outline} strokeWidth={2}>
          <Path
            d={`M${L - 26} 44 Q${L - 14} 38 ${L - 4} 45 L${L - 9} 50 L${L - 4} 55 Q${L - 14} 62 ${L - 26} 56 Z`}
            fill={p.dragon}
          />
          <Circle cx={L - 15} cy={46} r={1.8} fill={p.outline} strokeWidth={0} />
          <Path d={`M${L - 12} 41 l4 -5 M${L - 18} 40 l2 -6`} strokeLinecap="round" />
          <Path
            d="M22 50 C 12 50, 9 41, 15 39 C 20 38, 21 44, 17 45"
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
          />
        </G>
      ) : null}

      {/* Direk + kare yelken (üstten: rüzgârla şişmiş, çizgili bant) */}
      {rig.sail ? (
        <G>
          <Defs>
            <ClipPath id={clipId}>
              <Path d={sailPath(sailX)} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#${clipId})`}>
            <Rect x={sailX - 16} y={0} width={44} height={100} fill={p.sailB} />
            {[0, 2, 4, 6].map((k) => (
              <Rect key={k} x={sailX - 16} y={4 + k * 13} width={44} height={13} fill={p.sailA} />
            ))}
          </G>
          <Path d={sailPath(sailX)} fill="none" stroke={p.outline} strokeWidth={2.2} />
          <Line x1={sailX - 3} y1={2} x2={sailX - 3} y2={98} stroke={p.outline} strokeWidth={3} />
          <Circle
            cx={sailX - 3}
            cy={50}
            r={4}
            fill={p.hullDark}
            stroke={p.outline}
            strokeWidth={1.5}
          />
        </G>
      ) : null}

      {look === 'sunk' ? <SunkScorch L={L} top={top} bot={bot} /> : null}
    </G>
  );
});

/** Çift uçlu (iki ucu sivri) uzun gemi gövdesi. inset: uçların içeri çekilmesi. */
function hullPath(L: number, top: number, bot: number, inset: number): string {
  const a = inset;
  const b = L - inset;
  return [
    `M${a} 50`,
    `C${L * 0.1 + a * 0.5} ${top + 4}, ${L * 0.22} ${top}, ${L * 0.32} ${top}`,
    `L${L * 0.68} ${top}`,
    `C${L * 0.78} ${top}, ${L * 0.9 - a * 0.5} ${top + 4}, ${b} 50`,
    `C${L * 0.9 - a * 0.5} ${bot - 4}, ${L * 0.78} ${bot}, ${L * 0.68} ${bot}`,
    `L${L * 0.32} ${bot}`,
    `C${L * 0.22} ${bot}, ${L * 0.1 + a * 0.5} ${bot - 4}, ${a} 50`,
    'Z',
  ].join(' ');
}

/** Üstten görülen şişkin yelken: direğin önünde, baş tarafa doğru kavisli bant. */
function sailPath(x: number): string {
  return `M${x - 4} 3 Q${x + 22} 50 ${x - 4} 97 L${x + 6} 97 Q${x + 30} 50 ${x + 6} 3 Z`;
}

/** Batmış geminin üstünde yanık izleri. */
function SunkScorch({ L, top, bot }: { L: number; top: number; bot: number }) {
  return (
    <G fill="#1e1612" opacity={0.45}>
      <Path d={`M${L * 0.3} ${top + 6} q14 10 4 22 q-10 -6 -16 4 q2 -16 12 -26 Z`} />
      <Path d={`M${L * 0.62} ${bot - 6} q-12 -10 -2 -22 q8 6 14 -2 q-2 14 -12 24 Z`} />
    </G>
  );
}

export type ShipSpriteProps = {
  ship: ShipType;
  /** Hücre boyutu (px). Genişlik = boyut × cell. */
  cell: number;
  orientation?: Orientation;
  look?: ShipLook;
};

/** Tek başına gemi (filo listesi, oyun sonu ekranı). */
export function ShipSprite({ ship, cell, orientation = 'horizontal', look }: ShipSpriteProps) {
  const idPrefix = useSvgId('sprite');
  const len = shipSize(ship) * cell;
  const w = orientation === 'horizontal' ? len : cell;
  const h = orientation === 'horizontal' ? cell : len;
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <ShipShape
        ship={ship}
        orientation={orientation}
        x={0}
        y={0}
        cell={cell}
        look={look}
        idPrefix={idPrefix}
      />
    </Svg>
  );
}
