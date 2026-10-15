import type { AiLevel, GameSettings } from '@/game';
import type { Player } from '@/services/auth';
import type { ChatService } from '@/services/chat/types';

import { GameHost, realClock, type Clock } from './GameHost';
import type { ClientAction, GameSnapshot, GameTransport, SnapshotListener } from './types';

export type MockOnlineOptions = {
  seed: number | string;
  me: Player;
  /** Sahte rakip: bilgisayar oyuncusu, ağ gecikmesiyle. */
  opponent: Player;
  opponentLevel?: AiLevel;
  settings?: Partial<GameSettings>;
  chat: ChatService;
  /** Sohbet kanalı (oda kodu ya da oyun kimliği). */
  channel: string;
  latencyMs?: number;
  clock?: Clock;
};

/**
 * Çevrimiçi akışı taklit eder: hamleler gecikmeyle "sunucuya" gider, rakip uzaktaymış gibi
 * oynar, batan gemiler sohbete sistem mesajı düşer. Arayüz GameTransport'tan başkasını görmez;
 * gerçek WebSocket/Colyseus taşıyıcısı aynı arayüzle yerine geçecek.
 */
export class MockOnlineTransport implements GameTransport {
  readonly seat = 0 as const;
  private readonly host: GameHost;
  private readonly clock: Clock;
  private readonly latencyMs: number;
  private lastSunkCount = 0;
  private readonly unsubscribeHost: () => void;

  constructor(private readonly options: MockOnlineOptions) {
    this.clock = options.clock ?? realClock;
    this.latencyMs = options.latencyMs ?? 120;
    this.host = new GameHost({
      seed: options.seed,
      players: [options.me, options.opponent],
      controllers: [{ kind: 'human' }, { kind: 'ai', level: options.opponentLevel ?? 'normal' }],
      settings: options.settings,
      clock: this.clock,
    });
    this.unsubscribeHost = this.host.subscribe(() => this.announceSunk());
  }

  getSnapshot(): GameSnapshot {
    return this.host.snapshot(this.seat);
  }

  subscribe(listener: SnapshotListener): () => void {
    return this.host.subscribe(() => listener(this.getSnapshot()));
  }

  /** Ağ gecikmesi: hamle sonra uygulanır. İstemci tarafı ön doğrulama UI'da (pasif tahta). */
  send(action: ClientAction): string | null {
    this.clock.setTimeout(() => this.host.dispatch(this.seat, action), this.latencyMs);
    return null;
  }

  /** Geliştirici/test: rakibin bağlantısı kopar; 60 sn içinde dönmezse hükmen galibiyet. */
  simulateOpponentDisconnect(): void {
    this.host.setConnection(1, 'disconnected');
  }

  simulateOpponentReconnect(): void {
    this.host.setConnection(1, 'connected');
  }

  dispose(): void {
    this.unsubscribeHost();
    this.host.dispose();
  }

  private announceSunk(): void {
    const shots = this.host.getState().shots;
    const sunk = shots.filter((s) => s.result === 'sunk');
    if (sunk.length < this.lastSunkCount) this.lastSunkCount = 0; // rövanş
    for (const s of sunk.slice(this.lastSunkCount)) {
      if (!s.sunk) continue;
      const owner = this.options[s.by === 0 ? 'opponent' : 'me'];
      this.options.chat.postSystem(this.options.channel, 'shipSunk', {
        ship: s.sunk.ship,
        name: owner.displayName,
      });
    }
    this.lastSunkCount = sunk.length;
  }
}
