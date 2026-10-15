import type { Player } from '@/services/auth';

export const CHAT_MAX_LENGTH = 200;
/** Hız sınırı: bir gönderen, RATE_WINDOW_MS içinde en fazla RATE_MAX mesaj. */
export const CHAT_RATE_MAX = 5;
export const CHAT_RATE_WINDOW_MS = 10_000;

export type ChatMessage =
  | {
      readonly id: string;
      readonly kind: 'player';
      readonly channel: string;
      readonly from: Pick<Player, 'id' | 'displayName' | 'avatar' | 'isGuest'>;
      readonly text: string;
      readonly at: number;
    }
  | {
      readonly id: string;
      readonly kind: 'system';
      readonly channel: string;
      /** i18n anahtarı + parametreler: dil değişse de doğru gösterilir. */
      readonly key: SystemMessageKey;
      readonly params?: Readonly<Record<string, string>>;
      readonly at: number;
    };

export type SystemMessageKey = 'joined' | 'left' | 'shipSunk' | 'gameStarted' | 'kicked';

export type ChatErrorCode = 'empty' | 'too_long' | 'rate_limited';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  constructor(code: ChatErrorCode) {
    super(code);
    this.name = 'ChatError';
    this.code = code;
  }
}

export interface ChatService {
  /** Kanal: oda kodu ya da oyun kimliği. Oda sohbeti oyun boyunca aynı kanalda sürer. */
  history(channel: string): readonly ChatMessage[];
  sendMessage(channel: string, from: Player, text: string): ChatMessage;
  postSystem(channel: string, key: SystemMessageKey, params?: Record<string, string>): void;
  onMessage(channel: string, listener: (messages: readonly ChatMessage[]) => void): () => void;
  /** Bu cihazdaki kullanıcı için: o oyuncunun mesajları gösterilmez. */
  mute(playerId: string): void;
  unmute(playerId: string): void;
  isMuted(playerId: string): boolean;
}

export const QUICK_PHRASES = ['niceShot', 'notThisTime', 'congrats'] as const;
export type QuickPhrase = (typeof QUICK_PHRASES)[number];
