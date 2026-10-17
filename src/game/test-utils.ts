/** Testler için yardımcılar. Uygulama kodu import etmez. */
import { shipCells } from './board';
import { applyAction, createGame, type CreateGameOptions } from './engine';
import type { Coord, Fleet, GameState, Seat } from './types';

/**
 * Elle kurulan, kurallara uygun sabit filo:
 *   galleon  A1–E1 (yatay)     frigate  A3–A6 (dikey)
 *   corvette C3–E3 (yatay)     brig     G1–G3 (dikey)    sloop  I9–J9 (yatay)
 */
export const FLEET_A: Fleet = [
  { ship: 'galleon', origin: { row: 0, col: 0 }, orientation: 'horizontal' },
  { ship: 'frigate', origin: { row: 2, col: 0 }, orientation: 'vertical' },
  { ship: 'corvette', origin: { row: 2, col: 2 }, orientation: 'horizontal' },
  { ship: 'brig', origin: { row: 0, col: 6 }, orientation: 'vertical' },
  { ship: 'sloop', origin: { row: 8, col: 8 }, orientation: 'horizontal' },
];

/** FLEET_A'nın tüm gemi hücreleri. */
export const FLEET_A_CELLS: Coord[] = FLEET_A.flatMap(shipCells);

export function lobbyWithPlayers(opts: Partial<CreateGameOptions> = {}): GameState {
  let s = createGame({ seed: 42, ...opts });
  s = applyAction(s, { type: 'join', seat: 0, playerId: 'alice' });
  s = applyAction(s, { type: 'join', seat: 1, playerId: 'bob' });
  return s;
}

export function battleState(opts: Partial<CreateGameOptions> = {}): GameState {
  let s = applyAction(lobbyWithPlayers(opts), { type: 'startPlacement' });
  s = applyAction(s, { type: 'placeFleet', seat: 0, fleet: FLEET_A });
  s = applyAction(s, { type: 'placeFleet', seat: 1, fleet: FLEET_A });
  return s;
}

/** Iska garantili hücre (FLEET_A'da gemi yok). */
export const SAFE_MISSES: Coord[] = [
  { row: 9, col: 0 },
  { row: 9, col: 1 },
  { row: 9, col: 2 },
  { row: 9, col: 3 },
  { row: 9, col: 4 },
  { row: 9, col: 5 },
];

export function fire(s: GameState, seat: Seat, at: Coord): GameState {
  return applyAction(s, { type: 'fire', seat, at });
}
