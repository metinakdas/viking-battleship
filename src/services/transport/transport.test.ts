import { describe, expect, it } from 'vitest';

import { FLEET, randomFleet, shipCells, type Seat } from '@/game';
import type { Player } from '@/services/auth';
import { MockChatService } from '@/services/chat/MockChatService';

import { FakeClock } from './fakeClock';
import { GameHost, RECONNECT_GRACE_MS } from './GameHost';
import { MockOnlineTransport } from './MockOnlineTransport';

const ALICE: Player = { id: 'p_alice', displayName: 'Astrid', avatar: 'algiz:red', isGuest: true };
const BOB: Player = { id: 'p_bob', displayName: 'Björn', avatar: 'tiwaz:blue', isGuest: false };

function aiHost(clock = new FakeClock(), settings = {}) {
  const host = new GameHost({
    seed: 'test',
    players: [ALICE, BOB],
    controllers: [{ kind: 'human' }, { kind: 'ai', level: 'hard' }],
    settings,
    clock,
  });
  return { host, clock, me: host.transport(0) };
}

describe('GameHost: bilgisayara karşı', () => {
  it('yapay zekâ filosunu kendiliğinden dizer; görünüm rakip filosunu içermez', () => {
    const { me } = aiHost();
    const snap = me.getSnapshot();
    expect(snap.view.phase).toBe('placement');
    expect(snap.view.opponent.ready).toBe(true);
    expect(JSON.stringify(snap.view.opponent)).not.toContain('origin');
    expect(snap.me.displayName).toBe('Astrid');
    expect(snap.opponent.displayName).toBe('Björn');
  });

  it('istemci koltuk seçemez: her hamle taşıyıcının koltuğuna gider', () => {
    const { me } = aiHost();
    expect(me.send({ type: 'placeFleet', fleet: randomFleet(1) })).toBeNull();
    expect(me.getSnapshot().view.me.ready).toBe(true);
    expect(me.getSnapshot().view.phase).toBe('battle');
  });

  it('yapay zekâ "nişan alıyor" gecikmesiyle (0.6–1.2 sn) ateş eder', () => {
    const { me, clock } = aiHost(new FakeClock(), { extraShotOnHit: false });
    me.send({ type: 'placeFleet', fleet: randomFleet(1) });
    me.send({ type: 'fire', at: { row: 0, col: 0 } });
    expect(me.getSnapshot().view.turn).toBe(1);
    clock.advance(599);
    expect(me.getSnapshot().view.me.incoming).toHaveLength(0);
    clock.advance(601);
    expect(me.getSnapshot().view.me.incoming).toHaveLength(1);
    expect(me.getSnapshot().view.turn).toBe(0);
  });

  it('geçersiz hamle hata kodu döner', () => {
    const { me } = aiHost();
    expect(me.send({ type: 'fire', at: { row: 0, col: 0 } })).toBe('wrong_phase');
  });

  it('tam oyun: insan her hücreyi sırayla tarar, oyun biter', () => {
    const { me, clock } = aiHost(new FakeClock(), { turnSeconds: 0 });
    me.send({ type: 'placeFleet', fleet: randomFleet(2) });
    for (let i = 0; i < 100 && me.getSnapshot().view.phase === 'battle'; i++) {
      if (me.getSnapshot().view.isMyTurn) {
        me.send({ type: 'fire', at: { row: Math.floor(i / 10), col: i % 10 } });
      } else {
        i--;
      }
      clock.advance(1300);
    }
    const snap = me.getSnapshot();
    expect(snap.view.phase).toBe('finished');
    expect(snap.view.opponent.revealedFleet).toHaveLength(FLEET.length);
  });

  it('rövanş: yapay zekâ yeniden dizer, oyun yeniden başlar', () => {
    const { me } = aiHost();
    me.send({ type: 'placeFleet', fleet: randomFleet(1) });
    me.send({ type: 'forfeit', reason: 'resign' });
    expect(me.getSnapshot().view).toMatchObject({ phase: 'finished', winner: 1 });
    me.send({ type: 'rematch' });
    const v = me.getSnapshot().view;
    expect(v.phase).toBe('placement');
    expect(v.opponent.ready).toBe(true);
    expect(v.me.ready).toBe(false);
  });
});

describe('GameHost: tur saati', () => {
  it('süre dolunca rastgele atış yapılır ve sıra geçer', () => {
    const { me, clock } = aiHost(new FakeClock(), { turnSeconds: 30 });
    me.send({ type: 'placeFleet', fleet: randomFleet(1) });
    const endsAt = me.getSnapshot().turnEndsAt;
    expect(endsAt).toBe(clock.now() + 30_000);
    clock.advance(30_000);
    const mine = me.getSnapshot().view.opponent.incoming;
    expect(mine).toHaveLength(1);
    expect(mine[0]?.auto).toBe(true);
  });

  it('süresiz ayarda saat yok', () => {
    const { me } = aiHost(new FakeClock(), { turnSeconds: 0 });
    me.send({ type: 'placeFleet', fleet: randomFleet(1) });
    expect(me.getSnapshot().turnEndsAt).toBeNull();
  });
});

describe('GameHost: aynı cihaz (iki insan)', () => {
  it('iki koltuk ayrı görünüm alır; sırası olmayan ateş edemez', () => {
    const host = new GameHost({
      seed: 'hs',
      players: [ALICE, BOB],
      controllers: [{ kind: 'human' }, { kind: 'human' }],
      settings: { turnSeconds: 0 },
      clock: new FakeClock(),
    });
    const [a, b] = [host.transport(0), host.transport(1)];
    a.send({ type: 'placeFleet', fleet: randomFleet(1) });
    expect(b.getSnapshot().view.opponent.ready).toBe(true);
    b.send({ type: 'placeFleet', fleet: randomFleet(2) });
    expect(b.send({ type: 'fire', at: { row: 0, col: 0 } })).toBe('not_your_turn');
    expect(a.send({ type: 'fire', at: { row: 0, col: 0 } })).toBeNull();
    expect(b.getSnapshot().view.isMyTurn).toBe(true);
  });
});

describe('GameHost: bağlantı kopması', () => {
  it('rakip 60 sn içinde dönmezse hükmen galibiyet', () => {
    const { host, me, clock } = aiHost();
    me.send({ type: 'placeFleet', fleet: randomFleet(1) });
    host.setConnection(1, 'disconnected');
    expect(me.getSnapshot().opponentConnection).toBe('disconnected');
    expect(me.getSnapshot().reconnectEndsAt).toBe(clock.now() + RECONNECT_GRACE_MS);
    clock.advance(RECONNECT_GRACE_MS);
    expect(me.getSnapshot().view).toMatchObject({
      phase: 'finished',
      winner: 0,
      finishReason: 'disconnect',
    });
  });

  it('süresinde dönen rakip oyuna devam eder', () => {
    const { host, me, clock } = aiHost();
    me.send({ type: 'placeFleet', fleet: randomFleet(1) });
    host.setConnection(1, 'disconnected');
    clock.advance(30_000);
    host.setConnection(1, 'connected');
    clock.advance(60_000);
    expect(me.getSnapshot().view.finishReason).not.toBe('disconnect');
    expect(me.getSnapshot().reconnectEndsAt).toBeNull();
  });
});

describe('MockOnlineTransport', () => {
  it('hamleler ağ gecikmesiyle uygulanır; batan gemi sohbete sistem mesajı düşer', () => {
    const clock = new FakeClock();
    const chat = new MockChatService(() => clock.now());
    const t = new MockOnlineTransport({
      seed: 'net',
      me: ALICE,
      opponent: BOB,
      chat,
      channel: 'ROOM42',
      latencyMs: 100,
      clock,
      settings: { extraShotOnHit: true, turnSeconds: 0 },
    });
    t.send({ type: 'placeFleet', fleet: randomFleet(1) });
    expect(t.getSnapshot().view.me.ready).toBe(false);
    clock.advance(100);
    expect(t.getSnapshot().view.phase).toBe('battle');

    // Rakip filosu görünümde yok; hile yapmadan bulmak için tüm hücreleri sırayla tara.
    const seen: Seat[] = [];
    for (let i = 0; i < 100 && t.getSnapshot().view.phase === 'battle'; i++) {
      const snap = t.getSnapshot();
      if (!snap.view.isMyTurn) {
        clock.advance(1300);
        i--;
        continue;
      }
      t.send({ type: 'fire', at: { row: Math.floor(i / 10), col: i % 10 } });
      clock.advance(100);
      seen.push(snap.view.turn);
    }
    const sunkMessages = chat.history('ROOM42').filter((m) => m.kind === 'system');
    expect(sunkMessages.length).toBeGreaterThan(0);
    expect(sunkMessages[0]).toMatchObject({ key: 'shipSunk' });
    t.dispose();
  });

  it('rakip kopması simülasyonu', () => {
    const clock = new FakeClock();
    const t = new MockOnlineTransport({
      seed: 'dc',
      me: ALICE,
      opponent: BOB,
      chat: new MockChatService(),
      channel: 'c',
      latencyMs: 0,
      clock,
    });
    t.send({ type: 'placeFleet', fleet: randomFleet(3) });
    clock.advance(0);
    t.simulateOpponentDisconnect();
    expect(t.getSnapshot().opponentConnection).toBe('disconnected');
    t.simulateOpponentReconnect();
    expect(t.getSnapshot().opponentConnection).toBe('connected');
    t.dispose();
  });

  it('örnek: gemi hücreleri tahtada (yardımcı)', () => {
    expect(shipCells(randomFleet(1)[0]!).length).toBeGreaterThan(1);
  });
});
