import Svg, { Circle, G, Rect } from 'react-native-svg';

import type { GridConfig } from './canvas/pixelGrid';

import { isDay } from './theme';

export type PixelGridProps = GridConfig & {
  /** Görüntü boyutu (tasarım tuvali px). Varsayılan C × 40. */
  size?: number;
};

/**
 * iOS/Android yedeği: canvas yok; ızgaranın statik SVG özeti (su dama tahtası, gemiler, isabet/ıska,
 * nişangah, önizleme). Web sürümü (PixelGrid.web.tsx) tasarımdaki canlı canvas'ın birebir aktarımıdır.
 */
export function PixelGrid({
  size,
  C,
  ships,
  hit,
  miss,
  aim,
  tint,
  last,
  ghost,
  ghostInvalid,
}: PixelGridProps) {
  const W = C * 10;
  const px = size ?? C * 40;
  return (
    <Svg width={px} height={px} viewBox={`0 0 ${W} ${W}`} aria-hidden>
      {Array.from({ length: 100 }, (_, i) => {
        const c = i % 10;
        const r = Math.floor(i / 10);
        return (
          <Rect
            key={i}
            x={c * C}
            y={r * C}
            width={C}
            height={C}
            fill={
              isDay() ? ((r + c) % 2 ? '#1f86c8' : '#238fd0') : (r + c) % 2 ? '#16206a' : '#192574'
            }
          />
        );
      })}
      {tint ? (
        <G opacity={0.14} fill="#ffd23f">
          <Rect x={0} y={tint[1] * C} width={W} height={C} />
          <Rect x={tint[0] * C} y={0} width={C} height={W} />
        </G>
      ) : null}
      <G opacity={0.35} fill={isDay() ? '#bfe6ff' : '#6f7fe0'}>
        {Array.from({ length: 9 }, (_, i) => (
          <G key={i}>
            <Rect x={(i + 1) * C} y={0} width={1} height={W} />
            <Rect x={0} y={(i + 1) * C} width={W} height={1} />
          </G>
        ))}
      </G>
      {(ships ?? []).map(([c, r, n, v, st]) => (
        <Rect
          key={`${c}-${r}`}
          x={c * C + 2}
          y={r * C + 2}
          width={(v ? 1 : n) * C - 4}
          height={(v ? n : 1) * C - 4}
          fill={st === 's' ? '#4a3c34' : '#9a5a2a'}
          stroke={st === 's' ? '#14100c' : '#2a1608'}
        />
      ))}
      {(miss ?? []).map(([c, r]) => (
        <G key={`m${c}-${r}`}>
          <Circle cx={c * C + C / 2} cy={r * C + C / 2} r={C * 0.3} stroke="#bcd6ff" fill="none" />
          <Rect x={c * C + C / 2 - 1} y={r * C + C / 2 - 1} width={2} height={2} fill="#eef6ff" />
        </G>
      ))}
      {(hit ?? []).map(([c, r]) => (
        <G key={`h${c}-${r}`}>
          <Rect
            x={c * C + 1}
            y={r * C + 1}
            width={C - 2}
            height={C - 2}
            fill="#ff5a2a"
            opacity={0.4}
          />
          <Rect x={c * C + C / 2 - 2} y={r * C + C / 2 - 2} width={4} height={4} fill="#ffd23f" />
        </G>
      ))}
      {last ? (
        <Rect
          x={last[0] * C}
          y={last[1] * C}
          width={C}
          height={C}
          fill="none"
          stroke="#ff4f6a"
          strokeDasharray="2 2"
        />
      ) : null}
      {ghost ? (
        <Rect
          x={ghost[0] * C}
          y={ghost[1] * C}
          width={(ghost[3] ? 1 : ghost[2]) * C}
          height={(ghost[3] ? ghost[2] : 1) * C}
          fill={ghostInvalid ? '#ff4f6a' : '#ffd23f'}
          fillOpacity={0.18}
          stroke={ghostInvalid ? '#ff4f6a' : '#ffd23f'}
          strokeDasharray="2 2"
        />
      ) : null}
      {aim ? (
        <Rect
          x={aim[0] * C}
          y={aim[1] * C}
          width={C}
          height={C}
          fill="#ffd23f"
          fillOpacity={0.28}
          stroke="#ffd23f"
        />
      ) : null}
    </Svg>
  );
}
