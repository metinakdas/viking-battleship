import { describe, expect, it } from 'vitest';

import { cellIndex, inBounds } from '../board';
import { applyAction, createGame, getPlayerView } from '../engine';
import { isValidFleet, randomFleet } from '../placement';
import { createRng } from '../rng';
import { FLEET_A } from '../test-utils';
import type { GameState, Placement, ShotRecord } from '../types';
import {
  AI_LEVELS,
  aiFleet,
  aiThinkDelayMs,
  chooseShot,
  chooseShotFromKnowledge,
  type AiLevel,
} from './index';
import { densityMap } from './hard';
import { knowledgeFromShots } from './knowledge';

/**
 * Yapay zekâ (seat 0) rastgele bir filoya karşı oynar; rakip her turunu süre dolmasıyla pas geçer.
 * Her atış gerçek motordan geçer: geçersiz atış fırlatır ve testi düşürür.
 */
function simulate(level: AiLevel, seed: number): { shots: number; state: GameState } {
  const rng = createRng(seed);
  let s: GameState = createGame({ seed, settings: { timeoutPolicy: 'skipTurn' } });
  s = applyAction(s, { type: 'join', seat: 0, playerId: 'ai' });
  s = applyAction(s, { type: 'join', seat: 1, playerId: 'target' });
  s = applyAction(s, { type: 'startPlacement' });
  s = applyAction(s, { type: 'placeFleet', seat: 0, fleet: FLEET_A });
  s = applyAction(s, { type: 'placeFleet', seat: 1, fleet: randomFleet(seed * 31 + 7) });

  let shots = 0;
  while (s.phase === 'battle') {
    if (s.turn === 1) {
      s = applyAction(s, { type: 'timeout', seat: 1 }); // hedef pas geçer
      continue;
    }
    const at = chooseShot(level, getPlayerView(s, 0), rng);
    s = applyAction(s, { type: 'fire', seat: 0, at }); // geçersiz atış olursa fırlatır → test düşer
    shots++;
    if (shots > 100) throw new Error('100 atışı aştı');
  }
  return { shots, state: s };
}

describe('yapay zekâ: geçerlilik', () => {
  for (const level of AI_LEVELS) {
    it(`${level}: 30 oyunda hep geçerli atış yapar ve oyunu bitirir`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const { state, shots } = simulate(level, seed);
        expect(state.phase).toBe('finished');
        expect(state.winner).toBe(0);
        expect(shots).toBeLessThanOrEqual(100);
        expect(shots).toBeGreaterThanOrEqual(17);
      }
    });
  }

  it('aynı tohum aynı oyun (deterministik)', () => {
    for (const level of AI_LEVELS) {
      expect(simulate(level, 11).state.shots).toEqual(simulate(level, 11).state.shots);
    }
  });
});

describe('yapay zekâ: güç sıralaması', () => {
  const avg = (level: AiLevel) => {
    let total = 0;
    for (let seed = 1; seed <= 40; seed++) total += simulate(level, seed).shots;
    return total / 40;
  };

  it('zor < normal < kolay (ortalama atış sayısı)', () => {
    const easy = avg('easy');
    const normal = avg('normal');
    const hard = avg('hard');
    expect(normal).toBeLessThan(easy);
    expect(hard).toBeLessThan(normal);
    // 300 oyunluk ölçüm (ortalama atış): kolay 95, normal 50, zor 38. Sınırlar geniş tutuldu.
    expect(easy).toBeGreaterThan(80);
    expect(hard).toBeLessThan(45);
  }, 30_000); // 120 tam oyun simülasyonu: yüklü makinede 5 sn sınırını aşabiliyor.
});

describe('yapay zekâ: hedefleme davranışı', () => {
  const rec = (
    row: number,
    col: number,
    result: ShotRecord['result'],
    sunk?: Placement,
  ): ShotRecord => ({
    by: 0,
    at: { row, col },
    result,
    turn: 1,
    ...(sunk ? { sunk } : {}),
  });

  it('normal: tek isabetten sonra dik komşulara ateş eder', () => {
    const k = knowledgeFromShots([rec(4, 4, 'hit')], []);
    for (let seed = 0; seed < 20; seed++) {
      const at = chooseShotFromKnowledge('normal', k, createRng(seed));
      expect(Math.abs(at.row - 4) + Math.abs(at.col - 4)).toBe(1);
    }
  });

  it('normal: iki yatay isabetten sonra hattın uçlarına ateş eder', () => {
    const k = knowledgeFromShots([rec(4, 4, 'hit'), rec(4, 5, 'hit')], []);
    for (let seed = 0; seed < 20; seed++) {
      const at = chooseShotFromKnowledge('normal', k, createRng(seed));
      expect(at.row).toBe(4);
      expect([3, 6]).toContain(at.col);
    }
  });

  it('normal: bir uç kapalıysa diğer uca gider', () => {
    const k = knowledgeFromShots([rec(4, 4, 'hit'), rec(4, 5, 'hit'), rec(4, 3, 'miss')], []);
    expect(chooseShotFromKnowledge('normal', k, createRng(1))).toEqual({ row: 4, col: 6 });
  });

  it('normal/zor: batık geminin çevresine ateş etmez', () => {
    const sloop: Placement = {
      ship: 'sloop',
      origin: { row: 0, col: 0 },
      orientation: 'horizontal',
    };
    const k = knowledgeFromShots([rec(0, 0, 'hit'), rec(0, 1, 'sunk', sloop)], [sloop]);
    const forbidden = [
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ].map(cellIndex);
    for (const level of ['normal', 'hard'] as const) {
      for (let seed = 0; seed < 30; seed++) {
        const at = chooseShotFromKnowledge(level, k, createRng(seed));
        expect(forbidden).not.toContain(cellIndex(at));
      }
    }
    expect(k.remaining).not.toContain('sloop');
  });

  it('zor: yoğunluk haritası ortayı köşeden yüksek puanlar, ateş edilen hücre 0', () => {
    const k = knowledgeFromShots([rec(5, 5, 'miss')], []);
    const d = densityMap(k);
    expect(d[cellIndex({ row: 4, col: 4 })]!).toBeGreaterThan(d[cellIndex({ row: 0, col: 0 })]!);
    expect(d[cellIndex({ row: 5, col: 5 })]).toBe(0);
  });

  it('zor: isabet sonrası komşuya ateş eder', () => {
    const k = knowledgeFromShots([rec(4, 4, 'hit')], []);
    const at = chooseShotFromKnowledge('hard', k, createRng(3));
    expect(Math.abs(at.row - 4) + Math.abs(at.col - 4)).toBe(1);
  });

  it('kolay: her zaman ateş edilmemiş tahta hücresi', () => {
    const shots = Array.from({ length: 99 }, (_, i) => rec(Math.floor(i / 10), i % 10, 'miss'));
    expect(chooseShotFromKnowledge('easy', knowledgeFromShots(shots, []), createRng(1))).toEqual({
      row: 9,
      col: 9,
    });
  });
});

describe('yapay zekâ: yardımcılar', () => {
  it('filo geçerli, gecikme 600–1200 ms', () => {
    const rng = createRng(5);
    for (let i = 0; i < 100; i++) {
      expect(isValidFleet(aiFleet(rng))).toBe(true);
      const d = aiThinkDelayMs(rng);
      expect(d).toBeGreaterThanOrEqual(600);
      expect(d).toBeLessThanOrEqual(1200);
    }
  });

  it('atışlar her zaman tahta içinde', () => {
    const rng = createRng(8);
    const k = knowledgeFromShots([], []);
    for (const level of AI_LEVELS)
      expect(inBounds(chooseShotFromKnowledge(level, k, rng))).toBe(true);
  });
});
