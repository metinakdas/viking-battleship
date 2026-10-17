import { describe, expect, it } from 'vitest';

import {
  arcadeScore,
  hudScore,
  leaderboard,
  SEED_SCORES,
  summarize,
  type GameRecord,
} from './score';

const rec = (p: Partial<GameRecord>): GameRecord => ({
  id: 'r',
  at: 0,
  playerId: 'p1',
  playerName: 'Ragnar',
  mode: 'ai',
  opponentName: 'CPU',
  won: true,
  shots: 40,
  hits: 17,
  turns: 79,
  score: 0,
  ...p,
});

describe('arcade skoru', () => {
  it('yenilgide yalnızca isabet puanı', () => {
    expect(arcadeScore({ won: false, shots: 60, hits: 9 })).toBe(9000);
  });
  it('kusursuz zafer 68 500', () => {
    expect(arcadeScore({ won: true, shots: 17, hits: 17 })).toBe(68_500);
  });
  it('100 atışı geçen zaferde atış bonusu negatif olmaz', () => {
    expect(arcadeScore({ won: true, shots: 100, hits: 17 })).toBe(27_000);
    expect(arcadeScore({ won: true, shots: 130, hits: 17 })).toBe(27_000);
  });
  it('iyi bir zafer tasarımdaki HI-SCORE (050000) ile yarışır', () => {
    expect(arcadeScore({ won: true, shots: 45, hits: 17 })).toBeGreaterThan(50_000);
  });
});

describe('rekor tablosu', () => {
  it('kayıt yokken hazır skorlar', () => {
    expect(leaderboard([])).toEqual([...SEED_SCORES]);
  });
  it('sıralar, büyük harfe çevirir, keser', () => {
    const top = leaderboard([rec({ score: 45_000, playerName: 'şirin' })], 3);
    expect(top.map((e) => e.score)).toEqual([50_000, 45_000, 40_000]);
    expect(top[1]?.name).toBe('ŞİRİN');
  });
});

describe('oyuncu özeti', () => {
  it('yalnızca o oyuncunun kayıtları', () => {
    const s = summarize(
      [rec({ score: 100 }), rec({ won: false, score: 300 }), rec({ playerId: 'p2', score: 999 })],
      'p1',
    );
    expect(s).toEqual({ played: 2, won: 1, shots: 80, hits: 34, best: 300 });
  });
});

describe('HUD', () => {
  it('6 hane', () => {
    expect(hudScore(50_000)).toBe('050000');
    expect(hudScore(0)).toBe('000000');
  });
});
