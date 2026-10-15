import { describe, expect, it } from 'vitest';

import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from './code';

describe('oda kodu', () => {
  it('üretilen kodlar geçerli ve karışan karakter içermez', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateRoomCode();
      expect(isValidRoomCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('deterministik rastgele kaynakla tekrarlanabilir', () => {
    expect(generateRoomCode(() => 0)).toBe('AAAAAA');
    expect(generateRoomCode(() => 0.999)).toBe('999999');
  });

  it('normalize: büyük harf, boşluk ve tire atılır', () => {
    expect(normalizeRoomCode(' abc-123 ')).toBe('ABC123');
    expect(normalizeRoomCode('ab c1 23')).toBe('ABC123');
  });

  it('yapıştırılan web ve uygulama linklerinden kod çıkarılır', () => {
    expect(normalizeRoomCode('https://amiralbatti.app/room/abc123')).toBe('ABC123');
    expect(normalizeRoomCode('amiralbatti://room/K7QM2X')).toBe('K7QM2X');
  });

  it('doğrulama', () => {
    expect(isValidRoomCode('ABC123')).toBe(true);
    expect(isValidRoomCode('ABC12')).toBe(false);
    expect(isValidRoomCode('ABC1234')).toBe(false);
    expect(isValidRoomCode('abc123')).toBe(false);
    expect(isValidRoomCode('ABC12!')).toBe(false);
  });
});
