import type { Player } from '@/services/auth';
import { newId } from '@/services/auth';

import {
  CHAT_MAX_LENGTH,
  CHAT_RATE_MAX,
  CHAT_RATE_WINDOW_MS,
  ChatError,
  type ChatMessage,
  type ChatService,
  type SystemMessageKey,
} from './types';

type Listener = (messages: readonly ChatMessage[]) => void;

const BOT_LINES = [
  'İyi atış!',
  'Bu sefer kaçmaz!',
  'Tebrikler, Kaptan',
  'Skål! 🍺',
  'Odin bizimle.',
  'Kuzgunlar seni izliyor…',
  'Dalgalar sert bugün.',
];

/** Bellekte sohbet. Gerçek sunucu geldiğinde kanal başına WebSocket olacak. */
export class MockChatService implements ChatService {
  private readonly channels = new Map<string, ChatMessage[]>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly sentAt = new Map<string, number[]>();
  private readonly muted = new Set<string>();
  private readonly autoReplies = new Map<string, Player>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  history(channel: string): readonly ChatMessage[] {
    return this.visible(channel);
  }

  sendMessage(channel: string, from: Player, raw: string): ChatMessage {
    const text = raw.trim();
    if (!text) throw new ChatError('empty');
    if ([...text].length > CHAT_MAX_LENGTH) throw new ChatError('too_long');

    const now = this.now();
    const recent = (this.sentAt.get(from.id) ?? []).filter((t) => now - t < CHAT_RATE_WINDOW_MS);
    if (recent.length >= CHAT_RATE_MAX) throw new ChatError('rate_limited');
    this.sentAt.set(from.id, [...recent, now]);

    const message: ChatMessage = {
      id: newId('msg'),
      kind: 'player',
      channel,
      from: {
        id: from.id,
        displayName: from.displayName,
        avatar: from.avatar,
        isGuest: from.isGuest,
      },
      text,
      at: now,
    };
    this.push(channel, message);
    this.maybeAutoReply(channel, from);
    return message;
  }

  /**
   * YALNIZCA MOCK: kanaldaki bot, insan mesajlarına bazen kısa bir cevap verir.
   * Gerçek sunucuda yerini karşı oyuncunun gerçek mesajları alır.
   */
  setAutoReply(channel: string, bot: Player): void {
    this.autoReplies.set(channel, bot);
  }

  private maybeAutoReply(channel: string, from: Player): void {
    const bot = this.autoReplies.get(channel);
    if (!bot || bot.id === from.id || Math.random() > 0.6) return;
    const line = BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)] ?? 'Skål!';
    setTimeout(
      () => {
        try {
          this.sendMessage(channel, bot, line);
        } catch {
          // Hız sınırına takılırsa sessizce vazgeç.
        }
      },
      1200 + Math.random() * 1500,
    );
  }

  postSystem(channel: string, key: SystemMessageKey, params?: Record<string, string>): void {
    this.push(channel, { id: newId('sys'), kind: 'system', channel, key, params, at: this.now() });
  }

  onMessage(channel: string, listener: Listener): () => void {
    const set = this.listeners.get(channel) ?? new Set();
    set.add(listener);
    this.listeners.set(channel, set);
    return () => set.delete(listener);
  }

  mute(playerId: string): void {
    this.muted.add(playerId);
    this.notifyAll();
  }

  unmute(playerId: string): void {
    this.muted.delete(playerId);
    this.notifyAll();
  }

  isMuted(playerId: string): boolean {
    return this.muted.has(playerId);
  }

  private visible(channel: string): ChatMessage[] {
    return (this.channels.get(channel) ?? []).filter(
      (m) => m.kind === 'system' || !this.muted.has(m.from.id),
    );
  }

  private push(channel: string, message: ChatMessage): void {
    this.channels.set(channel, [...(this.channels.get(channel) ?? []), message]);
    this.notify(channel);
  }

  private notify(channel: string): void {
    const messages = this.visible(channel);
    this.listeners.get(channel)?.forEach((l) => l(messages));
  }

  private notifyAll(): void {
    for (const channel of this.listeners.keys()) this.notify(channel);
  }
}
