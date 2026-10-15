import { G, Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/ui';

/**
 * Hücre işaretleri. Hepsi (x, y) sol üst köşe ve s hücre boyutu (px) ile, bir <Svg> içinde.
 * Renk körlüğü: isabet ve ıska yalnızca renkle değil ŞEKİLLE de ayrılır
 * (isabet = alev yıldızı, ıska = halka + nokta).
 */
type CellProps = { x: number; y: number; s: number };

/**
 * 8 kollu alev yıldızı + sıcak çekirdek.
 * compact: batık gemi hücrelerinde sağ üst köşede küçük köz; gemi görünür kalır.
 */
export function HitMarker({ x, y, s, compact = false }: CellProps & { compact?: boolean }) {
  const k = compact ? 0.5 : 1;
  const cx = compact ? x + s * 0.74 : x + s / 2;
  const cy = compact ? y + s * 0.26 : y + s / 2;
  const R = s * 0.4 * k;
  const r = s * 0.17 * k;
  const pts = Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R * (i % 4 === 0 ? 1 : 0.78) : r;
    return `${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`;
  }).join(' ');
  return (
    <G>
      {compact ? null : <Circle cx={cx} cy={cy} r={s * 0.36} fill={colors.fire} opacity={0.25} />}
      <Path
        d={`M${pts}Z`}
        fill={colors.fire}
        stroke="#7a2a0c"
        strokeWidth={Math.max(1, s * 0.03)}
      />
      <Circle cx={cx} cy={cy} r={s * 0.12 * k} fill={colors.fireCore} />
    </G>
  );
}

/** Halka + nokta: su sıçraması. */
export function MissMarker({ x, y, s }: CellProps) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  return (
    <G>
      <Circle
        cx={cx}
        cy={cy}
        r={s * 0.24}
        fill="none"
        stroke="#ffffff"
        strokeWidth={Math.max(1.2, s * 0.05)}
        opacity={0.85}
      />
      <Circle cx={cx} cy={cy} r={s * 0.07} fill="#ffffff" opacity={0.9} />
    </G>
  );
}

/** Batık gemi hücresi: turuncu çerçeve. */
export function SunkFrame({ x, y, s }: CellProps) {
  const w = Math.max(1.5, s * 0.05);
  return (
    <Rect
      x={x + w / 2 + 1}
      y={y + w / 2 + 1}
      width={s - w - 2}
      height={s - w - 2}
      rx={s * 0.12}
      fill="none"
      stroke={colors.fire}
      strokeWidth={w}
    />
  );
}

/** Altın nişangah: halka, dört çentik ve köşe ayraçları. */
export function Reticle({ x, y, s }: CellProps) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const r = s * 0.32;
  const w = Math.max(1.5, s * 0.05);
  const c = s * 0.18;
  return (
    <G stroke={colors.gold} strokeWidth={w} fill="none" strokeLinecap="round">
      <Circle cx={cx} cy={cy} r={r} />
      <Path
        d={`M${cx} ${cy - r - s * 0.08}V${cy - r * 0.45}M${cx} ${cy + r + s * 0.08}V${cy + r * 0.45}M${cx - r - s * 0.08} ${cy}H${cx - r * 0.45}M${cx + r + s * 0.08} ${cy}H${cx + r * 0.45}`}
      />
      <Path
        d={`M${x + 2} ${y + 2 + c}V${y + 2}H${x + 2 + c}M${x + s - 2 - c} ${y + 2}H${x + s - 2}V${y + 2 + c}M${x + s - 2} ${y + s - 2 - c}V${y + s - 2}H${x + s - 2 - c}M${x + 2 + c} ${y + s - 2}H${x + 2}V${y + s - 2 - c}`}
      />
    </G>
  );
}

/** Yerleştirme önizleme hücresi: geçerliyse kesik altın, değilse kırmızı-turuncu. */
export function PreviewCell({ x, y, s, valid }: CellProps & { valid: boolean }) {
  const color = valid ? colors.gold : colors.danger;
  return (
    <Rect
      x={x + 2}
      y={y + 2}
      width={s - 4}
      height={s - 4}
      rx={s * 0.12}
      fill={color}
      fillOpacity={valid ? 0.14 : 0.22}
      stroke={color}
      strokeWidth={Math.max(1.5, s * 0.05)}
      strokeDasharray={`${s * 0.14} ${s * 0.09}`}
    />
  );
}
