import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

import type { GameSnapshot, GameTransport } from '@/services/transport/types';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * useSyncExternalStore için önbellekli kaynak: get() iki bildirim arasında aynı nesneyi döner
 * (yoksa React sonsuz render'a girer).
 */
export function cachedSource<T>(read: () => T, listen: (onChange: () => void) => () => void) {
  let cached = read();
  return {
    subscribe: (onChange: () => void) => {
      cached = read();
      return listen(() => {
        cached = read();
        onChange();
      });
    },
    get: () => cached,
  };
}

/** Taşıyıcının güncel görüntüsü. */
export function useGameSnapshot(transport: GameTransport): GameSnapshot {
  const source = useMemo(
    () =>
      cachedSource(
        () => transport.getSnapshot(),
        (cb) => transport.subscribe(cb),
      ),
    [transport],
  );
  return useSyncExternalStore(source.subscribe, source.get, source.get);
}

/** Bitiş anına kalan tam saniye (0'da durur); bitiş yoksa null. */
export function useCountdown(endsAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);
  if (endsAt === null) return null;
  // Aşağı yuvarla: "now" 250 ms'ye kadar eski olabilir; yukarı yuvarlama 30 sn turda 0:31 gösterirdi.
  return Math.max(0, Math.floor((endsAt - now) / 1000));
}

/** Sistem "hareketi azalt" tercihi VEYA uygulama ayarı. */
export function useReducedMotion(): boolean {
  const pref = useSettingsStore((s) => s.reduceMotion);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setSystem(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystem);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return pref || system;
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
