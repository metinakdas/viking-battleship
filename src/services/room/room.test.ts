import { describe, expect, it } from 'vitest';

import type { Player } from '@/services/auth';
import { MockChatService } from '@/services/chat/MockChatService';
import { FakeClock } from '@/services/transport/fakeClock';

import { MockMatchmakingService } from './MockMatchmakingService';
import { MockRoomService } from './MockRoomService';
import { MatchmakingCancelled, RoomError, type Room } from './types';

const ME: Player = { id: 'me', displayName: 'Ragnar', avatar: 'algiz:red', isGuest: true };
const DELAYS = { join: 3000, ready: 1000, start: 1000 };

function setup() {
  const clock = new FakeClock();
  const chat = new MockChatService(() => clock.now());
  const started: { room: Room; me: Player; opponent: Player }[] = [];
  const rooms = new MockRoomService({
    chat,
    clock,
    delays: DELAYS,
    buildUrl: (c) => `https://amiralbatti.app/room/${c}`,
    startSession: (room, me, opponent) => {
      started.push({ room, me, opponent });
      return `game_${room.code}`;
    },
  });
  return { clock, chat, rooms, started };
}

const errorCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof RoomError ? e.code : 'other';
  }
  return null;
};

describe('MockRoomService: oda kuran sen', () => {
  it('kod + link üretir, kurucu ilk oyuncu', () => {
    const { rooms } = setup();
    const room = rooms.createRoom(ME, { turnSeconds: 45 });
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(room.url).toBe(`https://amiralbatti.app/room/${room.code}`);
    expect(room.hostId).toBe('me');
    expect(room.settings.turnSeconds).toBe(45);
  });

  it('bir kaptan katılır ve hazır olur; iki taraf hazırken kurucu başlatır', () => {
    const { rooms, clock, chat, started } = setup();
    const { code } = rooms.createRoom(ME);
    const updates: Room[] = [];
    rooms.onRoomUpdate(code, (r) => updates.push(r));
    clock.advance(DELAYS.join);
    expect(rooms.getRoom(code)?.players).toHaveLength(2);
    clock.advance(DELAYS.ready);
    expect(rooms.getRoom(code)?.players[1]?.ready).toBe(true);
    expect(errorCode(() => rooms.startGame(code, 'me'))).toBe('not_ready');
    rooms.setReady(code, 'me', true);
    const room = rooms.startGame(code, 'me');
    expect(room).toMatchObject({ status: 'inGame', gameId: `game_${code}` });
    expect(started[0]?.me.id).toBe('me');
    expect(updates.length).toBeGreaterThan(2);
    expect(chat.history(code).map((m) => (m.kind === 'system' ? m.key : 'msg'))).toEqual([
      'joined',
      'joined',
      'gameStarted',
    ]);
  });

  it('yalnızca kurucu ayar değiştirir / atar / başlatır; ayar değişince hazırlar sıfırlanır', () => {
    const { rooms, clock } = setup();
    const { code } = rooms.createRoom(ME);
    clock.advance(DELAYS.join + DELAYS.ready);
    const guestId = rooms.getRoom(code)!.players[1]!.player.id;
    expect(errorCode(() => rooms.updateSettings(code, guestId, { turnSeconds: 15 }))).toBe(
      'not_host',
    );
    expect(errorCode(() => rooms.kickPlayer(code, guestId, 'me'))).toBe('not_host');
    rooms.setReady(code, 'me', true);
    rooms.updateSettings(code, 'me', { extraShotOnHit: true });
    expect(rooms.getRoom(code)?.settings.extraShotOnHit).toBe(true);
    expect(rooms.getRoom(code)?.players[0]?.ready).toBe(false);
    expect(errorCode(() => rooms.updateSettings(code, 'me', { turnSeconds: -1 }))).toBe(
      'invalid_settings',
    );
  });

  it('atılan oyuncu çıkar; yeni bir kaptan gelir', () => {
    const { rooms, clock } = setup();
    const { code } = rooms.createRoom(ME);
    clock.advance(DELAYS.join);
    const guest = rooms.getRoom(code)!.players[1]!.player;
    rooms.kickPlayer(code, 'me', guest.id);
    expect(rooms.getRoom(code)?.players).toHaveLength(1);
    clock.advance(DELAYS.join);
    expect(rooms.getRoom(code)?.players[1]?.player.id).not.toBe(guest.id);
  });

  it('kurucu ayrılınca oda kapanır', () => {
    const { rooms } = setup();
    const { code } = rooms.createRoom(ME);
    rooms.leaveRoom(code, 'me');
    expect(rooms.getRoom(code)?.status).toBe('closed');
    expect(errorCode(() => rooms.setReady(code, 'me', true))).toBe('not_found');
  });
});

describe('MockRoomService: kodla katılan sen', () => {
  it('bilinmeyen kod: bot kurucu; sen hazır olunca o başlatır', () => {
    const { rooms, clock, started } = setup();
    const room = rooms.joinByCode('ABC123', ME);
    expect(room.players.map((p) => p.player.id)).toContain('me');
    expect(room.hostId).not.toBe('me');
    clock.advance(DELAYS.ready);
    rooms.setReady('ABC123', 'me', true);
    clock.advance(DELAYS.start);
    expect(rooms.getRoom('ABC123')?.status).toBe('inGame');
    expect(started[0]?.me.id).toBe('me');
  });

  it('aynı oyuncu iki kez katılırsa çoğalmaz; dolu oda reddedilir', () => {
    const { rooms } = setup();
    rooms.joinByCode('ABC123', ME);
    expect(rooms.joinByCode('ABC123', ME).players).toHaveLength(2);
    const third: Player = { ...ME, id: 'third' };
    expect(errorCode(() => rooms.joinByCode('ABC123', third))).toBe('full');
  });
});

describe('MockMatchmakingService', () => {
  it('bekleme sonrası rakip bulunur', async () => {
    const clock = new FakeClock();
    const mm = new MockMatchmakingService({
      clock,
      waitMs: [1000, 2000],
      random: () => 0,
      startSession: (_me, opp) => `g_${opp.id}`,
    });
    const p = mm.findRandomOpponent(ME);
    clock.advance(1000);
    const found = await p;
    expect(found.gameId).toBe(`g_${found.opponent.id}`);
  });

  it('iptal edilince söz reddedilir', async () => {
    const clock = new FakeClock();
    const mm = new MockMatchmakingService({ clock, startSession: () => 'x' });
    const p = mm.findRandomOpponent(ME);
    mm.cancel();
    await expect(p).rejects.toBeInstanceOf(MatchmakingCancelled);
    expect(clock.pending).toBe(0);
  });
});
