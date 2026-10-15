import { allCells, cellIndex, inBounds, sameCoord, shipCells } from './board';
import { isValidFleet } from './placement';
import { DEFAULT_SETTINGS, FLEET, isValidSettings } from './rules';
import { rngStep, toSeed } from './rng';
import type {
  Coord,
  GameAction,
  GameErrorCode,
  GameSettings,
  GameState,
  Placement,
  PlayerView,
  Seat,
  SeatState,
  ShotRecord,
  ShotResult,
} from './types';

export class GameRuleError extends Error {
  readonly code: GameErrorCode;
  constructor(code: GameErrorCode) {
    super(code);
    this.name = 'GameRuleError';
    this.code = code;
  }
}

export type CreateGameOptions = {
  /** Deterministik rastgelelik tohumu (süre dolunca rastgele atış). */
  seed: number | string;
  settings?: Partial<GameSettings>;
  firstSeat?: Seat;
};

const EMPTY_SEAT: SeatState = { playerId: null, ready: false, fleet: null };

export function createGame({ seed, settings, firstSeat = 0 }: CreateGameOptions): GameState {
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  if (!isValidSettings(merged)) throw new GameRuleError('invalid_settings');
  return {
    phase: 'lobby',
    settings: merged,
    seats: [EMPTY_SEAT, EMPTY_SEAT],
    turn: firstSeat,
    turnNumber: 1,
    firstSeat,
    shots: [],
    winner: null,
    finishReason: null,
    rngState: toSeed(seed),
    version: 0,
  };
}

export function otherSeat(seat: Seat): Seat {
  return seat === 0 ? 1 : 0;
}

/**
 * Tek giriş noktası: saf, deterministik. Geçersiz aksiyonda GameRuleError fırlatır,
 * gelen state'e dokunmaz.
 */
export function applyAction(state: GameState, action: GameAction): GameState {
  const next = reduce(state, action);
  return { ...next, version: state.version + 1 };
}

export type ActionResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: GameErrorCode };

/** applyAction'ın fırlatmayan hâli (taşıma katmanı ve UI için). */
export function tryApplyAction(state: GameState, action: GameAction): ActionResult {
  try {
    return { ok: true, state: applyAction(state, action) };
  } catch (e) {
    if (e instanceof GameRuleError) return { ok: false, error: e.code };
    throw e;
  }
}

function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'join': {
      requirePhase(state, 'lobby');
      const seat = requireSeat(action.seat);
      if (state.seats[seat].playerId !== null) throw new GameRuleError('seat_taken');
      return withSeat(state, seat, { ...EMPTY_SEAT, playerId: action.playerId });
    }

    case 'leave': {
      requirePhase(state, 'lobby');
      return withSeat(state, requireSeat(action.seat), EMPTY_SEAT);
    }

    case 'updateSettings': {
      requirePhase(state, 'lobby');
      const settings = { ...state.settings, ...action.settings };
      if (!isValidSettings(settings)) throw new GameRuleError('invalid_settings');
      return { ...state, settings };
    }

    case 'startPlacement': {
      requirePhase(state, 'lobby');
      if (state.seats.some((s) => s.playerId === null)) throw new GameRuleError('seats_not_full');
      return { ...state, phase: 'placement' };
    }

    case 'placeFleet': {
      requirePhase(state, 'placement');
      const seat = requireSeat(action.seat);
      if (state.seats[seat].ready) throw new GameRuleError('already_ready');
      if (!isValidFleet(action.fleet)) throw new GameRuleError('invalid_fleet');
      // Ağdan gelen nesneyi saklamadan önce yalın kopyasını al.
      const fleet = action.fleet.map((p) => ({
        ship: p.ship,
        orientation: p.orientation,
        origin: { row: p.origin.row, col: p.origin.col },
      }));
      const placed = withSeat(state, seat, { ...state.seats[seat], ready: true, fleet });
      if (placed.seats.every((s) => s.ready)) {
        return { ...placed, phase: 'battle', turn: state.firstSeat, turnNumber: 1 };
      }
      return placed;
    }

    case 'unready': {
      requirePhase(state, 'placement');
      const seat = requireSeat(action.seat);
      return withSeat(state, seat, { ...state.seats[seat], ready: false });
    }

    case 'fire': {
      requirePhase(state, 'battle');
      const seat = requireTurn(state, action.seat);
      if (!inBounds(action.at)) throw new GameRuleError('out_of_bounds');
      if (hasFiredAt(state, seat, action.at)) throw new GameRuleError('already_fired');
      return fire(state, seat, { row: action.at.row, col: action.at.col }, false);
    }

    case 'timeout': {
      requirePhase(state, 'battle');
      const seat = requireTurn(state, action.seat);
      if (state.settings.timeoutPolicy === 'skipTurn') return passTurn(state);
      const options = untargetedCells(state, seat);
      const { value, state: rngState } = rngStep(state.rngState);
      const at = options[Math.floor(value * options.length)];
      if (!at) return passTurn(state); // Olamaz: oyun bitmeden boş hücre tükenmez.
      return fire({ ...state, rngState }, seat, at, true);
    }

    case 'forfeit': {
      if (state.phase !== 'placement' && state.phase !== 'battle') {
        throw new GameRuleError('wrong_phase');
      }
      const seat = requireSeat(action.seat);
      return {
        ...state,
        phase: 'finished',
        winner: otherSeat(seat),
        finishReason: action.reason,
      };
    }

    case 'rematch': {
      requirePhase(state, 'finished');
      const firstSeat = otherSeat(state.firstSeat);
      return {
        ...state,
        phase: 'placement',
        seats: [
          { ...EMPTY_SEAT, playerId: state.seats[0].playerId },
          { ...EMPTY_SEAT, playerId: state.seats[1].playerId },
        ],
        firstSeat,
        turn: firstSeat,
        turnNumber: 1,
        shots: [],
        winner: null,
        finishReason: null,
      };
    }
  }
}

function fire(state: GameState, seat: Seat, at: Coord, auto: boolean): GameState {
  const target = state.seats[otherSeat(seat)].fleet ?? [];
  const ship = target.find((p) => shipCells(p).some((c) => sameCoord(c, at)));

  let result: ShotResult = 'miss';
  if (ship) {
    const hitsOnShip = new Set(
      state.shots
        .filter((s) => s.by === seat && s.result !== 'miss')
        .map((s) => cellIndex(s.at))
        .concat(cellIndex(at)),
    );
    result = shipCells(ship).every((c) => hitsOnShip.has(cellIndex(c))) ? 'sunk' : 'hit';
  }

  const record: ShotRecord = {
    by: seat,
    at,
    result,
    turn: state.turnNumber,
    ...(result === 'sunk' && ship ? { sunk: ship } : {}),
    ...(auto ? { auto: true } : {}),
  };
  const shots = [...state.shots, record];
  const fired = { ...state, shots };

  const sunkCount = shots.filter((s) => s.by === seat && s.result === 'sunk').length;
  if (sunkCount === FLEET.length) {
    return { ...fired, phase: 'finished', winner: seat, finishReason: 'allSunk' };
  }
  if (result !== 'miss' && state.settings.extraShotOnHit) return fired;
  return passTurn(fired);
}

function passTurn(state: GameState): GameState {
  return { ...state, turn: otherSeat(state.turn), turnNumber: state.turnNumber + 1 };
}

function hasFiredAt(state: GameState, seat: Seat, at: Coord): boolean {
  return state.shots.some((s) => s.by === seat && sameCoord(s.at, at));
}

/** `seat`'in henüz ateş etmediği rakip hücreleri, sabit sırada. */
export function untargetedCells(state: GameState, seat: Seat): Coord[] {
  const fired = new Set(state.shots.filter((s) => s.by === seat).map((s) => cellIndex(s.at)));
  return allCells().filter((c) => !fired.has(cellIndex(c)));
}

function requirePhase(state: GameState, phase: GameState['phase']): void {
  if (state.phase !== phase) throw new GameRuleError('wrong_phase');
}

function requireSeat(seat: unknown): Seat {
  if (seat !== 0 && seat !== 1) throw new GameRuleError('invalid_seat');
  return seat;
}

function requireTurn(state: GameState, seat: unknown): Seat {
  const s = requireSeat(seat);
  if (state.turn !== s) throw new GameRuleError('not_your_turn');
  return s;
}

function withSeat(state: GameState, seat: Seat, value: SeatState): GameState {
  const seats: [SeatState, SeatState] = [state.seats[0], state.seats[1]];
  seats[seat] = value;
  return { ...state, seats };
}

/**
 * Bir koltuğa gönderilecek görünüm. Rakibin filosu yalnızca batan gemiler kadar,
 * oyun bittiğinde ise tamamen açılır. Çevrimiçi hile önlemenin temeli: sunucu yalnızca bunu yollar.
 */
export function getPlayerView(state: GameState, seat: Seat): PlayerView {
  const opp = otherSeat(seat);
  const mine = state.seats[seat];
  const theirs = state.seats[opp];
  const myShots = state.shots.filter((s) => s.by === seat);
  const theirShots = state.shots.filter((s) => s.by === opp);
  const sunkByMe = myShots.flatMap((s) => (s.sunk ? [s.sunk] : []));
  const sunkByThem = theirShots.flatMap((s) => (s.sunk ? [s.sunk.ship] : []));

  return {
    phase: state.phase,
    settings: state.settings,
    mySeat: seat,
    turn: state.turn,
    isMyTurn: state.phase === 'battle' && state.turn === seat,
    turnNumber: state.turnNumber,
    version: state.version,
    me: {
      playerId: mine.playerId,
      ready: mine.ready,
      fleet: mine.fleet,
      incoming: theirShots,
      sunk: sunkByThem,
    },
    opponent: {
      playerId: theirs.playerId,
      ready: theirs.ready,
      incoming: myShots,
      sunk: sunkByMe,
      revealedFleet: state.phase === 'finished' ? theirs.fleet : null,
    },
    winner: state.winner,
    finishReason: state.finishReason,
  };
}

export type ShotStats = { shots: number; hits: number; accuracy: number };

/** İstatistik kartı: atış, isabet, oran (0–1). */
export function shotStats(shots: readonly ShotRecord[]): ShotStats {
  const hits = shots.filter((s) => s.result !== 'miss').length;
  return { shots: shots.length, hits, accuracy: shots.length === 0 ? 0 : hits / shots.length };
}

/** Henüz batmamış gemilerin listesi (filo kartları için). */
export function afloatShips(fleetSunk: readonly Placement['ship'][]): Placement['ship'][] {
  return FLEET.map((f) => f.ship).filter((s) => !fleetSunk.includes(s));
}
