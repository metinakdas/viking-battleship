export const ROOM_CODE_LENGTH = 6;

/** Üretimde karışan karakterler (0/O, 1/I) yok; okuması ve sesli söylemesi kolay. */
const GENERATE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Rastgele oda kodu, ör. "K7QM2X". */
export function generateRoomCode(random: () => number = Math.random): string {
  return Array.from(
    { length: ROOM_CODE_LENGTH },
    () => GENERATE_ALPHABET[Math.floor(random() * GENERATE_ALPHABET.length)],
  ).join('');
}

/**
 * Kullanıcı girdisini koda çevirir: büyük harf, boşluk/tire atılır.
 * Yapıştırılan link de kabul edilir: ".../room/abc123" ya da "amiralbatti://room/abc123".
 */
export function normalizeRoomCode(raw: string): string {
  const fromLink = /room\/([A-Za-z0-9]+)/.exec(raw);
  const source = fromLink?.[1] ?? raw;
  return source.toUpperCase().replace(/[\s-]/g, '');
}

/** Elle girilen kodlarda tüm harf/rakamlar kabul edilir (ör. örnekteki "ABC123"). */
export function isValidRoomCode(code: string): boolean {
  return new RegExp(`^[A-Z0-9]{${ROOM_CODE_LENGTH}}$`).test(code);
}
