import { describe, expect, it } from 'vitest';

import { applyAction, getPlayerView } from '@/game';
import { battleState, fire, FLEET_A, SAFE_MISSES } from '@/game/test-utils';

import { buildLog, damageReport } from './log';

describe('seyir defteri', () => {
  it('iki tarafın atışları sırayla, en yeni üstte', () => {
    let s = battleState();
    s = fire(s, 0, SAFE_MISSES[0]!); // tur 1: ben ıska
    s = fire(s, 1, { row: 0, col: 0 }); // tur 2: rakip isabet (drakkar)
    s = fire(s, 0, { row: 8, col: 8 }); // tur 3: ben isabet
    const log = buildLog(getPlayerView(s, 0));
    expect(log.map((e) => [e.turn, e.actor, e.cell, e.result])).toEqual([
      [3, 'me', 'I9', 'hit'],
      [2, 'them', 'A1', 'hit'],
      [1, 'me', 'A10', 'miss'],
    ]);
  });

  it('batan gemi ve süre doldu işareti', () => {
    let s = battleState({ settings: { extraShotOnHit: true } });
    s = fire(s, 0, { row: 8, col: 8 });
    s = fire(s, 0, { row: 8, col: 9 });
    s = fire(s, 0, SAFE_MISSES[0]!);
    s = applyAction(s, { type: 'timeout', seat: 1 });
    const log = buildLog(getPlayerView(s, 0));
    expect(log[0]).toMatchObject({ actor: 'them', auto: true });
    expect(log.find((e) => e.result === 'sunk')).toMatchObject({ ship: 'faering', actor: 'me' });
  });

  it('hasar raporu: gemi başına isabet ve batma', () => {
    let s = battleState({ settings: { extraShotOnHit: true }, firstSeat: 1 });
    s = fire(s, 1, { row: 0, col: 0 });
    s = fire(s, 1, { row: 8, col: 8 });
    s = fire(s, 1, { row: 8, col: 9 });
    const report = damageReport(getPlayerView(s, 0));
    expect(report.find((r) => r.ship === 'drakkar')).toEqual({
      ship: 'drakkar',
      size: 5,
      hits: 1,
      sunk: false,
    });
    expect(report.find((r) => r.ship === 'faering')).toEqual({
      ship: 'faering',
      size: 2,
      hits: 2,
      sunk: true,
    });
    expect(report).toHaveLength(FLEET_A.length);
  });
});
