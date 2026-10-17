import { router } from 'expo-router';
import { useCallback } from 'react';

import { CoverScreen } from '@/features/arcade/screens/CoverScreen';
import { useHudScores } from '@/features/records/useHudScores';
import { useAuthStore } from '@/store/authStore';

/** Kapak ("PRESS START"): girişliyse mod menüsüne, değilse girişe. */
export default function Cover() {
  const player = useAuthStore((s) => s.player);
  const hud = useHudScores(player?.id);
  const start = useCallback(() => {
    router.push(player ? '/lobby' : '/login');
  }, [player]);
  return <CoverScreen score={hud.one} hiScore={hud.hi} onStart={start} />;
}
