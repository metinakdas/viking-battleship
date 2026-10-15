import type { GameSettings } from '@/game';
import type { Player } from '@/services/auth';

export type RoomPlayer = {
  readonly player: Player;
  readonly ready: boolean;
};

export type RoomStatus = 'waiting' | 'inGame' | 'closed';

export type Room = {
  readonly code: string;
  /** Paylaşılan link: web'de https://.../room/CODE, uygulamada amiralbatti://room/CODE. */
  readonly url: string;
  readonly hostId: string;
  /** En fazla 2; ilk sıradaki kurucu. */
  readonly players: readonly RoomPlayer[];
  readonly settings: GameSettings;
  readonly status: RoomStatus;
  /** Oyun başladıysa oyun kimliği (/game/[id]). */
  readonly gameId: string | null;
};

export type RoomErrorCode =
  'not_found' | 'full' | 'not_host' | 'not_in_room' | 'not_ready' | 'invalid_settings';

export class RoomError extends Error {
  readonly code: RoomErrorCode;
  constructor(code: RoomErrorCode) {
    super(code);
    this.name = 'RoomError';
    this.code = code;
  }
}

export interface RoomService {
  createRoom(host: Player, settings?: Partial<GameSettings>): Room;
  joinByCode(code: string, player: Player): Room;
  getRoom(code: string): Room | null;
  leaveRoom(code: string, playerId: string): void;
  setReady(code: string, playerId: string, ready: boolean): void;
  /** Yalnızca kurucu. */
  updateSettings(code: string, byId: string, patch: Partial<GameSettings>): void;
  /** Yalnızca kurucu. */
  kickPlayer(code: string, byId: string, targetId: string): void;
  /** Yalnızca kurucu; iki taraf da hazır olmalı. */
  startGame(code: string, byId: string): Room;
  onRoomUpdate(code: string, listener: (room: Room) => void): () => void;
}

export type MatchFound = { readonly gameId: string; readonly opponent: Player };

export class MatchmakingCancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'MatchmakingCancelled';
  }
}

export interface MatchmakingService {
  findRandomOpponent(me: Player): Promise<MatchFound>;
  cancel(): void;
}
