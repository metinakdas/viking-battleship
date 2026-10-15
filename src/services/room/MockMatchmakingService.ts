import type { Player } from '@/services/auth';
import { createBotPlayer } from '@/services/bots';
import { realClock, type Clock } from '@/services/transport/GameHost';

import { MatchmakingCancelled, type MatchFound, type MatchmakingService } from './types';

export type MockMatchmakingOptions = {
  /** Eşleşince çevrimiçi oturumu kurar, oyun kimliğini döner. */
  startSession: (me: Player, opponent: Player) => string;
  clock?: Clock;
  random?: () => number;
  /** Bekleme aralığı (ms). */
  waitMs?: readonly [number, number];
};

/** Sahte eşleşme: 2–5 sn içinde rastgele bir kaptan "bulunur". */
export class MockMatchmakingService implements MatchmakingService {
  private pending: { handle: unknown; reject: (e: Error) => void } | null = null;
  private readonly clock: Clock;
  private readonly random: () => number;

  constructor(private readonly options: MockMatchmakingOptions) {
    this.clock = options.clock ?? realClock;
    this.random = options.random ?? Math.random;
  }

  findRandomOpponent(me: Player): Promise<MatchFound> {
    this.cancel();
    const [min, max] = this.options.waitMs ?? [2000, 5000];
    const wait = min + Math.floor(this.random() * (max - min));
    return new Promise((resolve, reject) => {
      const handle = this.clock.setTimeout(() => {
        this.pending = null;
        const opponent = createBotPlayer(this.random);
        resolve({ gameId: this.options.startSession(me, opponent), opponent });
      }, wait);
      this.pending = { handle, reject };
    });
  }

  cancel(): void {
    if (!this.pending) return;
    this.clock.clearTimeout(this.pending.handle);
    this.pending.reject(new MatchmakingCancelled());
    this.pending = null;
  }
}
