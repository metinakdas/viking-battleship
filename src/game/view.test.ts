import { describe, expect, it } from 'vitest';

import { coordLabel, shipCells } from './board';
import { applyAction, getPlayerView } from './engine';
import { randomFleet } from './placement';
import { battleState, fire, FLEET_A, lobbyWithPlayers, SAFE_MISSES } from './test-utils';
import type { GameState, Seat } from './types';

/** Görünümün içinde rakibin batmamış gemi hücrelerinden herhangi biri geçiyor mu (koordinat olarak)? */
function leaksAfloatShips(state: GameState, seat: Seat): boolean {
  const view = getPlayerView(state, seat);
  const serialized = JSON.stringify(view.opponent);
  const opp = state.seats[seat === 0 ? 1 : 0];
  const sunkShips = new Set(view.opponent.sunk.map((p) => p.ship));
  const fired = new Set(view.opponent.incoming.map((s) => coordLabel(s.at)));
  return (opp.fleet ?? [])
    .filter((p) => !sunkShips.has(p.ship))
    .some(
      (p) =>
        serialized.includes(`"ship":"${p.ship}"`) ||
        shipCells(p).some(
          (c) => !fired.has(coordLabel(c)) && serialized.includes(JSON.stringify(c)),
        ),
    );
}

describe('getPlayerView: hile önleme', () => {
  it('yerleştirmede rakip filosu görünmez, kendi filon görünür', () => {
    let s = applyAction(lobbyWithPlayers(), { type: 'startPlacement' });
    s = applyAction(s, { type: 'placeFleet', seat: 1, fleet: randomFleet(3) });
    const view = getPlayerView(s, 0);
    expect(view.opponent.ready).toBe(true);
    expect(view.opponent.revealedFleet).toBeNull();
    expect(JSON.stringify(view)).not.toContain('"origin"');
    expect(getPlayerView(s, 1).me.fleet).toEqual(randomFleet(3));
  });

  it('savaş boyunca rakibin batmamış gemileri sızmaz', () => {
    let s = battleState({ settings: { extraShotOnHit: true } });
    s = fire(s, 0, { row: 0, col: 0 }); // kalyona isabet, batmadı
    s = fire(s, 0, { row: 8, col: 8 });
    s = fire(s, 0, { row: 8, col: 9 }); // şalupa battı
    expect(leaksAfloatShips(s, 0)).toBe(false);
    expect(leaksAfloatShips(s, 1)).toBe(false);

    const view = getPlayerView(s, 0);
    expect(view.opponent.sunk).toEqual([FLEET_A[4]]);
    expect(view.opponent.incoming.map((x) => x.result)).toEqual(['hit', 'hit', 'sunk']);
    // İsabet kaydı hangi gemi olduğunu söylemez.
    expect(view.opponent.incoming[0]).not.toHaveProperty('sunk');
    expect(getPlayerView(s, 1).me.sunk).toEqual(['sloop']);
  });

  it('sıra bilgisi', () => {
    const s = battleState();
    expect(getPlayerView(s, 0).isMyTurn).toBe(true);
    expect(getPlayerView(s, 1).isMyTurn).toBe(false);
    const after = fire(s, 0, SAFE_MISSES[0]!);
    expect(getPlayerView(after, 1).isMyTurn).toBe(true);
    expect(getPlayerView(after, 1).me.incoming).toHaveLength(1);
  });

  it('oyun bitince rakip filosu açılır (oyun sonu ekranı)', () => {
    const s = applyAction(battleState(), { type: 'forfeit', seat: 1, reason: 'resign' });
    expect(getPlayerView(s, 0).opponent.revealedFleet).toEqual(FLEET_A);
    expect(getPlayerView(s, 0).isMyTurn).toBe(false);
  });
});
