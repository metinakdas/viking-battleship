/** Oyun sonu kaydı (cihazda saklanır; çevrimiçi sunucu gelince oradan gelecek). */
import { upperLocale } from '@/i18n';
export type GameRecord = {
  readonly id: string;
  /** epoch ms */
  readonly at: number;
  readonly playerId: string;
  readonly playerName: string;
  readonly mode: 'ai' | 'hotseat' | 'online';
  readonly opponentName: string;
  readonly won: boolean;
  readonly shots: number;
  readonly hits: number;
  readonly turns: number;
  readonly score: number;
};

export type ScoreEntry = {
  readonly name: string;
  readonly score: number;
  readonly record?: GameRecord;
};

/** Kusursuz zafer (17 atışta 17 isabet) = 68 500; iyi bir zafer tasarımdaki 050 000'i geçer. */
export const SCORE = { perHit: 1000, win: 10_000, perSavedShot: 500, par: 100 } as const;

export function arcadeScore({
  won,
  shots,
  hits,
}: {
  won: boolean;
  shots: number;
  hits: number;
}): number {
  const base = hits * SCORE.perHit;
  if (!won) return base;
  return base + SCORE.win + Math.max(0, SCORE.par - shots) * SCORE.perSavedShot;
}

/** Arcade geleneği: tablo hiç boş görünmesin diye hazır rakip skorları. En üstteki tasarımdaki HI-SCORE. */
export const SEED_SCORES: readonly ScoreEntry[] = [
  { name: 'AMİRAL', score: 50_000 },
  { name: 'KORSAN', score: 40_000 },
  { name: 'KAPTAN', score: 30_000 },
  { name: 'LOSTROMO', score: 20_000 },
  { name: 'MİÇO', score: 10_000 },
];

/** Hazır skorlar + kayıtlar, büyükten küçüğe; eşitlikte önce gelen üstte. */
export function leaderboard(records: readonly GameRecord[], limit = 10): ScoreEntry[] {
  const own = [...records]
    .sort((a, b) => a.at - b.at)
    .map((r): ScoreEntry => ({
      name: r.playerName.toLocaleUpperCase(upperLocale()),
      score: r.score,
      record: r,
    }));
  return [...SEED_SCORES, ...own].sort((a, b) => b.score - a.score).slice(0, limit);
}

export type PlayerSummary = {
  played: number;
  won: number;
  shots: number;
  hits: number;
  best: number;
};

export function summarize(records: readonly GameRecord[], playerId: string): PlayerSummary {
  const mine = records.filter((r) => r.playerId === playerId);
  return {
    played: mine.length,
    won: mine.filter((r) => r.won).length,
    shots: mine.reduce((n, r) => n + r.shots, 0),
    hits: mine.reduce((n, r) => n + r.hits, 0),
    best: mine.reduce((n, r) => Math.max(n, r.score), 0),
  };
}

/** HUD biçimi: 6 hane, başı sıfırlı ("050000"). */
export const hudScore = (n: number) =>
  String(Math.min(999_999, Math.max(0, Math.round(n)))).padStart(6, '0');
