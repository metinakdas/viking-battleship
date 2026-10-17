import { useEffect, useRef } from 'react';

import { useReducedMotion } from '@/features/game/hooks';

import { startPixelGrid, type GridConfig, type PixelGridController } from './canvas/pixelGrid';

export type PixelGridProps = GridConfig & {
  /** Görüntü boyutu (tasarım tuvali px). Varsayılan C × 40 (hücre × 4 × 10). */
  size?: number;
};

/**
 * 10×10 canlı piksel ızgara (web: gerçek canvas). Oyun durumu her karede okunur;
 * canvas yalnızca hücre boyutu (C) değişince yeniden kurulur.
 */
export function PixelGrid({ size, ...config }: PixelGridProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<GridConfig>(config);
  const ctl = useRef<PixelGridController | null>(null);
  const still = useReducedMotion();

  useEffect(() => {
    live.current = config;
    ctl.current?.redraw();
  });

  useEffect(() => {
    if (!ref.current) return;
    const c = startPixelGrid(ref.current, () => live.current, still);
    ctl.current = c;
    return () => {
      c.stop();
      ctl.current = null;
    };
  }, [config.C, still]);

  const px = size ?? config.C * 40;
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        width: px,
        height: px,
        display: 'block',
        imageRendering: 'pixelated',
        pointerEvents: 'none',
      }}
    />
  );
}
