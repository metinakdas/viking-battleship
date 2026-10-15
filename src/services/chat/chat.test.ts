import { describe, expect, it } from 'vitest';

import type { Player } from '@/services/auth';

import { MockChatService } from './MockChatService';
import { CHAT_MAX_LENGTH, CHAT_RATE_WINDOW_MS, ChatError, type ChatMessage } from './types';

const ME: Player = { id: 'me', displayName: 'Ulf', avatar: 'fehu:gold', isGuest: true };
const THEM: Player = { id: 'them', displayName: 'Ylva', avatar: 'raido:green', isGuest: false };

function setup() {
  let t = 0;
  const chat = new MockChatService(() => t);
  return { chat, tick: (ms: number) => (t += ms) };
}

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ChatError ? e.code : 'other';
  }
  return null;
};

describe('MockChatService', () => {
  it('mesaj gönderir, kanala yayınlar, kırpar', () => {
    const { chat } = setup();
    const seen: (readonly ChatMessage[])[] = [];
    chat.onMessage('R1', (m) => seen.push(m));
    chat.sendMessage('R1', ME, '  İyi atış!  ');
    expect(seen.at(-1)?.[0]).toMatchObject({
      kind: 'player',
      text: 'İyi atış!',
      from: { id: 'me' },
    });
    expect(chat.history('R2')).toEqual([]);
  });

  it('boş ve 200 karakteri aşan mesaj reddedilir (emoji tek karakter sayılır)', () => {
    const { chat } = setup();
    expect(code(() => chat.sendMessage('R', ME, '   '))).toBe('empty');
    expect(code(() => chat.sendMessage('R', ME, 'a'.repeat(CHAT_MAX_LENGTH + 1)))).toBe('too_long');
    expect(code(() => chat.sendMessage('R', ME, '⚓'.repeat(CHAT_MAX_LENGTH)))).toBeNull();
  });

  it('hız sınırı: 10 sn içinde 5 mesaj; süre geçince açılır', () => {
    const { chat, tick } = setup();
    for (let i = 0; i < 5; i++) chat.sendMessage('R', ME, `m${i}`);
    expect(code(() => chat.sendMessage('R', ME, 'fazla'))).toBe('rate_limited');
    // Sınır gönderen başına: rakip etkilenmez.
    expect(code(() => chat.sendMessage('R', THEM, 'selam'))).toBeNull();
    tick(CHAT_RATE_WINDOW_MS);
    expect(code(() => chat.sendMessage('R', ME, 'tekrar'))).toBeNull();
  });

  it('sessize alınan oyuncunun mesajları gizlenir; sistem mesajları görünür kalır', () => {
    const { chat } = setup();
    chat.sendMessage('R', THEM, 'hey');
    chat.postSystem('R', 'joined', { name: 'Ylva' });
    chat.mute('them');
    expect(chat.isMuted('them')).toBe(true);
    expect(chat.history('R').map((m) => m.kind)).toEqual(['system']);
    chat.unmute('them');
    expect(chat.history('R')).toHaveLength(2);
  });
});
