import { useRecordsStore } from '@/store/recordsStore';

import { hudScore, leaderboard, summarize } from './score';

/** Kapak/giriş HUD'u: 1UP = oyuncunun en iyi skoru, HI-SCORE = tablonun zirvesi. */
export function useHudScores(playerId: string | null | undefined) {
  const records = useRecordsStore((s) => s.records);
  return {
    one: hudScore(playerId ? summarize(records, playerId).best : 0),
    hi: hudScore(leaderboard(records, 1)[0]?.score ?? 0),
  };
}
