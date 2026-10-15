import type { AvatarId } from './types';

/** Avatar kalkanındaki runlar (ui/RuneText'teki adlarla aynı). */
export const AVATAR_RUNES = [
  'algiz',
  'tiwaz',
  'othala',
  'fehu',
  'raido',
  'sowilo',
  'ansuz',
  'dagaz',
] as const;

/** Kalkan renkleri: tema anahtarları değil, avatar paleti (features/auth/Avatar eşler). */
export const AVATAR_COLORS = ['red', 'gold', 'blue', 'green', 'iron', 'cream'] as const;

export type AvatarRune = (typeof AVATAR_RUNES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];

type RandomFn = () => number;

function pick<T>(items: readonly T[], random: RandomFn): T {
  return items[Math.floor(random() * items.length)] as T;
}

export function randomAvatar(random: RandomFn = Math.random): AvatarId {
  return `${pick(AVATAR_RUNES, random)}:${pick(AVATAR_COLORS, random)}`;
}

export function parseAvatar(id: string): { rune: AvatarRune; color: AvatarColor } {
  const [rune, color] = id.split(':');
  return {
    rune: (AVATAR_RUNES as readonly string[]).includes(rune ?? '') ? (rune as AvatarRune) : 'algiz',
    color: (AVATAR_COLORS as readonly string[]).includes(color ?? '')
      ? (color as AvatarColor)
      : 'red',
  };
}

const EPITHETS = ['Kızıl', 'Demir', 'Kurt', 'Fırtına', 'Buz', 'Kuzgun', 'Ejder', 'Gök', 'Tunç'];
const NAMES = [
  'Ragnar',
  'Freydís',
  'Björn',
  'Astrid',
  'Leif',
  'Sigrid',
  'Ivar',
  'Gunnhild',
  'Harald',
  'Ingrid',
  'Ulf',
  'Ylva',
];

/** Misafir için öneri takma ad, ör. "Demir Björn". Her zaman doğrulamadan geçer (≤16). */
export function randomNickname(random: RandomFn = Math.random): string {
  return `${pick(EPITHETS, random)} ${pick(NAMES, random)}`;
}

/** Benzersiz kimlik. Hermes/eski tarayıcılarda randomUUID yoksa yedek üretici. */
export function newId(prefix: string): string {
  const uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${uuid}`;
}
