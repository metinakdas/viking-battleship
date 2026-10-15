export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;
export const PASSWORD_MIN = 6;

export type NicknameProblem = 'too_short' | 'too_long' | 'invalid_chars';

/** Takma ad: 3–16 karakter; harf (Türkçe ve İskandinav dahil), rakam, boşluk, _ ve -. */
export function checkNickname(raw: string): NicknameProblem | null {
  const name = normalizeNickname(raw);
  if (name.length < NICKNAME_MIN) return 'too_short';
  if (name.length > NICKNAME_MAX) return 'too_long';
  if (!/^[\p{L}\p{N} _-]+$/u.test(name)) return 'invalid_chars';
  return null;
}

/** Baştaki/sondaki boşlukları atar, iç boşlukları teke indirir. */
export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidPassword(raw: string): boolean {
  return raw.length >= PASSWORD_MIN;
}
