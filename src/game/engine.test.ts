import { describe, expect, it } from 'vitest';

import { shipCells } from './board';
import {
  afloatShips,
  applyAction,
  createGame,
  GameRuleError,
  otherSeat,
  shotStats,
  tryApplyAction,
  untargetedCells,
} from './engine';
import { DEFAULT_SETTINGS } from './rules';
import {
  battleState,
  fire,
  FLEET_A,
  FLEET_A_CELLS,
  lobbyWithPlayers,
  SAFE_MISSES,
} from './test-utils';
import type { GameAction, GameState } from './types';

function expectError(state: GameState, action: GameAction, code: string) {
  const r = tryApplyAction(state, action);
  expect(r).toEqual({ ok: false, error: code });
}

describe('oluşturma ve lobi', () => {
  it('varsayılan ayarlarla lobi', () => {
    const s = createGame({ seed: 1 });
    expect(s.phase).toBe('lobby');
    expect(s.settings).toEqual(DEFAULT_SETTINGS);
    expect(s.settings.extraShotOnHit).toBe(false);
    expect(s.settings.turnSeconds).toBe(20);
    expect(s.version).toBe(0);
  });

  it('geçersiz ayarla oluşturma fırlatır', () => {
    expect(() => createGame({ seed: 1, settings: { turnSeconds: -5 } })).toThrow(GameRuleError);
  });

  it('katılma, dolu koltuk, ayrılma', () => {
    let s = createGame({ seed: 1 });
    s = applyAction(s, { type: 'join', seat: 0, playerId: 'alice' });
    expectError(s, { type: 'join', seat: 0, playerId: 'bob' }, 'seat_taken');
    s = applyAction(s, { type: 'leave', seat: 0 });
    expect(s.seats[0].playerId).toBeNull();
  });

  it('geçersiz koltuk', () => {
    expectError(
      createGame({ seed: 1 }),
      { type: 'join', seat: 2 as 0, playerId: 'x' },
      'invalid_seat',
    );
  });

  it('iki oyuncu olmadan yerleştirmeye geçilmez', () => {
    let s = createGame({ seed: 1 });
    s = applyAction(s, { type: 'join', seat: 0, playerId: 'alice' });
    expectError(s, { type: 'startPlacement' }, 'seats_not_full');
  });

  it('ayarlar yalnızca lobide ve geçerliyse değişir', () => {
    let s = lobbyWithPlayers();
    s = applyAction(s, {
      type: 'updateSettings',
      settings: { extraShotOnHit: true, turnSeconds: 0 },
    });
    expect(s.settings).toMatchObject({
      extraShotOnHit: true,
      turnSeconds: 0,
      timeoutPolicy: 'randomShot',
    });
    expectError(s, { type: 'updateSettings', settings: { turnSeconds: 1.5 } }, 'invalid_settings');
    expectError(
      s,
      { type: 'updateSettings', settings: { timeoutPolicy: 'x' as 'skipTurn' } },
      'invalid_settings',
    );
    s = applyAction(s, { type: 'startPlacement' });
    expectError(s, { type: 'updateSettings', settings: { turnSeconds: 15 } }, 'wrong_phase');
  });

  it("her başarılı aksiyon sürümü artırır, hatalı olan state'e dokunmaz", () => {
    const s = lobbyWithPlayers();
    expect(s.version).toBe(2);
    const before = JSON.stringify(s);
    expect(() => applyAction(s, { type: 'fire', seat: 0, at: { row: 0, col: 0 } })).toThrow(
      GameRuleError,
    );
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('yerleştirme aşaması', () => {
  const placing = () => applyAction(lobbyWithPlayers(), { type: 'startPlacement' });

  it('geçersiz filo reddedilir', () => {
    expectError(
      placing(),
      { type: 'placeFleet', seat: 0, fleet: FLEET_A.slice(1) },
      'invalid_fleet',
    );
  });

  it('hazır olan tekrar dizemez; unready ile geri alır', () => {
    let s = applyAction(placing(), { type: 'placeFleet', seat: 0, fleet: FLEET_A });
    expect(s.seats[0].ready).toBe(true);
    expect(s.phase).toBe('placement');
    expectError(s, { type: 'placeFleet', seat: 0, fleet: FLEET_A }, 'already_ready');
    s = applyAction(s, { type: 'unready', seat: 0 });
    expect(s.seats[0].ready).toBe(false);
    expect(s.seats[0].fleet).toEqual(FLEET_A);
  });

  it('ikisi de hazır olunca savaş başlar, ilk sıra firstSeat', () => {
    const s = battleState({ firstSeat: 1 });
    expect(s.phase).toBe('battle');
    expect(s.turn).toBe(1);
    expect(s.turnNumber).toBe(1);
  });

  it('saklanan filo gelen nesneden bağımsızdır (fazla alanlar atılır)', () => {
    const dirty = FLEET_A.map((p) => ({ ...p, secret: 'x' }));
    const s = applyAction(placing(), { type: 'placeFleet', seat: 0, fleet: dirty });
    expect(s.seats[0].fleet).toEqual(FLEET_A);
    expect(JSON.stringify(s.seats[0].fleet)).not.toContain('secret');
  });

  it('savaş başlamadan ateş edilmez', () => {
    expectError(placing(), { type: 'fire', seat: 0, at: { row: 0, col: 0 } }, 'wrong_phase');
  });
});

describe('savaş', () => {
  it('ıska: sıra geçer', () => {
    const s = fire(battleState(), 0, SAFE_MISSES[0]!);
    expect(s.shots.at(-1)).toMatchObject({ by: 0, result: 'miss', turn: 1 });
    expect(s.turn).toBe(1);
    expect(s.turnNumber).toBe(2);
  });

  it('isabet: varsayılanda sıra yine geçer', () => {
    const s = fire(battleState(), 0, { row: 0, col: 0 });
    expect(s.shots.at(-1)?.result).toBe('hit');
    expect(s.turn).toBe(1);
  });

  it('"isabette tekrar ateş" açıkken isabet sırayı korur, ıska geçirir', () => {
    let s = battleState({ settings: { extraShotOnHit: true } });
    s = fire(s, 0, { row: 0, col: 0 });
    expect(s.turn).toBe(0);
    expect(s.turnNumber).toBe(1);
    s = fire(s, 0, SAFE_MISSES[0]!);
    expect(s.turn).toBe(1);
  });

  it('sırası olmayan ateş edemez', () => {
    expectError(battleState(), { type: 'fire', seat: 1, at: { row: 0, col: 0 } }, 'not_your_turn');
  });

  it('tahta dışı ve aynı hücreye ikinci atış reddedilir', () => {
    let s = battleState();
    expectError(s, { type: 'fire', seat: 0, at: { row: 10, col: 0 } }, 'out_of_bounds');
    s = fire(s, 0, SAFE_MISSES[0]!);
    s = fire(s, 1, SAFE_MISSES[0]!); // rakip aynı koordinata kendi tarafında ateş edebilir
    expectError(s, { type: 'fire', seat: 0, at: SAFE_MISSES[0]! }, 'already_fired');
  });

  it('son hücre vurulunca "batırıldı" ve gemi kaydı', () => {
    let s = battleState({ settings: { extraShotOnHit: true } });
    s = fire(s, 0, { row: 8, col: 8 });
    expect(s.shots.at(-1)?.result).toBe('hit');
    s = fire(s, 0, { row: 8, col: 9 });
    expect(s.shots.at(-1)).toMatchObject({ result: 'sunk', sunk: FLEET_A[4] });
  });

  it('tüm gemiler batınca oyun biter', () => {
    let s = battleState();
    // Seat 0 tüm gemileri vurur; seat 1 her seferinde ıska (17 farklı ıska hücresi gerekir).
    const misses = untargetedCells(s, 1).filter(
      (c) => !FLEET_A_CELLS.some((f) => f.row === c.row && f.col === c.col),
    );
    FLEET_A_CELLS.forEach((cell, i) => {
      s = fire(s, 0, cell);
      if (s.phase === 'battle') s = fire(s, 1, misses[i]!);
    });
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe(0);
    expect(s.finishReason).toBe('allSunk');
    expect(s.shots.filter((x) => x.by === 0 && x.result === 'sunk')).toHaveLength(5);
    expectError(s, { type: 'fire', seat: 1, at: misses[20]! }, 'wrong_phase');
  });
});

describe('süre dolması', () => {
  it('randomShot: rastgele, daha önce atılmamış bir hücreye otomatik atış', () => {
    let s = battleState({ settings: { timeoutPolicy: 'randomShot' } });
    s = applyAction(s, { type: 'timeout', seat: 0 });
    const shot = s.shots.at(-1);
    expect(shot).toMatchObject({ by: 0, auto: true });
    expect(s.shots).toHaveLength(1);
  });

  it('randomShot deterministik: aynı tohum aynı hücre, farklı tohum (çoğunlukla) farklı', () => {
    const at = (seed: number) =>
      applyAction(battleState({ seed }), { type: 'timeout', seat: 0 }).shots.at(-1)?.at;
    expect(at(5)).toEqual(at(5));
    const distinct = new Set([1, 2, 3, 4, 5, 6].map((x) => JSON.stringify(at(x))));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('randomShot hiç aynı hücreye iki kez atmaz', () => {
    let s = battleState({ settings: { timeoutPolicy: 'randomShot', extraShotOnHit: false } });
    for (let i = 0; i < 60 && s.phase === 'battle'; i++) {
      s = applyAction(s, { type: 'timeout', seat: s.turn });
    }
    for (const seat of [0, 1] as const) {
      const cells = s.shots.filter((x) => x.by === seat).map((x) => `${x.at.row},${x.at.col}`);
      expect(new Set(cells).size).toBe(cells.length);
    }
  });

  it('skipTurn: atış yapmadan sıra geçer', () => {
    let s = battleState({ settings: { timeoutPolicy: 'skipTurn' } });
    s = applyAction(s, { type: 'timeout', seat: 0 });
    expect(s.shots).toHaveLength(0);
    expect(s.turn).toBe(1);
    expect(s.turnNumber).toBe(2);
  });

  it('sırası olmayan için timeout reddedilir', () => {
    expectError(battleState(), { type: 'timeout', seat: 1 }, 'not_your_turn');
  });
});

describe('hükmen ve rövanş', () => {
  it('teslim olan kaybeder', () => {
    const s = applyAction(battleState(), { type: 'forfeit', seat: 0, reason: 'resign' });
    expect(s).toMatchObject({ phase: 'finished', winner: 1, finishReason: 'resign' });
  });

  it('bağlantı kopması yerleştirmede de bitirir; lobide olmaz', () => {
    const placing = applyAction(lobbyWithPlayers(), { type: 'startPlacement' });
    const s = applyAction(placing, { type: 'forfeit', seat: 1, reason: 'disconnect' });
    expect(s).toMatchObject({ winner: 0, finishReason: 'disconnect' });
    expectError(lobbyWithPlayers(), { type: 'forfeit', seat: 0, reason: 'resign' }, 'wrong_phase');
  });

  it('rövanş: aynı oyuncular, sıfır tahta, ilk sıra diğer koltukta', () => {
    let s = applyAction(battleState(), { type: 'forfeit', seat: 0, reason: 'resign' });
    s = applyAction(s, { type: 'rematch' });
    expect(s.phase).toBe('placement');
    expect(s.seats.map((x) => x.playerId)).toEqual(['alice', 'bob']);
    expect(s.seats.every((x) => !x.ready && x.fleet === null)).toBe(true);
    expect(s.shots).toEqual([]);
    expect(s.winner).toBeNull();
    expect(s.firstSeat).toBe(1);
    expectError(s, { type: 'rematch' }, 'wrong_phase');
  });
});

describe('determinizm ve serileştirme', () => {
  it('aynı aksiyon dizisi aynı state', () => {
    const run = () => {
      let s = battleState({ seed: 'oda-ABC123' });
      s = applyAction(s, { type: 'timeout', seat: 0 });
      s = applyAction(s, { type: 'timeout', seat: 1 });
      return s;
    };
    expect(run()).toEqual(run());
  });

  it('JSON gidiş-dönüşünden sonra oyun aynen sürer', () => {
    const s = battleState();
    const copy = JSON.parse(JSON.stringify(s)) as GameState;
    expect(copy).toEqual(s);
    const a = applyAction(s, { type: 'timeout', seat: 0 });
    const b = applyAction(copy, { type: 'timeout', seat: 0 });
    expect(b).toEqual(a);
  });

  it('state değiştirilmez (immutability)', () => {
    const s = battleState();
    const frozen = JSON.stringify(s);
    fire(s, 0, { row: 0, col: 0 });
    expect(JSON.stringify(s)).toBe(frozen);
  });
});

describe('yardımcılar', () => {
  it('otherSeat', () => {
    expect(otherSeat(0)).toBe(1);
    expect(otherSeat(1)).toBe(0);
  });

  it('shotStats', () => {
    expect(shotStats([])).toEqual({ shots: 0, hits: 0, accuracy: 0 });
    let s = battleState({ settings: { extraShotOnHit: true } });
    s = fire(s, 0, { row: 8, col: 8 });
    s = fire(s, 0, { row: 8, col: 9 });
    s = fire(s, 0, SAFE_MISSES[0]!);
    expect(shotStats(s.shots)).toEqual({ shots: 3, hits: 2, accuracy: 2 / 3 });
  });

  it('afloatShips', () => {
    expect(afloatShips(['sloop', 'galleon'])).toEqual(['frigate', 'corvette', 'brig']);
  });

  it('örnek filo 17 hücre', () => {
    expect(FLEET_A.flatMap(shipCells)).toHaveLength(17);
  });
});
