import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/features/game/hooks';

import { startNightSea, type NightSeaController } from './canvas/nightSea';
import { isDay } from './theme';

/**
 * Tam ekran canlı gece denizi (web: gerçek canvas, 480×270 mantıksal piksel, pikselli büyütme).
 * dim: giriş 0, kapak 0.3, yerleştirme/savaş 0.55.
 * onShipHit verilirse (giriş ekranı) denize tıklamak top atar; batırılan gemi puan getirir.
 */
export function NightSeaBackground({
  dim,
  onShipHit,
}: {
  dim: number;
  onShipHit?: (points: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctrl = useRef<NightSeaController | null>(null);
  const hit = useRef(onShipHit);
  const still = useReducedMotion();
  const playable = Boolean(onShipHit);

  useEffect(() => {
    hit.current = onShipHit;
  }, [onShipHit]);

  useEffect(() => {
    if (!ref.current) return;
    const c = startNightSea(ref.current, {
      dim,
      still,
      day: isDay(),
      onHit: (p) => hit.current?.(p),
    });
    ctrl.current = c;
    return () => {
      c.stop();
      ctrl.current = null;
    };
  }, [dim, still]);

  // Tıklanan ekran noktası → 480×270 tuval pikseli (object-fit: cover kırpmasını hesaba katar).
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = ref.current;
    if (!cv || !ctrl.current) return;
    const r = cv.getBoundingClientRect();
    const k = Math.max(r.width / 480, r.height / 270);
    const ox = (r.width - 480 * k) / 2;
    const oy = (r.height - 270 * k) / 2;
    ctrl.current.shoot((e.clientX - r.left - ox) / k, (e.clientY - r.top - oy) / k);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={playable ? 'auto' : 'none'} aria-hidden>
      <canvas
        ref={ref}
        width={480}
        height={270}
        onPointerDown={playable ? onPointerDown : undefined}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          // Ekran oranı 16:9 değilse kırparak doldur (bant kalmasın).
          objectFit: 'cover',
          imageRendering: 'pixelated',
          cursor: playable ? 'crosshair' : undefined,
          touchAction: 'manipulation',
        }}
      />
    </View>
  );
}
