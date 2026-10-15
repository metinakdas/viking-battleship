import type { AiLevel, GameSettings } from '@/game';
import { newId, type Player } from '@/services/auth';
import type { ChatService } from '@/services/chat/types';

import { GameHost } from './GameHost';
import { MockOnlineTransport } from './MockOnlineTransport';
import type { GameTransport } from './types';

export type GameSession =
  | {
      readonly id: string;
      readonly mode: 'ai';
      readonly level: AiLevel;
      readonly transport: GameTransport;
    }
  | {
      readonly id: string;
      readonly mode: 'hotseat';
      /** İki koltuğun görünümleri; devret ekranı hangisinin gösterileceğini seçer. */
      readonly transports: readonly [GameTransport, GameTransport];
    }
  | {
      readonly id: string;
      readonly mode: 'online';
      readonly transport: MockOnlineTransport;
      /** Sohbet kanalı: oda kodu ya da oyun kimliği. */
      readonly channel: string;
      readonly roomCode: string | null;
    };

/**
 * Canlı oyun oturumları. Taşıyıcılar serileştirilemez; bu yüzden Zustand'da değil burada,
 * oyun kimliğiyle tutulur. Sayfa yenilenince kaybolur (oyun ekranı lobiye döner).
 */
const sessions = new Map<string, GameSession>();

export function getSession(id: string): GameSession | null {
  return sessions.get(id) ?? null;
}

export function endSession(id: string): void {
  const s = sessions.get(id);
  if (!s) return;
  if (s.mode === 'hotseat') s.transports[0].dispose();
  else s.transport.dispose();
  sessions.delete(id);
}

export function createAiSession(
  me: Player,
  opponent: Player,
  level: AiLevel,
  settings?: Partial<GameSettings>,
): GameSession {
  const id = newId('local');
  const host = new GameHost({
    seed: id,
    players: [me, opponent],
    controllers: [{ kind: 'human' }, { kind: 'ai', level }],
    settings,
  });
  const session: GameSession = { id, mode: 'ai', level, transport: host.transport(0) };
  sessions.set(id, session);
  return session;
}

export function createHotseatSession(first: Player, second: Player): GameSession {
  const id = newId('local');
  const host = new GameHost({
    seed: id,
    players: [first, second],
    controllers: [{ kind: 'human' }, { kind: 'human' }],
    // Aynı cihazda devret ekranı var; tur saati baskı kurmasın.
    settings: { turnSeconds: 0 },
  });
  const session: GameSession = {
    id,
    mode: 'hotseat',
    transports: [host.transport(0), host.transport(1)],
  };
  sessions.set(id, session);
  return session;
}

export function createOnlineSession(options: {
  me: Player;
  opponent: Player;
  chat: ChatService;
  channel?: string;
  roomCode?: string | null;
  settings?: Partial<GameSettings>;
}): GameSession {
  const id = newId('online');
  const channel = options.channel ?? id;
  const transport = new MockOnlineTransport({
    seed: id,
    me: options.me,
    opponent: options.opponent,
    settings: options.settings,
    chat: options.chat,
    channel,
  });
  const session: GameSession = {
    id,
    mode: 'online',
    transport,
    channel,
    roomCode: options.roomCode ?? null,
  };
  sessions.set(id, session);
  return session;
}
