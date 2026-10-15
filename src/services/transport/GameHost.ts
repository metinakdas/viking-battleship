import {
  aiFleet,
  aiThinkDelayMs,
  applyAction,
  chooseShot,
  createGame,
  createRng,
  getPlayerView,
  otherSeat,
  tryApplyAction,
  type AiLevel,
  type GameAction,
  type GameSettings,
  type GameState,
  type Rng,
  type Seat,
} from '@/game';
import type { Player } from '@/services/auth';

import type { ClientAction, ConnectionState, GameSnapshot, GameTransport } from './types';

/** Zamanlayıcı soyutlaması: testlerde sahte saatle sürülür. */
export type Clock = {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export type SeatController = { kind: 'human' } | { kind: 'ai'; level: AiLevel };

export type GameHostOptions = {
  seed: number | string;
  players: readonly [Player, Player];
  controllers: readonly [SeatController, SeatController];
  settings?: Partial<GameSettings>;
  firstSeat?: Seat;
  clock?: Clock;
  /** Rakip kopunca hükmen galibiyete kadar beklenen süre (ms). */
  reconnectGraceMs?: number;
};

export const RECONNECT_GRACE_MS = 60_000;

/**
 * Motoru çalıştıran sunucu benzeri ev sahibi. Yerel modlarda istemcide, ileride sunucuda
 * aynı rolü görür: hamleleri doğrular, tur saatini tutar, yapay zekâ koltuklarını oynatır,
 * her koltuğa yalnızca kendi görünümünü yayınlar.
 */
export class GameHost {
  private state: GameState;
  private readonly listeners = new Set<() => void>();
  private readonly clock: Clock;
  private readonly rng: Rng;
  private readonly connection: [ConnectionState, ConnectionState] = ['connected', 'connected'];
  private readonly reconnectEndsAt: [number | null, number | null] = [null, null];
  private readonly reconnectTimers: [unknown, unknown] = [null, null];
  private turnTimer: unknown = null;
  private turnKey = '';
  private turnEndsAt: number | null = null;
  private aiTimer: unknown = null;
  private disposed = false;

  constructor(private readonly options: GameHostOptions) {
    this.clock = options.clock ?? realClock;
    this.rng = createRng(`${options.seed}:ai`);
    let s = createGame({
      seed: options.seed,
      settings: options.settings,
      firstSeat: options.firstSeat,
    });
    s = applyAction(s, { type: 'join', seat: 0, playerId: options.players[0].id });
    s = applyAction(s, { type: 'join', seat: 1, playerId: options.players[1].id });
    s = applyAction(s, { type: 'startPlacement' });
    this.state = s;
    this.afterChange();
  }

  get players(): readonly [Player, Player] {
    return this.options.players;
  }

  getState(): GameState {
    return this.state;
  }

  snapshot(seat: Seat): GameSnapshot {
    const opp = otherSeat(seat);
    return {
      view: getPlayerView(this.state, seat),
      me: this.options.players[seat],
      opponent: this.options.players[opp],
      turnEndsAt: this.turnEndsAt,
      opponentConnection: this.connection[opp],
      reconnectEndsAt: this.reconnectEndsAt[opp],
    };
  }

  /** Bir koltuk adına hamle. Hata kodu ya da null. */
  dispatch(seat: Seat, action: ClientAction): string | null {
    if (this.disposed) return 'disposed';
    const full: GameAction =
      action.type === 'rematch' ? { type: 'rematch' } : ({ ...action, seat } as GameAction);
    return this.apply(full);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Bağlantı durumu (sahte çevrimiçi / gerçek sunucu). Kopan koltuk süresinde dönmezse kaybeder. */
  setConnection(seat: Seat, state: ConnectionState): void {
    if (this.connection[seat] === state) return;
    this.connection[seat] = state;
    this.clock.clearTimeout(this.reconnectTimers[seat]);
    this.reconnectTimers[seat] = null;
    this.reconnectEndsAt[seat] = null;
    const playing = this.state.phase === 'placement' || this.state.phase === 'battle';
    if (state === 'disconnected' && playing) {
      const grace = this.options.reconnectGraceMs ?? RECONNECT_GRACE_MS;
      this.reconnectEndsAt[seat] = this.clock.now() + grace;
      this.reconnectTimers[seat] = this.clock.setTimeout(() => {
        this.reconnectEndsAt[seat] = null;
        this.apply({ type: 'forfeit', seat, reason: 'disconnect' });
      }, grace);
    }
    this.emit();
  }

  /** Bir koltuk için GameTransport görünümü. */
  transport(seat: Seat): GameTransport {
    return {
      seat,
      getSnapshot: () => this.snapshot(seat),
      subscribe: (listener) => this.subscribe(() => listener(this.snapshot(seat))),
      send: (action) => this.dispatch(seat, action),
      dispose: () => this.dispose(),
    };
  }

  dispose(): void {
    this.disposed = true;
    this.clock.clearTimeout(this.turnTimer);
    this.clock.clearTimeout(this.aiTimer);
    this.reconnectTimers.forEach((t) => this.clock.clearTimeout(t));
    this.listeners.clear();
  }

  private apply(action: GameAction): string | null {
    const r = tryApplyAction(this.state, action);
    if (!r.ok) return r.error;
    this.state = r.state;
    this.afterChange();
    return null;
  }

  private afterChange(): void {
    this.updateTurnClock();
    this.driveAi();
    this.emit();
  }

  private emit(): void {
    // Snapshot üretimi önbelleklenmez; dinleyiciler useSyncExternalStore ile sürüm üzerinden karşılaştırır.
    for (const l of [...this.listeners]) l();
  }

  private updateTurnClock(): void {
    const s = this.state;
    const seconds = s.settings.turnSeconds;
    if (s.phase !== 'battle' || seconds <= 0) {
      this.clock.clearTimeout(this.turnTimer);
      this.turnTimer = null;
      this.turnEndsAt = null;
      this.turnKey = '';
      return;
    }
    // Aynı tur devam ediyorsa (isabette tekrar ateş) saat sıfırlanmaz.
    const key = `${s.turnNumber}:${s.turn}`;
    if (key === this.turnKey) return;
    this.turnKey = key;
    this.clock.clearTimeout(this.turnTimer);
    this.turnEndsAt = this.clock.now() + seconds * 1000;
    const seat = s.turn;
    this.turnTimer = this.clock.setTimeout(() => {
      this.turnTimer = null;
      this.apply({ type: 'timeout', seat });
    }, seconds * 1000);
  }

  private driveAi(): void {
    const s = this.state;
    this.options.controllers.forEach((c, i) => {
      const seat = i as Seat;
      if (c.kind !== 'ai') return;
      if (s.phase === 'placement' && !s.seats[seat].ready) {
        // Rövanşta da otomatik dizer.
        this.apply({ type: 'placeFleet', seat, fleet: aiFleet(this.rng) });
      }
    });
    const turn = this.state.turn;
    const controller = this.options.controllers[turn];
    if (this.state.phase !== 'battle' || controller.kind !== 'ai' || this.aiTimer) return;
    this.aiTimer = this.clock.setTimeout(() => {
      this.aiTimer = null;
      const now = this.state;
      if (now.phase !== 'battle' || now.turn !== turn) return;
      const at = chooseShot(controller.level, getPlayerView(now, turn), this.rng);
      this.apply({ type: 'fire', seat: turn, at });
    }, aiThinkDelayMs(this.rng));
  }
}
