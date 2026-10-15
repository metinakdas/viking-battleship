import type { Coord, Fleet, PlayerView, Seat } from '@/game';
import type { Player } from '@/services/auth';

/** Bir oyuncunun gönderebileceği hamleler. Koltuk taşıyıcı tarafından eklenir (istemci seçemez). */
export type ClientAction =
  | { readonly type: 'placeFleet'; readonly fleet: Fleet }
  | { readonly type: 'unready' }
  | { readonly type: 'fire'; readonly at: Coord }
  | { readonly type: 'forfeit'; readonly reason: 'resign' }
  | { readonly type: 'rematch' };

export type ConnectionState = 'connected' | 'disconnected';

/** Bir koltuğun gördüğü her şey: motor görünümü + oyuncular + saatler. */
export type GameSnapshot = {
  readonly view: PlayerView;
  readonly me: Player;
  readonly opponent: Player;
  /** Sıradaki oyuncunun süresinin bittiği an (epoch ms); süresizse null. */
  readonly turnEndsAt: number | null;
  readonly opponentConnection: ConnectionState;
  /** Rakip koptuysa: dönmezse hükmen galibiyetin ilan edileceği an. */
  readonly reconnectEndsAt: number | null;
};

export type SnapshotListener = (snapshot: GameSnapshot) => void;

/**
 * Arayüzün konuştuğu tek şey. Yerel (bilgisayar/aynı cihaz), sahte çevrimiçi ve ileride
 * WebSocket/Colyseus aynı arayüzü uygular; UI hangisi olduğunu bilmez.
 */
export interface GameTransport {
  readonly seat: Seat;
  getSnapshot(): GameSnapshot;
  subscribe(listener: SnapshotListener): () => void;
  /** Geçersiz hamlede hata kodu döner (ör. 'not_your_turn'); başarılıysa null. */
  send(action: ClientAction): string | null;
  dispose(): void;
}
