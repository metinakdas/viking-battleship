import { DEFAULT_SETTINGS, isValidSettings, type GameSettings } from '@/game';
import type { Player } from '@/services/auth';
import { createBotPlayer } from '@/services/bots';
import type { ChatService } from '@/services/chat/types';
import { realClock, type Clock } from '@/services/transport/GameHost';

import { generateRoomCode } from './code';
import { RoomError, type Room, type RoomService } from './types';

export type MockRoomOptions = {
  chat: ChatService;
  /** Oda kodu → paylaşılacak link. */
  buildUrl: (code: string) => string;
  /** Oyun başlayınca çevrimiçi oturumu kurar, oyun kimliğini döner. */
  startSession: (room: Room, me: Player, opponent: Player) => string;
  clock?: Clock;
  random?: () => number;
  /** Bir bot odaya girince (mock sohbet otomatik cevabı için). */
  onBotJoined?: (code: string, bot: Player) => void;
  /** Bot davranış gecikmeleri (ms). */
  delays?: { join: number; ready: number; start: number };
};

const DEFAULT_DELAYS = { join: 3500, ready: 1500, start: 1200 };

/**
 * Bellekte oda servisi. Sunucu olmadığı için karşı tarafı bir bot oynar:
 * - Oda kurarsan: birkaç saniye sonra bir kaptan katılır ve hazır olur.
 * - Bilinmeyen bir kodla katılırsan: odayı bir bot kurmuş sayılır; sen hazır olunca başlatır.
 */
export class MockRoomService implements RoomService {
  private readonly rooms = new Map<string, Room>();
  private readonly listeners = new Map<string, Set<(room: Room) => void>>();
  private readonly bots = new Set<string>();
  private readonly timers = new Map<string, unknown[]>();
  private readonly clock: Clock;
  private readonly random: () => number;
  private readonly delays: { join: number; ready: number; start: number };

  constructor(private readonly options: MockRoomOptions) {
    this.clock = options.clock ?? realClock;
    this.random = options.random ?? Math.random;
    this.delays = options.delays ?? DEFAULT_DELAYS;
  }

  createRoom(host: Player, settings?: Partial<GameSettings>): Room {
    const merged = { ...DEFAULT_SETTINGS, ...settings };
    if (!isValidSettings(merged)) throw new RoomError('invalid_settings');
    let code = generateRoomCode(this.random);
    while (this.rooms.has(code)) code = generateRoomCode(this.random);
    const room: Room = {
      code,
      url: this.options.buildUrl(code),
      hostId: host.id,
      players: [{ player: host, ready: false }],
      settings: merged,
      status: 'waiting',
      gameId: null,
    };
    this.save(room);
    this.options.chat.postSystem(code, 'joined', { name: host.displayName });
    this.scheduleBotJoin(code);
    return room;
  }

  joinByCode(code: string, player: Player): Room {
    let room = this.rooms.get(code);
    if (!room) {
      // Sunucusuz: kodu bilinmeyen oda, bir botun kurduğu oda gibi davranır.
      const bot = this.newBot();
      room = {
        code,
        url: this.options.buildUrl(code),
        hostId: bot.id,
        players: [{ player: bot, ready: false }],
        settings: DEFAULT_SETTINGS,
        status: 'waiting',
        gameId: null,
      };
      this.save(room);
      this.options.chat.postSystem(code, 'joined', { name: bot.displayName });
      this.options.onBotJoined?.(code, bot);
      this.later(code, this.delays.ready, () => this.setReady(code, bot.id, true));
    }
    if (room.players.some((p) => p.player.id === player.id)) return room;
    if (room.status !== 'waiting') throw new RoomError('not_found');
    if (room.players.length >= 2) throw new RoomError('full');
    const joined = { ...room, players: [...room.players, { player, ready: false }] };
    this.save(joined);
    this.options.chat.postSystem(code, 'joined', { name: player.displayName });
    return joined;
  }

  getRoom(code: string): Room | null {
    return this.rooms.get(code) ?? null;
  }

  leaveRoom(code: string, playerId: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    const leaving = room.players.find((p) => p.player.id === playerId);
    if (!leaving) return;
    if (playerId === room.hostId) {
      // Kurucu ayrılınca oda kapanır.
      this.clearTimers(code);
      this.save({ ...room, status: 'closed', players: [] });
      return;
    }
    this.save({ ...room, players: room.players.filter((p) => p.player.id !== playerId) });
    this.options.chat.postSystem(code, 'left', { name: leaving.player.displayName });
  }

  setReady(code: string, playerId: string, ready: boolean): void {
    const room = this.require(code);
    if (!room.players.some((p) => p.player.id === playerId)) throw new RoomError('not_in_room');
    const next = {
      ...room,
      players: room.players.map((p) => (p.player.id === playerId ? { ...p, ready } : p)),
    };
    this.save(next);
    // Bot kurucuysa: herkes hazır olunca oyunu o başlatır.
    if (this.bots.has(next.hostId) && this.allReady(next)) {
      this.later(code, this.delays.start, () => {
        const r = this.rooms.get(code);
        if (r && r.status === 'waiting' && this.allReady(r)) this.startGame(code, r.hostId);
      });
    }
  }

  updateSettings(code: string, byId: string, patch: Partial<GameSettings>): void {
    const room = this.require(code);
    if (room.hostId !== byId) throw new RoomError('not_host');
    const settings = { ...room.settings, ...patch };
    if (!isValidSettings(settings)) throw new RoomError('invalid_settings');
    // Ayar değişince hazır durumları sıfırlanır: herkes yeni ayarı görüp onaylasın.
    this.save({
      ...room,
      settings,
      players: room.players.map((p) => ({ ...p, ready: this.bots.has(p.player.id) && p.ready })),
    });
  }

  kickPlayer(code: string, byId: string, targetId: string): void {
    const room = this.require(code);
    if (room.hostId !== byId) throw new RoomError('not_host');
    const target = room.players.find((p) => p.player.id === targetId);
    if (!target || targetId === byId) throw new RoomError('not_in_room');
    this.save({ ...room, players: room.players.filter((p) => p.player.id !== targetId) });
    this.options.chat.postSystem(code, 'kicked', { name: target.player.displayName });
    this.scheduleBotJoin(code);
  }

  startGame(code: string, byId: string): Room {
    const room = this.require(code);
    if (room.hostId !== byId) throw new RoomError('not_host');
    if (room.players.length < 2 || !this.allReady(room)) throw new RoomError('not_ready');
    const human = room.players.find((p) => !this.bots.has(p.player.id));
    const bot = room.players.find((p) => this.bots.has(p.player.id));
    if (!human || !bot) throw new RoomError('not_ready');
    const gameId = this.options.startSession(room, human.player, bot.player);
    const started: Room = { ...room, status: 'inGame', gameId };
    this.save(started);
    this.options.chat.postSystem(code, 'gameStarted');
    return started;
  }

  onRoomUpdate(code: string, listener: (room: Room) => void): () => void {
    const set = this.listeners.get(code) ?? new Set();
    set.add(listener);
    this.listeners.set(code, set);
    return () => set.delete(listener);
  }

  private allReady(room: Room): boolean {
    return room.players.length === 2 && room.players.every((p) => p.ready);
  }

  private scheduleBotJoin(code: string): void {
    this.later(code, this.delays.join, () => {
      const room = this.rooms.get(code);
      if (!room || room.status !== 'waiting' || room.players.length >= 2) return;
      const bot = this.newBot();
      this.save({ ...room, players: [...room.players, { player: bot, ready: false }] });
      this.options.chat.postSystem(code, 'joined', { name: bot.displayName });
      this.options.onBotJoined?.(code, bot);
      this.later(code, this.delays.ready, () => {
        const r = this.rooms.get(code);
        if (r?.players.some((p) => p.player.id === bot.id)) this.setReady(code, bot.id, true);
      });
    });
  }

  private newBot(): Player {
    const bot = createBotPlayer(this.random);
    this.bots.add(bot.id);
    return bot;
  }

  private require(code: string): Room {
    const room = this.rooms.get(code);
    if (!room || room.status === 'closed') throw new RoomError('not_found');
    return room;
  }

  private save(room: Room): void {
    this.rooms.set(room.code, room);
    this.listeners.get(room.code)?.forEach((l) => l(room));
  }

  private later(code: string, ms: number, fn: () => void): void {
    const handle = this.clock.setTimeout(fn, ms);
    this.timers.set(code, [...(this.timers.get(code) ?? []), handle]);
  }

  private clearTimers(code: string): void {
    this.timers.get(code)?.forEach((h) => this.clock.clearTimeout(h));
    this.timers.delete(code);
  }
}
